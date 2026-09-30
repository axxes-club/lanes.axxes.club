import "server-only"
import { listSavedViews } from "./view-actions"
import type { SavedView } from "./view-validation"
import { and, eq } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { listSprints, activeSprint } from "./sprints"
import { boardAccess } from "./board-access"
import { can, type Permission } from "./permissions"

/**
 * Everything the board chrome needs, in one place.
 *
 * The board page used to render the board and nothing else, which meant every
 * piece of chrome — the sprint panel, the role badge, the members link, the
 * star — had to fetch its own data and then re-ask "may this person do this"
 * separately. That is how a board ends up showing a Start sprint button to
 * somebody who cannot start sprints.
 *
 * So the permissions are resolved once, here, and passed down as plain
 * booleans. The client cannot widen them: every mutation re-checks on the
 * server. Hiding a control the person may not use is a courtesy; refusing
 * the request is the enforcement.
 */

export type BoardChrome = {
  savedViews: SavedView[]
  role: string
  elevated: boolean
  permissions: Record<string, boolean>
  starred: boolean
  sprints: {
    id: string
    name: string
    goal: string | null
    status: string
    startsAt: string | null
    endsAt: string | null
  }[]
  activeSprint: { id: string; name: string; goal: string | null; endsAt: string | null } | null
  /** Cards committed to each sprint, for the panel's counts. */
  committed: Record<string, number>
}

const CHECKED: Permission[] = [
  "board.read", "board.update", "board.settings", "board.members", "board.delete",
  "card.create", "card.update", "card.move", "card.delete", "card.assign", "card.priority", "card.comment", "card.verify", "card.link", "card.estimate",
  "sprint.read", "sprint.manage", "sprint.commit", "sprint.complete",
  "poker.read", "poker.facilitate",
  "backlog.write", "backlog.groom",
  "customField.manage", "integration.manage", "webhook.manage", "token.manage", "audit.read", "export.read",
]

export async function boardChrome(boardId: string, userId: string): Promise<BoardChrome> {
  const [access, sprints, current, savedViews] = await Promise.all([
    boardAccess(boardId),
    listSprints(boardId).catch(() => []),
    activeSprint(boardId).catch(() => null),
    listSavedViews(boardId),
  ])

  const permissions: Record<string, boolean> = {}
  for (const p of CHECKED) permissions[p] = access.permissions(p)

  const star = await db
    .select({ boardId: s.boardStars.boardId })
    .from(s.boardStars)
    .where(and(eq(s.boardStars.boardId, boardId), eq(s.boardStars.userId, userId)))
    .limit(1)

  // Commitment counts, so the sprint panel can say "12 cards" without the
  // client having to count them out of the board it already has.
  const counts: Record<string, number> = {}
  if (sprints.length) {
    const rows = await db
      .select({ sprintId: s.cardSprints.sprintId })
      .from(s.cardSprints)
    for (const r of rows) counts[r.sprintId] = (counts[r.sprintId] ?? 0) + 1
  }

  return {
    savedViews,
    role: access.role,
    elevated: access.elevated,
    permissions,
    starred: star.length > 0,
    sprints: sprints.map((sp) => ({
      id: sp.id,
      name: sp.name,
      goal: sp.goal,
      status: sp.status,
      startsAt: sp.startsAt?.toISOString() ?? null,
      endsAt: sp.endsAt?.toISOString() ?? null,
    })),
    activeSprint: current
      ? { id: current.id, name: current.name, goal: current.goal, endsAt: current.endsAt?.toISOString() ?? null }
      : null,
    committed: counts,
  }
}

export { can }
