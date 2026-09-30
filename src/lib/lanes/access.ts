import "server-only"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { boardAccess } from "./board-access"
import { forbidden, notFound } from "./errors"
import type { Permission } from "./permissions"

export async function requireBoard(boardId: string, permission: Permission) {
  const ctx = await requireContext()
  const [project] = await db.select().from(s.projects).where(and(
    eq(s.projects.id, boardId), eq(s.projects.tenantId, ctx.tenant.id), isNull(s.projects.deletedAt),
  )).limit(1)
  if (!project) throw notFound("Board")
  const access = await boardAccess(project.id)
  if (!access.permissions(permission)) throw forbidden(`You need the ${permission.replace('.', ' ')} permission on this board.`)
  return { ctx, project, access }
}

export async function requireCard(cardId: string, permission: Permission) {
  const ctx = await requireContext()
  const [row] = await db.select({ card: s.projectCards, project: s.projects }).from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(eq(s.projectCards.id, cardId), eq(s.projects.tenantId, ctx.tenant.id),
      isNull(s.projects.deletedAt), isNull(s.projectCards.deletedAt))).limit(1)
  if (!row) throw notFound("Card")
  const access = await boardAccess(row.project.id)
  if (!access.permissions(permission)) throw forbidden(`You need the ${permission.replace('.', ' ')} permission on this board.`)
  return { ctx, ...row, access }
}
