import "server-only"
import { and, asc, eq, isNull } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { badRequest, forbidden } from "./errors"
import { requireBoard } from "./access"
import { isBoardRole, type BoardRole } from "./roles"

/**
 * Board membership.
 *
 * Every mutation goes through `requireBoardPermission`, not an inline "is
 * this person the owner" test. That is the whole reason `permissions.ts` is
 * a table rather than a pile of conditionals: the board, this screen, the
 * API and a webhook all ask it the same question, so they cannot give
 * different answers about the same person.
 *
 * Two rules are enforced here rather than left to the client:
 *
 *   1. The last owner cannot be demoted or removed. A board with no owner is
 *      a board nobody can delete, hand over, or un-lock.
 *   2. Nobody edits their own role. Not because it is dangerous, but because
 *      the person best placed to fix a mistake is the one who made it, and
 *      letting someone demote themselves out of a board is not a feature.
 */

export type BoardMember = {
  userId: string
  name: string
  email: string
  image: string | null
  role: BoardRole
  /**
   * True when this person has never been given a role on this board.
   *
   * They still appear: anyone in the workspace can be assigned a card, so
   * they are a candidate for a role. Treating "no row" as "viewer" is what
   * `board-access.ts` already does, and showing them the same way here means
   * the list and the permission check cannot disagree.
   */
  implicit: boolean
}

export async function listBoardMembers(boardId: string, tenantId: string): Promise<BoardMember[]> {
  const { ctx } = await requireBoard(boardId, "board.read")
  if (ctx.tenant.id !== tenantId) throw forbidden("Workspace mismatch.")
  const roles = await db
    .select({ userId: s.boardMemberRoles.userId, role: s.boardMemberRoles.role })
    .from(s.boardMemberRoles)
    .where(eq(s.boardMemberRoles.boardId, boardId))

  const byUser = new Map<string, BoardRole>()
  for (const r of roles) {
    if (isBoardRole(String(r.role))) byUser.set(r.userId, r.role as BoardRole)
  }

  const people = await db
    .select({ userId: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image })
    .from(s.tenantMemberships)
    .innerJoin(s.user, eq(s.user.id, s.tenantMemberships.userId))
    .where(and(eq(s.tenantMemberships.tenantId, tenantId), isNull(s.tenantMemberships.deletedAt)))
    .orderBy(asc(s.user.name))

  return people.map((p) => ({
    userId: p.userId,
    name: p.name,
    email: p.email,
    image: p.image,
    role: byUser.get(p.userId) ?? ("viewer" as BoardRole),
    implicit: !byUser.has(p.userId),
  }))
}

/** The userIds with the `owner` role on a board. */
async function ownerIds(boardId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: s.boardMemberRoles.userId, role: s.boardMemberRoles.role })
    .from(s.boardMemberRoles)
    .where(eq(s.boardMemberRoles.boardId, boardId))
  // `role` is a pg enum, so the value is already narrowed by Drizzle; the
  // comparison stays in JS because a members list is never large enough for
  // an extra round trip to be worth it.
  return rows.filter((r) => r.role === "owner").map((r) => r.userId)
}

export async function setMemberRole(boardId: string, userId: string, role: string, actorId: string) {
  const { ctx } = await requireBoard(boardId, "board.members")
  actorId = ctx.userId
  if (!isBoardRole(role)) throw badRequest(`"${role}" is not a board role.`)

  if (userId === actorId) {
    throw forbidden("You cannot change your own role.", "Ask another owner, or a workspace admin, to do it.")
  }

  const [member] = await db.select({ id: s.tenantMemberships.id }).from(s.tenantMemberships).where(and(eq(s.tenantMemberships.tenantId, ctx.tenant.id), eq(s.tenantMemberships.userId, userId), isNull(s.tenantMemberships.deletedAt))).limit(1)
  if (!member) throw badRequest("Choose an active member of this workspace.")
  const currentOwners = await ownerIds(boardId)
  if (currentOwners.includes(userId) && role !== "owner" && currentOwners.length <= 1) {
    throw badRequest("That would leave the board without an owner.", "Promote somebody else to owner first.")
  }

  await db
    .insert(s.boardMemberRoles)
    .values({ boardId, userId, role })
    .onConflictDoUpdate({
      target: [s.boardMemberRoles.boardId, s.boardMemberRoles.userId],
      set: { role },
    })
}

export async function removeMember(boardId: string, userId: string, actorId: string) {
  const { ctx } = await requireBoard(boardId, "board.members")
  actorId = ctx.userId

  if (userId === actorId) {
    throw forbidden("You cannot remove yourself from a board you own.")
  }

  const currentOwners = await ownerIds(boardId)
  if (currentOwners.includes(userId) && currentOwners.length <= 1) {
    throw badRequest("That would leave the board without an owner.", "Promote somebody else to owner first.")
  }

  await db
    .delete(s.boardMemberRoles)
    .where(and(eq(s.boardMemberRoles.boardId, boardId), eq(s.boardMemberRoles.userId, userId)))
}
