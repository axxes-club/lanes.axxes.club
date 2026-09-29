import "server-only"
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { boardPrefix, cardKey } from "./prefix"

/**
 * Search.
 *
 * One ranked search over everything a person can reach in a workspace:
 * boards, cards and people. It powers three surfaces — the command palette,
 * the search page and /api/v1/search — so a result found in one is reachable
 * in all of them and the ranking cannot drift between them.
 *
 * The ranking is simple and explainable on purpose. Someone who types "onb"
 * and gets "Website onboarding" has to be able to predict the rest of the
 * list, which rules out anything clever:
 *
 *   1. a key or title prefix beats a substring match
 *   2. a title match beats a description match
 *   3. newer work beats older work at equal relevance
 */

export type SearchHit = {
  kind: "board" | "card" | "person"
  id: string
  title: string
  subtitle: string | null
  href: string
  /** 0–1000. Higher is better. */
  score: number
  /** The text that matched, for highlighting. */
  matched: string
  meta?: Record<string, string | number | boolean | null>
}

const KEY_PATTERN = /^([a-z0-9]+)-(\d+)$/i

/**
 * Score one candidate against one query.
 *
 * Pure on purpose: the palette, the page and the API all call it, and a pure
 * function is the only kind whose ordering can be tested.
 */
export function scoreMatch(
  query: string,
  key: string,
  title: string,
  body?: string | null,
): { score: number; matched: string } {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, matched: title }

  const k = key.toLowerCase()
  const t = title.toLowerCase()
  const b = (body ?? "").toLowerCase()

  // A card key is its own searchable handle: "WEB-12" finds that card.
  const parsed = KEY_PATTERN.exec(q)
  if (parsed && k.split("-")[0] === parsed[1] && k.endsWith(`-${parsed[2]}`)) {
    return { score: 1000, matched: key }
  }

  if (k === q) return { score: 900, matched: key }
  if (k.startsWith(q)) return { score: 820, matched: key }
  if (t === q) return { score: 800, matched: title }
  if (t.startsWith(q)) return { score: 700, matched: title }
  // Word-boundary hits: "board" matches "Boards", "reboard" does not.
  if (t.split(/[\s\-_/·]+/).some((w) => w.startsWith(q))) return { score: 620, matched: title }
  if (t.includes(q)) return { score: 520, matched: title }
  if (k.includes(q)) return { score: 480, matched: key }
  if (b.includes(q)) return { score: 260, matched: title }
  return { score: 0, matched: title }
}

/**
 * Search a workspace.
 *
 * `limit` is applied per kind and then again overall, so a workspace with
 * ten thousand cards cannot crowd the boards out of the list.
 */
