import { NextResponse } from "next/server"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { apiError, authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { cardKey, boardPrefix } from "@/lib/lanes/prefix"

export const dynamic = "force-dynamic"

/** GET /api/v1/boards/:id/cards — every card, with its stable key. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  const { id } = await params

  const access = await auth.accessFor(id)
  if (!access.permissions("card.read")) return forbidden("You cannot read cards on this board.")

  const [board] = await db
    .select({ name: schema.projects.name, settings: schema.projects.settings })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.tenantId, auth.tenantId)))
    .limit(1)
  if (!board) return apiError("No such board.", 404)

  const url = new URL(req.url)
  const listId = url.searchParams.get("list")
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100))

  const cards = await db
    .select({
      id: schema.projectCards.id,
      listId: schema.projectCards.listId,
      title: schema.projectCards.title,
      description: schema.projectCards.description,
      position: schema.projectCards.position,
      priority: schema.projectCards.priority,
      dueDate: schema.projectCards.dueDate,
      completedAt: schema.projectCards.completedAt,
      estimatedHours: schema.projectCards.estimatedHours,
      loggedHours: schema.projectCards.loggedHours,
      customFields: schema.projectCards.customFields,
    })
    .from(schema.projectCards)
    .where(
      and(
        eq(schema.projectCards.projectId, id),
        isNull(schema.projectCards.deletedAt),
        isNull(schema.projectCards.archivedAt),
        ...(listId ? [eq(schema.projectCards.listId, listId)] : []),
      ),
    )
    .orderBy(asc(schema.projectCards.position))
    .limit(limit)

  return NextResponse.json({
    cards: cards.map((c) => ({
      ...c,
      key: cardKey(board.settings, board.name, Number((c.customFields as { seq?: number } | null)?.seq ?? 0)),
    })),
    boardPrefix: boardPrefix(board.settings, board.name),
  })
}

/** POST /api/v1/boards/:id/cards — create a card. Needs card.create. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!auth.scope("write")) return forbidden("This token cannot write.")
  const { id } = await params

  const access = await auth.accessFor(id)
  if (!access.permissions("card.create")) return forbidden("You cannot add cards to this board.")

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title) return apiError("A card needs a title.", 400)

  const [list] = body.listId
    ? await db.select({ id: schema.projectLists.id }).from(schema.projectLists)
        .where(and(eq(schema.projectLists.id, body.listId), eq(schema.projectLists.projectId, id), isNull(schema.projectLists.deletedAt))).limit(1)
    : await db.select({ id: schema.projectLists.id }).from(schema.projectLists)
        .where(and(eq(schema.projectLists.projectId, id), isNull(schema.projectLists.deletedAt))).orderBy(asc(schema.projectLists.position)).limit(1)

  if (!list) return apiError("That board has no lists to put the card in.", 400)

  // The sequence is a stable per-board counter, never the list position, so a
  // key survives every drag.
  const [max] = await db
    .select({ n: sql<number>`coalesce(max((custom_fields->>'seq')::int), 0)`.mapWith(Number) })
    .from(schema.projectCards)
    .where(eq(schema.projectCards.projectId, id))
  const seq = (max?.n ?? 0) + 1

  const [card] = await db
    .insert(schema.projectCards)
    .values({
      projectId: id,
      listId: list.id,
      title: title.slice(0, 500),
      description: typeof body.description === "string" ? body.description : null,
      customFields: { ...(typeof body.customFields === "object" && body.customFields ? body.customFields : {}), seq },
    })
    .returning()

  return NextResponse.json({ card: { ...card, key: cardKey(null, "board", seq) } }, { status: 201 })
}
