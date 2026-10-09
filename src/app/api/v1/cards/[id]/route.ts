import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { body, fail, fromError, noContent, ok, withHeaders } from "@/lib/lanes/api-response"
import { rateLimit, retryAfterSeconds } from "@/lib/lanes/rate-limit"
import { cardKey } from "@/lib/lanes/prefix"

export const dynamic = "force-dynamic"

/**
 * /api/v1/cards/:id — one card, addressed by id or by key.
 *
 * Accepting the key matters more than it looks. A key like WEB-42 survives
 * export, import and a change of database; a UUID does not. Anything a human
 * is going to type into a script should be the thing that is meant to be
 * typed, and the key is the only identifier on a card that is meant to be
 * said out loud.
 */

type Resolved = { id: string; boardId: string; settings: unknown; boardName: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KEY = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/

/**
 * Find a card by UUID or by key.
 *
 * A key like WEB-42 survives export, import and a change of database; a UUID
 * does not. Anything a human is going to type into a script should be the
 * thing that is meant to be typed, so both work.
 *
 * Unpadded keys are accepted too. `AB-1` and `AB-01` are the same card, and
 * a 404 that says nothing about the padding is a bad first experience of an
 * API whose whole selling point is keys you can say out loud. `prefix.ts`
 * allows a padding of 1 to 6, so both padded and unpadded forms are tried
 * before giving up.
 */
async function resolve(cardId: string, tenantId: string): Promise<Resolved | null> {
  if (UUID.test(cardId)) return byId(cardId, tenantId)

  const match = KEY.exec(cardId)
  if (!match) return null
  const [, prefix, digits] = match
  const n = Number(digits)

  // Widest first, so an exact hit on the board's own padding wins over a
  // wider one when both would match.
  for (const width of paddingWidths(digits)) {
    const padded = `${prefix.toUpperCase()}-${String(n).padStart(width, "0")}`
    // Awaited, and the null check is explicit: returning the promise instead
    // would short-circuit the loop on the first miss, because a pending
    // promise is always truthy.
    const hit = await byKey(padded, tenantId)
    if (hit) return hit
  }
  return null
}

/** The widths worth trying, in order, never wider than `prefix.ts` allows. */
function paddingWidths(digits: string): number[] {
  const widths = new Set<number>([digits.length])
  for (let w = 1; w <= 6; w++) widths.add(w)
  return [...widths].sort((a, b) => Math.abs(a - digits.length) - Math.abs(b - digits.length))
}

async function byId(id: string, tenantId: string): Promise<Resolved | null> {
  const [row] = await db
    .select({
      id: schema.projectCards.id,
      boardId: schema.projectCards.projectId,
      settings: schema.projects.settings,
      boardName: schema.projects.name,
    })
    .from(schema.projectCards)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.projectCards.projectId))
    .where(and(eq(schema.projects.tenantId, tenantId), eq(schema.projectCards.id, id), isNull(schema.projectCards.deletedAt)))
    .limit(1)
  return row ? { id: row.id, boardId: row.boardId, settings: row.settings, boardName: row.boardName } : null
}

async function byKey(key: string, tenantId: string): Promise<Resolved | null> {
  const [row] = await db
    .select({
      id: schema.projectCards.id,
      boardId: schema.projectCards.projectId,
      settings: schema.projects.settings,
      boardName: schema.projects.name,
    })
    .from(schema.projectCards)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.projectCards.projectId))
    .where(
      and(
        eq(schema.projects.tenantId, tenantId),
        isNull(schema.projectCards.deletedAt),
        eq(keyExpression(), key),
      ),
    )
    // Oldest first. A key is only unique while a board's sequence is intact,
    // and this makes the lookup deterministic even when it is not: repeated
    // calls return the same card rather than an arbitrary one, which is the
    // difference between a wrong answer and an unpredictable one.
    .orderBy(asc(schema.projectCards.createdAt), asc(schema.projectCards.id))
    .limit(1)
  return row ? { id: row.id, boardId: row.boardId, settings: row.settings, boardName: row.boardName } : null
}

