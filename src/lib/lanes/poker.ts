import "server-only"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { badRequest, notFound } from "./errors"
import { requireBoardPermission } from "./board-access"

/**
 * Scrum poker.
 *
 * The one rule that makes estimation honest: nobody sees a vote until every
 * participant has cast theirs, or the facilitator reveals. Without it the
 * first hand raised anchors the room, and the whole session is theatre.
 */
export type DeckName = "fibonacci" | "modified_fibonacci" | "powers_of_two" | "t_shirt"

export const DECKS: Record<DeckName, string[]> = {
  // The half-step is left out on purpose in some teams because it produces
  // arguments; here the common decks are distinct enough to be worth having.
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?"],
  modified_fibonacci: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"],
  powers_of_two: ["0", "1", "2", "4", "8", "16", "32", "64", "?", "", "", ""],
  t_shirt: ["XS", "S", "M", "L", "XL", "XXL", "?", "", "", "", "", ""],
}

export function isDeck(name: string): name is DeckName {
  return Object.prototype.hasOwnProperty.call(DECKS, name)
}

export function deckFor(name: string): string[] {
  return isDeck(name) ? DECKS[name] : DECKS.fibonacci
}

/** Who is estimating: board members, plus everyone in the tenant as default. */
async function participants(boardId: string) {
  const rows = await db
    .selectDistinct({ id: schema.user.id })
    .from(schema.user)
    .innerJoin(schema.tenantMemberships, eq(schema.tenantMemberships.userId, schema.user.id))
    .innerJoin(schema.projects, eq(schema.projects.tenantId, schema.tenantMemberships.tenantId))
    .where(eq(schema.projects.id, boardId))
  return rows.map((r) => r.id)
}

export async function openRounds(boardId: string) {
  return db
    .select()
    .from(schema.pokerRounds)
    .where(and(eq(schema.pokerRounds.boardId, boardId), isNull(schema.pokerRounds.closedAt)))
    .orderBy(desc(schema.pokerRounds.createdAt))
}

export async function startRound(boardId: string, input: { cardId?: string | null; deck?: string }) {
  await requireBoardPermission(boardId, "poker.facilitate")
  const deck: DeckName = input.deck && isDeck(input.deck) ? input.deck : "fibonacci"

  const [row] = await db
    .insert(schema.pokerRounds)
    .values({ boardId, cardId: input.cardId ?? null, deck })
    .returning()
  return row
}

export async function castVote(roundId: string, userId: string, card: string) {
  const [round] = await db
    .select()
    .from(schema.pokerRounds)
    .where(eq(schema.pokerRounds.id, roundId))
    .limit(1)
  if (!round) throw notFound("That round")
  if (round.closedAt) throw badRequest("That round is closed.")

  const deck = deckFor(round.deck)
  if (!deck.includes(card)) {
    throw badRequest(`"${card}" is not on this deck.`, `Try one of: ${deck.filter(Boolean).join(", ")}`)
  }

  // The unique index on (round, user) is the real guard: re-voting updates
  // rather than stacking a second row.
  await db
    .insert(schema.pokerVotes)
    .values({ roundId, userId, card })
    .onConflictDoUpdate({
      target: [schema.pokerVotes.roundId, schema.pokerVotes.userId],
      set: { card, createdAt: new Date() },
    })
}

/**
 * Read a round.
 *
 * Votes are withheld until everyone has voted or the round is revealed, so
 * `votes` comes back empty and `myVote` is the only one the caller can see.
 * That is enforced here, not in the component, because the component is not
 * the only thing that will ever read a round.
 */
export async function readRound(roundId: string, userId: string) {
  const [round] = await db.select().from(schema.pokerRounds).where(eq(schema.pokerRounds.id, roundId)).limit(1)
  if (!round) throw notFound("That round")

  const voters = await db
    .select({ userId: schema.pokerVotes.userId, card: schema.pokerVotes.card })
    .from(schema.pokerVotes)
    .where(eq(schema.pokerVotes.roundId, roundId))

  const everyone = await participants(round.boardId)
  const remaining = everyone.filter((id) => !voters.some((v) => v.userId === id))
  const revealed = Boolean(round.revealAt) || remaining.length === 0

  return {
    round: {
      id: round.id,
      cardId: round.cardId,
      deck: round.deck,
      cards: deckFor(round.deck).filter(Boolean),
      consensus: round.consensus,
      closedAt: round.closedAt,
    },
    waitingOn: remaining.length,
    totalVoters: everyone.length,
    myVote: voters.find((v) => v.userId === userId)?.card ?? null,
    votes: revealed
      ? voters.map((v) => ({ card: v.card }))
      : [],
    revealed,
  }
}

export async function revealRound(roundId: string) {
  const [round] = await db.select().from(schema.pokerRounds).where(eq(schema.pokerRounds.id, roundId)).limit(1)
  if (!round) throw notFound("That round")
  await requireBoardPermission(round.boardId, "poker.facilitate")
  await db.update(schema.pokerRounds).set({ revealAt: new Date() }).where(eq(schema.pokerRounds.id, roundId))
}

/** Close a round with the agreed number, which becomes the card's estimate. */
export async function closeRound(roundId: string, consensus: number | null) {
  const [round] = await db.select().from(schema.pokerRounds).where(eq(schema.pokerRounds.id, roundId)).limit(1)
  if (!round) throw notFound("That round")
  await requireBoardPermission(round.boardId, "poker.facilitate")

  const [updated] = await db
    .update(schema.pokerRounds)
    .set({ consensus, closedAt: new Date(), revealAt: round.revealAt ?? new Date() })
    .where(eq(schema.pokerRounds.id, roundId))
    .returning()

  // The whole point of estimating is that the number lands on the card.
  if (round.cardId && consensus !== null) {
    await db
      .update(schema.projectCards)
      .set({ estimatedHours: consensus, updatedAt: new Date() })
      .where(eq(schema.projectCards.id, round.cardId))
  }
  return updated
}

/** How often each estimate came up. Feeds "the team always says 5". */
export async function roundHistory(boardId: string, limit = 20) {
  return db
    .select()
    .from(schema.pokerRounds)
    .where(and(eq(schema.pokerRounds.boardId, boardId), sql`${schema.pokerRounds.closedAt} is not null`))
    .orderBy(desc(schema.pokerRounds.createdAt))
    .limit(limit)
}
