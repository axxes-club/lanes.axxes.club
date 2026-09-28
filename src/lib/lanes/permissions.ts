import { BOARD_ROLES, isBoardRole, type BoardRole } from "@/lib/lanes/roles"

/**
 * What each role may do on a board.
 *
 * The point of a fixed table is that "can a QA move a card?" has exactly one
 * answer, everywhere — the board, the card panel, the API and a webhook all
 * consult this, so two screens can never disagree about the same person.
 *
 * Two things are deliberately true here:
 *
 * - A stakeholder can comment without being able to change a card. Review is
 *   most of what stakeholders are there for, and blocking comments turns them
 *   into a mailing list.
 * - Only a product owner or scrum master may commit a card to a sprint.
 *   If a developer could self-commit, the sprint would fill with whatever
 *   people felt like doing, and the commitment would mean nothing.
 *
 * Board `owner` has every permission. Workspace owners/admins (see
 * workspaceRoleRank in roles.ts) can always act, so nobody is locked out of
 * their own board.
 */
export const PERMISSIONS = [
  "board.read", "board.update", "board.delete", "board.settings", "board.members",
  "sprint.read", "sprint.manage", "sprint.commit", "sprint.complete",
  "poker.read", "poker.facilitate",
  "backlog.read", "backlog.write", "backlog.groom",
  "card.read", "card.create", "card.update", "card.move", "card.delete", "card.assign", "card.priority", "card.estimate", "card.comment", "card.link", "card.verify",
  "customField.manage", "integration.manage", "webhook.manage", "token.manage", "audit.read",
  "export.read",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const READ_ONLY: Permission[] = ["board.read", "sprint.read", "poker.read", "backlog.read", "card.read", "export.read"]

const CONTRIBUTOR: Permission[] = [
  ...READ_ONLY,
  "card.create", "card.update", "card.move", "card.assign", "card.estimate", "card.comment", "card.link", "card.delete",
]

const MATRIX: Record<BoardRole, Permission[]> = {
  owner: [...PERMISSIONS],

  product_owner: [
    ...CONTRIBUTOR,
    "board.update", "card.priority",
    "backlog.write", "backlog.groom",
    "sprint.commit",
    "customField.manage",
    "export.read",
  ],

  scrum_master: [
    ...CONTRIBUTOR,
    "board.update",
    "sprint.manage", "sprint.commit", "sprint.complete",
    "poker.facilitate",
    "backlog.groom",
    "integration.manage", "webhook.manage", "audit.read",
  ],

  developer: [...CONTRIBUTOR],

  // Designers work the sprint like anyone else, and own design links.
  designer: [...CONTRIBUTOR],

  // QA can move anything and change state, but does not set priority — that
  // is the product owner deciding what matters, not the person testing it.
  qa: [...CONTRIBUTOR, "card.verify"],

  // Review, comment, export. Nothing moves.
  stakeholder: [...READ_ONLY, "card.comment"],

  viewer: [...READ_ONLY],
}

/** The plain-English summary shown on the board's people page. */
export const ROLE_SUMMARY: Record<BoardRole, string> = {
  owner: "Everything on this board, including its settings and people.",
  product_owner: "Writes and grooms the backlog, sets priority, commits the sprint.",
  scrum_master: "Runs the sprint and poker, unblocks the team, reads the audit trail.",
  developer: "Works the sprint: moves cards, logs time, links pull requests.",
  designer: "Works the sprint, and owns the design links on a card.",
  qa: "Works the sprint and marks a card verified. Does not set priority.",
  stakeholder: "Reads everything and can comment. Cannot change cards.",
  viewer: "Reads everything. No changes.",
}

export function can(role: BoardRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const granted = MATRIX[role]
  return granted ? granted.includes(permission) : false
}

export function permissionsFor(role: BoardRole): readonly Permission[] {
  return MATRIX[role] ?? []
}

export { BOARD_ROLES, isBoardRole }
export const BOARD_ROLE_LABEL_SOURCE = true