/**
 * A card's key, computed in SQL.
 *
 * `prefix.ts` owns the formatting rules; this is the same rules expressed as
 * a fragment so a lookup by key stays a single indexed-ish row fetch instead
 * of pulling every card in the workspace into memory to compare strings. A
 * JS filter over `listBoards`-sized data is exactly the mistake the key
 * feature exists to avoid.
 *
 * The prefix, the padding and the sequence are all read from the row, so a
 * key typed into a script matches the key shown in the UI.
 */
function keyExpression() {
  const project = schema.projects
  // The prefix is upper-cased and stripped of non-alphanumerics here for the
  // same reason `prefix.ts` does it in JS. If the two disagree, a key written
  // by one is invisible to the other — which is exactly what happened with a
  // stored prefix of "API " before this was fixed.
  return sql<string>`regexp_replace(upper(coalesce(${project.settings}->>'keyPrefix', 'LN')), '[^A-Z0-9]', '', 'g') || '-' || lpad(
    coalesce((${schema.projectCards.customFields}->>'seq')::int, 0)::text,
    greatest(coalesce((${project.settings}->>'keyPadding')::int, 2), 1),
    '0'
  )`
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req)
    if (!auth) return unauthorized(req)
    if (!auth.scope("read")) return forbidden("This token cannot read.", undefined, req)

    const limit = await rateLimit(`${auth.tokenId}:read`, "read")
    if (!limit.ok) {
      return withHeaders(
        fail(req, "Rate limit exceeded.", limit.unavailable ? 503 : 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
        limit,
      )
    }

    const { id } = await params
    const card = await resolve(id, auth.tenantId)
    if (!card) return fail(req, "No such card.", 404, "not_found", "Cards are addressable by UUID or by key, e.g. WEB-42.")

    const access = await auth.accessFor(card.boardId)
    if (!access.permissions("card.read")) return forbidden("You cannot read cards on this board.", undefined, req)

    const [row] = await db
      .select({ card: schema.projectCards, list: schema.projectLists })
      .from(schema.projectCards)
      .innerJoin(schema.projectLists, eq(schema.projectLists.id, schema.projectCards.listId))
      .where(eq(schema.projectCards.id, card.id))
      .limit(1)
    if (!row) return fail(req, "No such card.", 404, "not_found")

    return withHeaders(ok({ card: shape(row.card, row.list.name, card.settings, card.boardName) }), limit)
  } catch (e) {
    return fromError(req, e)
  }
}

