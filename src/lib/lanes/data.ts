import "server-only"
import { requireBoard, requireCard } from "./access"
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import type { BoardT, CardDetailT, CardT, PersonT, Priority } from "./types"

const s = schema

export function keyPrefix(settings: unknown, name: string) {
  const fromSettings = (settings as { keyPrefix?: string } | null)?.keyPrefix
  if (fromSettings) return fromSettings
  // Words that are only digits (years, versions) don't make good keys
  const letters = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter((w) => w && !/^\d+$/.test(w))
  const prefix = letters.length > 1 ? letters.map((w) => w[0]).join("") : (letters[0] ?? "LN")
  return prefix.slice(0, 4).toUpperCase() || "LN"
}

export const cardSeq = (customFields: unknown) => Number((customFields as { seq?: number } | null)?.seq ?? 0)

export async function listBoards(tenantId: string) {
  const p = s.projects
  return db
    .select({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      updatedAt: p.updatedAt,
      open: sql<number>`(select count(*) from project_cards c join project_lists l on l.id = c.list_id where c.project_id = "projects"."id" and c.deleted_at is null and c.archived_at is null and not coalesce(l.is_done_list, false))`.mapWith(Number),
      done: sql<number>`(select count(*) from project_cards c join project_lists l on l.id = c.list_id where c.project_id = "projects"."id" and c.deleted_at is null and c.archived_at is null and coalesce(l.is_done_list, false))`.mapWith(Number),
    })
    .from(p)
    .where(and(eq(p.tenantId, tenantId), isNull(p.deletedAt), isNull(p.archivedAt)))
    .orderBy(desc(p.updatedAt))
}

// Everyone in the workspace can be assigned to cards
export async function workspacePeople(tenantId: string): Promise<PersonT[]> {
  return db
    .select({ id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image })
    .from(s.tenantMemberships)
    .innerJoin(s.user, eq(s.user.id, s.tenantMemberships.userId))
    .where(and(eq(s.tenantMemberships.tenantId, tenantId), isNull(s.tenantMemberships.deletedAt)))
    .orderBy(asc(s.user.name))
}

export async function getBoard(tenantId: string, boardId: string): Promise<BoardT | null> {
  const [project] = await db
    .select()
    .from(s.projects)
    .where(and(eq(s.projects.id, boardId), eq(s.projects.tenantId, tenantId), isNull(s.projects.deletedAt)))
    .catch(() => [])
  if (!project) return null
  await requireBoard(boardId, "board.read")

  const [lists, cards, labels, people] = await Promise.all([
    db.select().from(s.projectLists).where(and(eq(s.projectLists.projectId, boardId), isNull(s.projectLists.deletedAt))).orderBy(asc(s.projectLists.position)),
    db
      .select()
      .from(s.projectCards)
      .where(and(eq(s.projectCards.projectId, boardId), isNull(s.projectCards.deletedAt), isNull(s.projectCards.archivedAt)))
      .orderBy(asc(s.projectCards.position)),
    db.select().from(s.projectLabels).where(eq(s.projectLabels.projectId, boardId)).orderBy(asc(s.projectLabels.createdAt)),
    workspacePeople(tenantId),
  ])
  const cardIds = cards.map((c) => c.id)
  const [cardLabels, cardMembers, checklistCounts, commentCounts] = cardIds.length
    ? await Promise.all([
        db.select().from(s.projectCardLabels).where(inArray(s.projectCardLabels.cardId, cardIds)),
        db.select().from(s.projectCardMembers).where(inArray(s.projectCardMembers.cardId, cardIds)),
        db
          .select({
            cardId: s.projectChecklists.cardId,
            total: sql<number>`count(${s.projectChecklistItems.id})`.mapWith(Number),
            done: sql<number>`count(${s.projectChecklistItems.id}) filter (where ${s.projectChecklistItems.isCompleted})`.mapWith(Number),
          })
          .from(s.projectChecklists)
          .leftJoin(s.projectChecklistItems, eq(s.projectChecklistItems.checklistId, s.projectChecklists.id))
          .where(inArray(s.projectChecklists.cardId, cardIds))
          .groupBy(s.projectChecklists.cardId),
        db
          .select({ cardId: s.projectCardComments.cardId, n: sql<number>`count(*)`.mapWith(Number) })
          .from(s.projectCardComments)
          .where(and(inArray(s.projectCardComments.cardId, cardIds), isNull(s.projectCardComments.deletedAt)))
          .groupBy(s.projectCardComments.cardId),
      ])
    : [[], [], [], []]

  const prefix = keyPrefix(project.settings, project.name)
  const byCard = <T extends { cardId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>()
    for (const r of rows) m.set(r.cardId, [...(m.get(r.cardId) ?? []), r])
    return m
  }
  const labelMap = byCard(cardLabels)
  const memberMap = byCard(cardMembers)
  const checkMap = new Map(checklistCounts.map((c) => [c.cardId, c]))
  const commentMap = new Map(commentCounts.map((c) => [c.cardId, c.n]))

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    keyPrefix: prefix,
    lists: lists.map((l) => ({ id: l.id, name: l.name, position: l.position, wipLimit: l.wipLimit, isDoneList: !!l.isDoneList, color: l.color })),
    cards: cards.map((c) => toCard(c, prefix, labelMap.get(c.id), memberMap.get(c.id), checkMap.get(c.id), commentMap.get(c.id))),
    labels: labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    people,
  }
}

