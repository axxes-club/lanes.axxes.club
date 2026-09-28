import "server-only"
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { badRequest, notFound } from "./errors"
import { requireBoardPermission } from "./board-access"

/**
 * Sprints, and the backlog around them.
 *
 * The backlog is not a table. It is every card on the board that is not
 * committed to a sprint, which means committing a card is a single fact —
 * one row in card_sprints — and there is nothing to keep in sync. A card is
 * in exactly one place at a time, so it cannot appear in the sprint report
 * and the backlog at the same time, which is the bug that every
 * board-and-sprint implementation eventually grows.
 */
async function getSprint(sprintId: string) {
  const [row] = await db
    .select()
    .from(schema.sprints)
    .where(eq(schema.sprints.id, sprintId))
    .limit(1)
  if (!row) throw notFound("That sprint")
  return row
}

export async function listSprints(boardId: string) {
  return db
    .select()
    .from(schema.sprints)
    .where(eq(schema.sprints.boardId, boardId))
    .orderBy(asc(schema.sprints.position), desc(schema.sprints.createdAt))
}

export async function activeSprint(boardId: string) {
  const [row] = await db
    .select()
    .from(schema.sprints)
    .where(and(eq(schema.sprints.boardId, boardId), eq(schema.sprints.status, "active")))
    .limit(1)
  return row ?? null
}

export async function createSprint(
  boardId: string,
  input: { name: string; goal?: string; startsAt?: Date | null; endsAt?: Date | null },
) {
  await requireBoardPermission(boardId, "sprint.manage")
  const name = input.name.trim()
  if (!name) throw badRequest("A sprint needs a name.")

  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    throw badRequest("The sprint ends before it starts.", "Check the dates.")
  }

  const [max] = await db
    .select({ n: sql<number>`coalesce(max(${schema.sprints.position}), -1)`.mapWith(Number) })
    .from(schema.sprints)
    .where(eq(schema.sprints.boardId, boardId))

  const [row] = await db
    .insert(schema.sprints)
    .values({
      boardId,
      name,
      goal: input.goal?.trim() || null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      position: (max?.n ?? -1) + 1,
    })
    .returning()
  return row
}

/**
 * Start a sprint.
 *
 * A board has at most one active sprint. Starting a second would make "what
 * is in the sprint?" have two answers, so this ends the current one rather
 * than allowing the overlap.
 */
export async function startSprint(sprintId: string) {
  const sprint = await getSprint(sprintId)
  await requireBoardPermission(sprint.boardId, "sprint.manage")

  const current = await activeSprint(sprint.boardId)
  if (current && current.id !== sprintId) {
    await db
      .update(schema.sprints)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.sprints.id, current.id))
  }

  const [row] = await db
    .update(schema.sprints)
    .set({
      status: "active",
      startsAt: sprint.startsAt ?? new Date(),
      // Two weeks is the default timebox when nobody set an end date.
      endsAt: sprint.endsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(schema.sprints.id, sprintId))
    .returning()
  return row
}

export async function completeSprint(sprintId: string) {
  const sprint = await getSprint(sprintId)
  await requireBoardPermission(sprint.boardId, "sprint.complete")
  const [row] = await db
    .update(schema.sprints)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.sprints.id, sprintId))
    .returning()
  return row
}

/** Move a card in or out of the sprint. Out = back to the backlog. */
export async function setCardSprint(cardId: string, sprintId: string | null) {
  const [card] = await db
    .select({ id: schema.projectCards.id, projectId: schema.projectCards.projectId })
    .from(schema.projectCards)
    .where(eq(schema.projectCards.id, cardId))
    .limit(1)
  if (!card) throw notFound("That card")

  await requireBoardPermission(card.projectId, "sprint.commit")

  if (sprintId) {
    const [sprint] = await db
      .select({ id: schema.sprints.id, boardId: schema.sprints.boardId, status: schema.sprints.status })
      .from(schema.sprints)
      .where(eq(schema.sprints.id, sprintId))
      .limit(1)
    if (!sprint || sprint.boardId !== card.projectId) {
      throw badRequest("That sprint belongs to a different board.")
    }
    if (sprint.status === "completed" || sprint.status === "cancelled") {
      throw badRequest("That sprint is closed.", "Commit it to the next one instead.")
    }
    await db
      .insert(schema.cardSprints)
      .values({ cardId, sprintId })
      .onConflictDoUpdate({ target: schema.cardSprints.cardId, set: { sprintId, committedAt: new Date() } })
  } else {
    await db.delete(schema.cardSprints).where(eq(schema.cardSprints.cardId, cardId))
  }
}

/**
 * Cards that were still open when the sprint closed.
 *
 * Returned rather than moved: carrying a card over is a decision the team
 * makes in the retrospective, and doing it for them quietly is how a sprint
 * grows without anyone agreeing to it.
 */
export async function unfinishedFromSprint(sprintId: string) {
  const doneListIds = db
    .select({ id: schema.projectLists.id })
    .from(schema.projectLists)
    .where(and(eq(schema.projectLists.projectId, sql`(select board_id from sprints where id = ${sprintId})`), eq(schema.projectLists.isDoneList, true)))

  return db
    .select({ id: schema.projectCards.id, title: schema.projectCards.title })
    .from(schema.projectCards)
    .innerJoin(schema.cardSprints, eq(schema.cardSprints.cardId, schema.projectCards.id))
    .where(
      and(
        eq(schema.cardSprints.sprintId, sprintId),
        isNull(schema.projectCards.completedAt),
        isNull(schema.projectCards.archivedAt),
        isNull(schema.projectCards.deletedAt),
        sql`not exists (select 1 from project_lists l where l.id = ${schema.projectCards.listId} and coalesce(l.is_done_list, false))`,
      ),
    )
}