/** PATCH — a partial update. Only the keys present in the body are touched. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req)
    if (!auth) return unauthorized(req)
    if (!auth.scope("write")) return forbidden("This token cannot write.", "Issue a token with the write scope.", req)

    const limit = await rateLimit(`${auth.tokenId}:write`, "write")
    if (!limit.ok) {
      return withHeaders(
        fail(req, "Rate limit exceeded.", limit.unavailable ? 503 : 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
        limit,
      )
    }

    const { id } = await params
    const card = await resolve(id, auth.tenantId)
    if (!card) return fail(req, "No such card.", 404, "not_found")

    const access = await auth.accessFor(card.boardId)
    if (!access.permissions("card.update")) return forbidden("You cannot change cards on this board.", undefined, req)

    const payload = await body<{
      title?: string
      description?: string | null
      priority?: "low" | "medium" | "high" | "urgent"
      dueDate?: string | null
      listId?: string
      estimatedHours?: number | null
    }>(req)
    if (!payload) return fail(req, "The body must be valid JSON.", 400, "bad_request")

    const changes: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof payload.title === "string") changes.title = payload.title.trim().slice(0, 300)
    if (payload.description !== undefined) changes.description = payload.description?.slice(0, 20000) || null
    if (payload.priority) changes.priority = payload.priority
    if (payload.dueDate !== undefined) changes.dueDate = payload.dueDate ? new Date(payload.dueDate) : null
    if (payload.estimatedHours !== undefined) changes.estimatedHours = payload.estimatedHours
    if (typeof payload.title === "string" && !payload.title.trim()) {
      return fail(req, "A card needs a title.", 400, "bad_request")
    }

    if (payload.listId) {
      // A move is a separate permission from an edit, and the lane it lands
      // in decides whether the card is complete. Both are re-derived here
      // rather than trusted from the request.
      if (!access.permissions("card.move")) return forbidden("You cannot move cards on this board.", undefined, req)
      const [target] = await db
        .select({ id: schema.projectLists.id, isDoneList: schema.projectLists.isDoneList })
        .from(schema.projectLists)
        .where(
          and(
            eq(schema.projectLists.id, payload.listId),
            eq(schema.projectLists.projectId, card.boardId),
            isNull(schema.projectLists.deletedAt),
          ),
        )
        .limit(1)
      if (!target) return fail(req, "That lane is not on this board.", 400, "bad_request")
      changes.listId = target.id
      changes.completedAt = target.isDoneList ? new Date() : null
      changes.completedById = target.isDoneList ? auth.userId : null
    }

    const [updated] = await db.update(schema.projectCards).set(changes).where(eq(schema.projectCards.id, card.id)).returning()
    const [list] = await db
      .select({ name: schema.projectLists.name })
      .from(schema.projectLists)
      .where(eq(schema.projectLists.id, updated.listId))

    await db.insert(schema.projectActivity).values({
      projectId: card.boardId,
      tenantId: auth.tenantId,
      cardId: card.id,
      type: payload.listId ? "card.moved" : "card.updated",
      description: payload.listId ? `moved to ${list?.name} over the API` : "updated over the API",
      userId: auth.userId,
    })

    return withHeaders(ok({ card: shape(updated, list?.name ?? "", card.settings, card.boardName) }), limit)
  } catch (e) {
    return fromError(req, e)
  }
}

/**
 * DELETE — soft.
 *
 * The row stays, `deleted_at` is set. A tool that can quietly erase a
 * backlog is one people stop trusting with a backlog, and the row is still
 * there to audit.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req)
    if (!auth) return unauthorized(req)
    if (!auth.scope("write")) return forbidden("This token cannot write.", "Issue a token with the write scope.", req)

    const limit = await rateLimit(`${auth.tokenId}:write`, "write")
    if (!limit.ok) {
      return withHeaders(
        fail(req, "Rate limit exceeded.", limit.unavailable ? 503 : 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
        limit,
      )
    }

    const { id } = await params
    const card = await resolve(id, auth.tenantId)
    if (!card) return fail(req, "No such card.", 404, "not_found")

    const access = await auth.accessFor(card.boardId)
    if (!access.permissions("card.delete")) return forbidden("You cannot delete cards on this board.", undefined, req)

    await db.update(schema.projectCards).set({ deletedAt: new Date() }).where(eq(schema.projectCards.id, card.id))
    await db.insert(schema.projectActivity).values({
      projectId: card.boardId,
      tenantId: auth.tenantId,
      cardId: card.id,
      type: "card.deleted",
      description: "deleted over the API",
      userId: auth.userId,
    })

    return withHeaders(noContent(), limit)
  } catch (e) {
    return fromError(req, e)
  }
}

function shape(
  c: typeof schema.projectCards.$inferSelect,
  listName: string,
  settings: unknown,
  boardName: string,
) {
  return {
    id: c.id,
    key: cardKey(settings, boardName, Number((c.customFields as { seq?: number } | null)?.seq ?? 0)),
    board: boardName,
    list: { id: c.listId, name: listName },
    title: c.title,
    description: c.description,
    priority: c.priority,
    position: c.position,
    dueDate: c.dueDate,
    completedAt: c.completedAt,
    estimatedHours: c.estimatedHours,
    loggedHours: c.loggedHours,
    customFields: c.customFields,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}