function toCard(
  c: typeof s.projectCards.$inferSelect,
  prefix: string,
  labels?: { labelId: string }[],
  members?: { userId: string }[],
  checks?: { total: number; done: number },
  comments?: number
): CardT {
  return {
    id: c.id,
    key: `${prefix}-${cardSeq(c.customFields) || "?"}`,
    listId: c.listId,
    title: c.title,
    description: c.description,
    position: c.position,
    priority: (c.priority ?? "medium") as Priority,
    dueDate: c.dueDate?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    coverColor: c.coverColor,
    labelIds: (labels ?? []).map((l) => l.labelId),
    memberIds: (members ?? []).map((m) => m.userId),
    checklistDone: checks?.done ?? 0,
    checklistTotal: checks?.total ?? 0,
    comments: comments ?? 0,
  }
}

export async function getCardDetail(tenantId: string, cardId: string, viewerId: string): Promise<CardDetailT | null> {
  const [row] = await db
    .select({ card: s.projectCards, project: s.projects })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(eq(s.projectCards.id, cardId), eq(s.projects.tenantId, tenantId), isNull(s.projectCards.deletedAt)))
    .catch(() => [])
  if (!row) return null
  await requireCard(cardId, "card.read")
  const { card, project } = row

  const [labels, members, checklists, comments, activity] = await Promise.all([
    db.select().from(s.projectCardLabels).where(eq(s.projectCardLabels.cardId, cardId)),
    db.select().from(s.projectCardMembers).where(eq(s.projectCardMembers.cardId, cardId)),
    db.select().from(s.projectChecklists).where(eq(s.projectChecklists.cardId, cardId)).orderBy(asc(s.projectChecklists.position), asc(s.projectChecklists.createdAt)),
    db
      .select({ c: s.projectCardComments, author: { id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image } })
      .from(s.projectCardComments)
      .leftJoin(s.user, eq(s.user.id, s.projectCardComments.userId))
      .where(and(eq(s.projectCardComments.cardId, cardId), isNull(s.projectCardComments.deletedAt)))
      .orderBy(asc(s.projectCardComments.createdAt)),
    db
      .select({ a: s.projectActivity, author: s.user.name })
      .from(s.projectActivity)
      .leftJoin(s.user, eq(s.user.id, s.projectActivity.userId))
      .where(eq(s.projectActivity.cardId, cardId))
      .orderBy(desc(s.projectActivity.createdAt))
      .limit(50),
  ])
  const items = checklists.length
    ? await db.select().from(s.projectChecklistItems).where(inArray(s.projectChecklistItems.checklistId, checklists.map((c) => c.id))).orderBy(asc(s.projectChecklistItems.position), asc(s.projectChecklistItems.createdAt))
    : []
  const total = items.length
  const done = items.filter((i) => i.isCompleted).length

  const { linksForCard } = await import("./link-data")

  return {
    ...toCard(card, keyPrefix(project.settings, project.name), labels, members, { total, done }, comments.length),
    links: await linksForCard(tenantId, cardId),
    checklists: checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      items: items.filter((i) => i.checklistId === cl.id).map((i) => ({ id: i.id, text: i.text, done: !!i.isCompleted })),
    })),
    commentsList: comments.map(({ c, author }) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: author?.id ? author : null,
      mine: c.userId === viewerId,
    })),
    activity: activity.map(({ a, author }) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.createdAt.toISOString(), author })),
  }
}
