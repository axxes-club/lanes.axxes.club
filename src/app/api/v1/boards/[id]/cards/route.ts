import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { body, created, fail, fromError, ok, withHeaders } from "@/lib/lanes/api-response"
import { rateLimit, retryAfterSeconds } from "@/lib/lanes/rate-limit"
import { cardKey, boardPrefix } from "@/lib/lanes/prefix"

export const dynamic = "force-dynamic"

/**
 * /api/v1/boards/:id/cards — the cards on a board.
 *
 * Same envelope and same rate limiting as every other route. This one was
 * written before the envelope existed and answered with a bare object, which
 * means a consumer had to branch on which endpoint it was calling. A public
 * API where the error shape depends on the route is not a public API.
 */

type Board = { id: string; name: string; settings: unknown }

async function loadBoard(boardId: string, tenantId: string): Promise<Board | null> {
  const [board] = await db
    .select({ id: schema.projects.id, name: schema.projects.name, settings: schema.projects.settings })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, boardId), eq(schema.projects.tenantId, tenantId), isNull(schema.projects.deletedAt)))
    .limit(1)
  return board ?? null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req)
    if (!auth) return unauthorized(req)
    if (!auth.scope("read")) return forbidden("This token cannot read.", "Issue a token with the read scope.", req)

    const limit = await rateLimit(`${auth.tokenId}:read`, "read")
    if (!limit.ok) {
      return withHeaders(
        fail(req, "Rate limit exceeded.", 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
        limit,
      )
    }

    const { id } = await params
    const board = await loadBoard(id, auth.tenantId)
    if (!board) return fail(req, "No such board.", 404, "not_found")

    const access = await auth.accessFor(id)
    if (!access.permissions("card.read")) {
      return forbidden("You cannot read cards on this board.", "Ask an owner for a role on it.", req)
    }

    const url = new URL(req.url)
    const listId = url.searchParams.get("list")
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100))

    const cards = await db
      .select({
        id: schema.projectCards.id,
        listId: schema.projectCards.listId,
        listName: schema.projectLists.name,
        title: schema.projectCards.title,
        description: schema.projectCards.description,
        position: schema.projectCards.position,
        priority: schema.projectCards.priority,
        dueDate: schema.projectCards.dueDate,
        completedAt: schema.projectCards.completedAt,
        estimatedHours: schema.projectCards.estimatedHours,
        loggedHours: schema.projectCards.loggedHours,
        customFields: schema.projectCards.customFields,
        updatedAt: schema.projectCards.updatedAt,
      })
      .from(schema.projectCards)
      .innerJoin(schema.projectLists, eq(schema.projectLists.id, schema.projectCards.listId))
      .where(
        and(
          eq(schema.projectCards.projectId, id),
          isNull(schema.projectCards.deletedAt),
          isNull(schema.projectCards.archivedAt),
          listId ? eq(schema.projectCards.listId, listId) : undefined,
        ),
      )
      .orderBy(asc(schema.projectCards.position))
      .limit(take)

    return withHeaders(
      ok({
        board: { id: board.id, name: board.name, keyPrefix: boardPrefix(board.settings, board.name) },
        cards: cards.map((c) => ({
          id: c.id,
          // The real key, from the real settings. The previous version passed
          // `null` and a literal "board" into cardKey, so every key came back
          // derived from the word "board" rather than the board's own prefix.
          key: cardKey(board.settings, board.name, Number((c.customFields as { seq?: number } | null)?.seq ?? 0)),
          list: { id: c.listId, name: c.listName },
          title: c.title,
          description: c.description,
          priority: c.priority,
          position: c.position,
          dueDate: c.dueDate,
          completedAt: c.completedAt,
          estimatedHours: c.estimatedHours,
          loggedHours: c.loggedHours,
          updatedAt: c.updatedAt,
        })),
      }),
      limit,
    )
  } catch (e) {
    return fromError(req, e)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req)
    if (!auth) return unauthorized(req)
    if (!auth.scope("write")) return forbidden("This token cannot write.", "Issue a token with the write scope.", req)

    const limit = await rateLimit(`${auth.tokenId}:write`, "write")
    if (!limit.ok) {
      return withHeaders(
        fail(req, "Rate limit exceeded.", 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
        limit,
      )
    }

    const { id } = await params
    const board = await loadBoard(id, auth.tenantId)
    if (!board) return fail(req, "No such board.", 404, "not_found")

    const access = await auth.accessFor(id)
    if (!access.permissions("card.create")) {
      return forbidden("You cannot add cards to this board.", "Ask an owner for the card create permission.", req)
    }

    const payload = await body<{
      title?: string
      description?: string
      listId?: string
      priority?: "low" | "medium" | "high" | "urgent"
      dueDate?: string
    }>(req)
    if (!payload) return fail(req, "The body must be valid JSON.", 400, "bad_request")

    const title = typeof payload.title === "string" ? payload.title.trim() : ""
    if (!title) return fail(req, "A card needs a title.", 400, "bad_request", `Send { "title": "Ship the thing" }.`)

    const list = await pickList(id, payload.listId)
    if (!list) {
      return fail(req, "That board has no lanes to put the card in.", 400, "bad_request", "Add a lane, or pass an explicit listId.")
    }

    // The sequence is a stable per-board counter, never the list position, so
    // a key survives every drag.
    const [{ seq }] = await db
      .select({ seq: sql<number>`coalesce(max((${schema.projectCards.customFields}->>'seq')::int), 0)`.mapWith(Number) })
      .from(schema.projectCards)
      .where(eq(schema.projectCards.projectId, id))
    const [{ pos }] = await db
      .select({ pos: sql<number>`coalesce(max(${schema.projectCards.position}), -1)`.mapWith(Number) })
      .from(schema.projectCards)
      .where(and(eq(schema.projectCards.listId, list.id), isNull(schema.projectCards.deletedAt)))

    const [card] = await db
      .insert(schema.projectCards)
      .values({
        projectId: id,
        listId: list.id,
        title: title.slice(0, 300),
        description: typeof payload.description === "string" ? payload.description.slice(0, 20000) : null,
        priority: payload.priority ?? "medium",
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        position: pos + 1,
        createdById: auth.userId,
        completedAt: list.isDoneList ? new Date() : null,
        completedById: list.isDoneList ? auth.userId : null,
        customFields: { seq: seq + 1 },
      })
      .returning()

    await db.insert(schema.projectActivity).values({
      projectId: id,
      tenantId: auth.tenantId,
      cardId: card.id,
      listId: list.id,
      type: "card.created",
      description: `created ${cardKey(board.settings, board.name, seq + 1)} in ${list.name} over the API`,
      userId: auth.userId,
    })

    return withHeaders(
      created({
        card: {
          id: card.id,
          key: cardKey(board.settings, board.name, seq + 1),
          list: { id: list.id, name: list.name },
          title: card.title,
          description: card.description,
          priority: card.priority,
          position: card.position,
          dueDate: card.dueDate,
          createdAt: card.createdAt,
        },
      }),
      limit,
    )
  } catch (e) {
    return fromError(req, e)
  }
}

/** The requested lane, or the first one on the board. */
async function pickList(boardId: string, listId?: string) {
  const base = and(
    eq(schema.projectLists.projectId, boardId),
    isNull(schema.projectLists.deletedAt),
  )
  const [row] = listId
    ? await db
        .select({ id: schema.projectLists.id, name: schema.projectLists.name, isDoneList: schema.projectLists.isDoneList })
        .from(schema.projectLists)
        .where(and(base, eq(schema.projectLists.id, listId)))
        .limit(1)
    : await db
        .select({ id: schema.projectLists.id, name: schema.projectLists.name, isDoneList: schema.projectLists.isDoneList })
        .from(schema.projectLists)
        .where(base)
        .orderBy(asc(schema.projectLists.position))
        .limit(1)
  return row ?? null
}
