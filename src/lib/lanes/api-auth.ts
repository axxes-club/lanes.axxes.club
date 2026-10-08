import "server-only"
import { and, eq, isNull, ne } from "drizzle-orm"
import { NextResponse } from "next/server"
import { fail } from "./api-response"
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

  // Revocation via seat/tenant lifecycle is mandatory even when platform policy is off.
  const [workspace]=await db.select({role:schema.tenantMemberships.role})
    .from(schema.tenantMemberships)
    .innerJoin(schema.tenants,eq(schema.tenants.id,schema.tenantMemberships.tenantId))
    .where(and(eq(schema.tenantMemberships.userId,token.userId),eq(schema.tenantMemberships.tenantId,token.tenantId),
      isNull(schema.tenantMemberships.deletedAt),isNull(schema.tenants.deletedAt),
      eq(schema.tenants.status,"active")))
    .limit(1);
  if(!workspace)return null;
  // Forwarded headers are not trustworthy audit identity; retain no spoofable IP.
  void touchToken(token.id);

  return {
    userId: token.userId,
    tenantId: token.tenantId,
    tokenId: token.id,
    workspaceRole: workspace?.role ?? "viewer",
    accessFor: (boardId: string) => boardAccessFor(boardId, token.userId, token.tenantId, workspace?.role ?? "viewer"),
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
  tenantId: string,
  workspaceRole: string,
): Promise<BoardAccess> {
  const [project]=await db.select({id:schema.projects.id}).from(schema.projects)
    .where(and(eq(schema.projects.id,boardId),eq(schema.projects.tenantId,tenantId),isNull(schema.projects.deletedAt))).limit(1);
  if(!project)return {role:"viewer",elevated:false,permissions:()=>false};
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

/**
 * Standard failures, so every endpoint answers the same way.
 *
 * These take a bare `Request` because the envelope includes a request id,
 * which is what a consumer quotes in a bug report. Endpoints that already
 * have the request should call `fail()` directly.
 */
export function apiError(message: string, status: number, hint?: string) {
  return fail(new Request("https://api.invalid"), message, status, status === 403 ? "forbidden" : "bad_request", hint)
}

export const unauthorized = (req?: Request) =>
  (req ? fail(req, "Missing or invalid API token.", 401, "unauthorized", "Send it as 'Authorization: Bearer <token>'.") : apiError("Missing or invalid API token.", 401, "Send it as 'Authorization: Bearer <token>'."))

export const forbidden = (message: string, hint?: string, req?: Request) =>
  req ? fail(req, message, 403, "forbidden", hint) : apiError(message, 403, hint)
