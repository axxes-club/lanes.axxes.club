import "server-only"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, schema } from "@/lib/db"
import { ALL_PERMISSIONS, type BoardAccess } from "./board-access"
import { can, type Permission } from "./permissions"
import { isWorkspaceManager, type BoardRole } from "./roles"
import { resolveToken, touchToken, tokenAllows } from "./api-tokens"

/**
 * Authenticating an API request.
 *
 * A token stands in for a person, so it resolves to that person's *board*
 * role rather than to a set of grants of its own. A token can therefore do
 * exactly what its owner could do on that board, and not one thing more —
 * which is the property that makes it safe to hand to a script.
 */
export type ApiAuth = {
  userId: string
  tenantId: string
  tokenId: string
  workspaceRole: string
  /** Resolved per board by boardAccessFor, because a token may reach several. */
  accessFor: (boardId: string) => Promise<BoardAccess>
  scope: (s: string) => boolean
}

export async function authenticate(req: Request): Promise<ApiAuth | null> {
  const header = req.headers.get("authorization") ?? ""
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return null

  const token = await resolveToken(match[1].trim())
  if (!token) return null

  // A token is only valid for the workspace it was minted in.
  const [membership] = await db
    .select({ tenantId: schema.tenantMemberships.tenantId })
    .from(schema.tenantMemberships)
    .where(
      and(
        eq(schema.tenantMemberships.userId, token.userId),
        eq(schema.tenantMemberships.tenantId, token.tenantId),
      ),
    )
    .limit(1)
  if (!membership) return null

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  void touchToken(token.id, ip)

  const [workspace] = await db
    .select({ role: schema.tenantMemberships.role })
    .from(schema.tenantMemberships)
    .where(
      and(
        eq(schema.tenantMemberships.userId, token.userId),
        eq(schema.tenantMemberships.tenantId, token.tenantId),
      ),
    )
    .limit(1)

  return {
    userId: token.userId,
    tenantId: token.tenantId,
    tokenId: token.id,
    workspaceRole: workspace?.role ?? "viewer",
    accessFor: (boardId: string) => boardAccessFor(boardId, token.userId, workspace?.role ?? "viewer"),
    scope: (s) => tokenAllows(token, s),
  }
}

/**
 * The same answer boardAccess() gives a signed-in person, computed for a token
 * instead. Both read the board role and the workspace rank and run the same
 * matrix, so a script and a browser can never disagree about the same person.
 */
async function boardAccessFor(
  boardId: string,
  userId: string,
  workspaceRole: string,
): Promise<BoardAccess> {
  const [row] = await db
    .select({ role: schema.boardMemberRoles.role })
    .from(schema.boardMemberRoles)
    .where(
      and(
        eq(schema.boardMemberRoles.boardId, boardId),
        eq(schema.boardMemberRoles.userId, userId),
      ),
    )
    .limit(1)

  const role = (row?.role ?? "viewer") as BoardRole
  const elevated = isWorkspaceManager(workspaceRole)
  return { role, elevated, permissions: (p: Permission) => elevated || can(role, p) }
}

/** Standard failures, so every endpoint answers the same way. */
export function apiError(message: string, status: number, hint?: string) {
  return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status })
}

export const unauthorized = () =>
  apiError("Missing or invalid API token.", 401, "Send it as 'Authorization: Bearer <token>'.")

export function forbidden(message: string, hint?: string) {
  return apiError(message, 403, hint)
}
