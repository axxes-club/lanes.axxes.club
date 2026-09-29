import { NextResponse } from "next/server"
import { and, asc, eq, isNull } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { apiError, authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { boardPrefix, cardKey } from "@/lib/lanes/prefix"

export const dynamic = "force-dynamic"

/** GET /api/v1/boards/:id — one board, its lists and card counts. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized(req)
  const { id } = await params

  const access = await auth.accessFor(id)
  if (!access.permissions("board.read")) {
    return forbidden("You cannot read this board.", "Ask an owner for a role on it.")
  }

  const [board] = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      description: schema.projects.description,
      keyPrefix: schema.projects.settings,
      updatedAt: schema.projects.updatedAt,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, id),
        eq(schema.projects.tenantId, auth.tenantId),
        isNull(schema.projects.deletedAt),
      ),
    )
    .limit(1)

  if (!board) return apiError("No such board.", 404)

  const lists = await db
    .select({
      id: schema.projectLists.id,
      name: schema.projectLists.name,
      position: schema.projectLists.position,
      wipLimit: schema.projectLists.wipLimit,
      isDoneList: schema.projectLists.isDoneList,
      count: db.$count(schema.projectCards),
    })
    .from(schema.projectLists)
    .leftJoin(schema.projectCards, and(eq(schema.projectCards.listId, schema.projectLists.id), isNull(schema.projectCards.deletedAt)))
    .where(and(eq(schema.projectLists.projectId, id), isNull(schema.projectLists.deletedAt)))
    .groupBy(schema.projectLists.id)
    .orderBy(asc(schema.projectLists.position))

  return NextResponse.json({
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
      prefix: boardPrefix(board.keyPrefix, board.name),
      updatedAt: board.updatedAt,
    },
    lists,
    yourRole: access.role,
  })
}
