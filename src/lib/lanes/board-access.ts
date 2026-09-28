import "server-only"
import { cache } from "react"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { getContext } from "@/lib/context"
import { can, type Permission } from "./permissions"
import { isWorkspaceManager, type BoardRole } from "./roles"

/**
 * The one place that answers "may this person do X on this board".
 *
 * Two facts combine. The workspace role (owner/admin/manager/member/viewer)
 * comes from AXXES and says what you may do to the whole workspace. The board
 * role is per board and says what you may do to *this* delivery. The more
 * capable of the two wins — a workspace owner is never locked out of a board
 * their organization owns — but a board role can only ever narrow what a
 * plain workspace member can do.
 */
export type BoardAccess = {
  role: BoardRole
  /** True when a workspace manager is acting above their board role. */
  elevated: boolean
  permissions: (p: Permission) => boolean
}

const EVERYTHING: readonly Permission[] = [
  "board.read", "board.update", "board.delete", "board.settings", "board.members",
  "sprint.read", "sprint.manage", "sprint.commit", "sprint.complete",
  "poker.read", "poker.facilitate",
  "backlog.read", "backlog.write", "backlog.groom",
  "card.read", "card.create", "card.update", "card.move", "card.delete", "card.assign", "card.priority", "card.estimate", "card.comment", "card.link", "card.verify",
  "customField.manage", "integration.manage", "webhook.manage", "token.manage", "audit.read",
  "export.read",
]

/**
 * Resolve access. Cached per request: a board page asks this dozens of times
 * (every card, every button) and it is the same answer every time.
 */
export const boardAccess = cache(async (boardId: string): Promise<BoardAccess> => {
  const ctx = await getContext()
  if (!ctx) {
    return { role: "viewer", elevated: false, permissions: () => false }
  }

  const [row] = await db
    .select({ role: schema.boardMemberRoles.role })
    .from(schema.boardMemberRoles)
    .where(
      and(
        eq(schema.boardMemberRoles.boardId, boardId),
        eq(schema.boardMemberRoles.userId, ctx.userId),
      ),
    )
    .limit(1)

  const role = (row?.role ?? "viewer") as BoardRole
  const elevated = isWorkspaceManager(ctx.role)

  return {
    role,
    elevated,
    permissions: (p) => elevated || can(role, p),
  }
})

/** Throws unless the person may. Server actions use this, not a boolean. */
export async function requireBoardPermission(boardId: string, permission: Permission) {
  const access = await boardAccess(boardId)
  if (!access.permissions(permission)) {
    const { forbidden } = await import("@/lib/lanes/errors")
    throw forbidden(
      `You need the ${permission.replace(".", " ")} permission on this board. You are ${
        access.elevated ? "a workspace manager" : `a ${access.role.replace("_", " ")}`
      } here.`,
    )
  }
  return access
}

export const ALL_PERMISSIONS = EVERYTHING
