/**
 * Board roles, kept apart from the permission table so both the server and
 * the browser can read them without dragging the database in.
 */
export const BOARD_ROLES = [
  "owner",
  "product_owner",
  "scrum_master",
  "developer",
  "designer",
  "qa",
  "stakeholder",
  "viewer",
] as const

export type BoardRole = (typeof BOARD_ROLES)[number]

export const BOARD_ROLE_LABEL: Record<BoardRole, string> = {
  owner: "Board owner",
  product_owner: "Product owner",
  scrum_master: "Scrum master",
  developer: "Engineer",
  designer: "Designer",
  qa: "QA",
  stakeholder: "Stakeholder",
  viewer: "Viewer",
}

export function isBoardRole(value: string): value is BoardRole {
  return (BOARD_ROLES as readonly string[]).includes(value)
}

/**
 * The AXXES workspace role, ranked. Anyone at owner or admin level may act on
 * every board in the workspace, so an organization is never locked out of a
 * board it owns.
 */
const WORKSPACE_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
  viewer: 0,
}

export function workspaceRoleRank(role: string | null | undefined): number {
  return WORKSPACE_RANK[role ?? ""] ?? 0
}

export function isWorkspaceManager(role: string | null | undefined): boolean {
  return workspaceRoleRank(role) >= 2
}