export async function searchWorkspace(
  tenantId: string,
  query: string,
  opts: { limit?: number; kinds?: SearchHit["kind"][] } = {},
): Promise<SearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const limit = opts.limit ?? 20
  const kinds = opts.kinds
  const want = (k: SearchHit["kind"]) => !kinds || kinds.includes(k)
  const pattern = like(q)
  const hits: SearchHit[] = []

  if (want("board")) {
    const boards = await db
      .select({
        id: s.projects.id,
        name: s.projects.name,
        description: s.projects.description,
        color: s.projects.color,
        settings: s.projects.settings,
      })
      .from(s.projects)
      .where(
        and(
          eq(s.projects.tenantId, tenantId),
          isNull(s.projects.deletedAt),
          isNull(s.projects.archivedAt),
          or(ilike(s.projects.name, pattern), ilike(s.projects.description, pattern)),
        ),
      )
      .orderBy(desc(s.projects.updatedAt))
      .limit(limit)

    for (const b of boards) {
      const { score, matched } = scoreMatch(q, b.name, b.name, b.description)
      if (!score) continue
      hits.push({
        kind: "board",
        id: b.id,
        title: b.name,
        subtitle: b.description,
        href: `/dashboard/b/${b.id}`,
        score,
        matched,
        meta: { color: b.color, prefix: boardPrefix(b.settings, b.name) },
      })
    }
  }

  if (want("card")) {
    const cards = await db
      .select({
        id: s.projectCards.id,
        title: s.projectCards.title,
        description: s.projectCards.description,
        projectId: s.projectCards.projectId,
        dueDate: s.projectCards.dueDate,
        customFields: s.projectCards.customFields,
        board: s.projects.name,
        boardSettings: s.projects.settings,
        listName: s.projectLists.name,
        done: s.projectLists.isDoneList,
      })
      .from(s.projectCards)
      .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
      .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
      .where(
        and(
          eq(s.projects.tenantId, tenantId),
          isNull(s.projectCards.deletedAt),
          isNull(s.projectCards.archivedAt),
          or(ilike(s.projectCards.title, pattern), ilike(s.projectCards.description, pattern)),
        ),
      )
      .orderBy(desc(s.projectCards.updatedAt))
      .limit(limit)

    for (const c of cards) {
      const key = cardKey(c.boardSettings, c.board, Number((c.customFields as { seq?: number } | null)?.seq ?? 0))
      const { score, matched } = scoreMatch(q, key, c.title, c.description)
      if (!score) continue
      hits.push({
        kind: "card",
        id: c.id,
        title: c.title,
        subtitle: `${key} · ${c.board} · ${c.listName}`,
        href: `/dashboard/b/${c.projectId}?card=${c.id}`,
        score,
        matched,
        meta: { key, board: c.board, list: c.listName, done: c.done ? 1 : 0, dueDate: c.dueDate?.toISOString() ?? null },
      })
    }
  }

  if (want("person")) {
    const people = await db
      .selectDistinct({ id: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image })
      .from(s.tenantMemberships)
      .innerJoin(s.user, eq(s.user.id, s.tenantMemberships.userId))
      .where(
        and(
          eq(s.tenantMemberships.tenantId, tenantId),
          isNull(s.tenantMemberships.deletedAt),
          or(ilike(s.user.name, pattern), ilike(s.user.email, pattern)),
        ),
      )
      .limit(Math.min(limit, 8))

    for (const p of people) {
      const { score, matched } = scoreMatch(q, p.name, p.name, p.email)
      if (!score) continue
      hits.push({
        kind: "person",
        id: p.id,
        title: p.name,
        subtitle: p.email,
        href: `/dashboard/people?focus=${p.id}`,
        // People rank below work items: you search for a person to find
        // their cards, not to visit a profile page.
        score: Math.round(score * 0.4),
        matched,
        meta: { image: p.image },
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Boards this person starred, most recently touched first. */
export async function starredBoards(
  tenantId: string,
  userId: string,
): Promise<{ id: string; name: string; color: string | null }[]> {
  // DISTINCT plus an ORDER BY on a column that is not in the select list is
  // rejected by Postgres (42P10, "for SELECT DISTINCT, ORDER BY expressions
  // must appear in select list"), and this query did exactly that: it selected
  // id/name/color and ordered by projects.updated_at. That made /dashboard a
  // 500 for anyone who had ever starred a board, which is why it looked fine
  // in development against an empty board and broke in production the moment
  // the first star existed.
  //
  // updatedAt is selected and dropped rather than the DISTINCT removed: the
  // DISTINCT is belt-and-braces even though (board_id, user_id) is the primary
  // key and cannot duplicate. Keeping it means the ordering survives if that
  // key is ever relaxed.
  const rows = await db
    .selectDistinct({
      id: s.projects.id,
      name: s.projects.name,
      color: s.projects.color,
      updatedAt: s.projects.updatedAt,
    })
    .from(s.boardStars)
    .innerJoin(s.projects, eq(s.projects.id, s.boardStars.boardId))
    .where(and(eq(s.boardStars.userId, userId), eq(s.projects.tenantId, tenantId), isNull(s.projects.deletedAt)))
    .orderBy(desc(s.projects.updatedAt))

  return rows.map(({ id, name, color }) => ({ id, name, color }))
}

/** Star or unstar. The primary key makes this idempotent, not last-write-wins. */
export async function toggleStar(boardId: string, userId: string, starred: boolean) {
  if (starred) {
    await db
      .insert(s.boardStars)
      .values({ boardId, userId })
      .onConflictDoNothing()
  } else {
    await db.delete(s.boardStars).where(and(eq(s.boardStars.boardId, boardId), eq(s.boardStars.userId, userId)))
  }
}

/** How much open work this person holds, per board. */
export async function workloadFor(tenantId: string, userId: string) {
  return db
    .select({
      boardId: s.projectCards.projectId,
      board: s.projects.name,
      color: s.projects.color,
      open: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false))`.mapWith(Number),
      overdue: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false) and ${s.projectCards.dueDate} < now())`.mapWith(Number),
    })
    .from(s.projectCardMembers)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.projectCardMembers.cardId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(
      and(
        eq(s.projectCardMembers.userId, userId),
        eq(s.projects.tenantId, tenantId),
        isNull(s.projectCards.deletedAt),
        isNull(s.projectCards.archivedAt),
        isNull(s.projects.deletedAt),
      ),
    )
    .groupBy(s.projectCards.projectId, s.projects.name, s.projects.color)
}

/** Escapes LIKE metacharacters so a search for "100%" is not a wildcard. */
function like(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
