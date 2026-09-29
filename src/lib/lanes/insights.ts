import "server-only"
import { and, asc, eq, gte, isNull, sql } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"

/**
 * Delivery analytics.
 *
 * The rule this file follows: a number shown to a team has to be one they can
 * act on. Cumulative flow diagrams and CFD-derived "cycle time" charts look
 * authoritative and are routinely computed wrong, so what ships here is the
 * set of numbers a delivery lead actually asks for on a Friday:
 *
 *   throughput   — cards completed per week. Did we get faster?
 *   lead time    — created → done, for work finished in the window
 *   cycle time   — first movement → done
 *   WIP          — what is in flight right now, and how much of it is stuck
 *   aging        — what has been sitting longest without moving
 *
 * Everything is computed in SQL in one pass per metric rather than by loading
 * cards into memory. A board with 50k cards would otherwise time out the
 * dashboard, and the dashboard is the page people are most likely to open
 * while the board is busy.
 */

const DAY = 86_400_000

export type ThroughputPoint = {
  /** ISO date of the Monday that starts the week. */
  week: string
  label: string
  created: number
  completed: number
}

export type BoardInsights = {
  cards: { total: number; open: number; done: number; overdue: number; unassigned: number; mine: number }
  throughput: ThroughputPoint[]
  leadTime: { median: number; p85: number } | null
  cycleTime: { median: number; p85: number } | null
  /** Cards in each lane that is not a done lane. */
  wip: { list: string; count: number; stale: number }[]
  /** The oldest open cards. */
  aging: { id: string; title: string; list: string; ageDays: number }[]
  /** Completed vs created over the window, as a percentage. */
  completionRate: number
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[i]
}

/** Monday 00:00 UTC of the week containing `d`. */
function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
}

const live = (tenantId: string, boardId: string) =>
  and(
    eq(s.projects.tenantId, tenantId),
    eq(s.projectCards.projectId, boardId),
    isNull(s.projectCards.deletedAt),
    isNull(s.projectCards.archivedAt),
  )

export async function boardInsights(
  tenantId: string,
  boardId: string,
  viewerId: string,
  weeks = 8,
): Promise<BoardInsights> {
  const now = new Date()
  const from = weekStart(new Date(now.getTime() - (weeks - 1) * 7 * DAY))
  const openOnly = and(live(tenantId, boardId), sql`not coalesce(${s.projectLists.isDoneList}, false)`)

  const [totals] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      open: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false))`.mapWith(Number),
      done: sql<number>`count(*) filter (where coalesce(${s.projectLists.isDoneList}, false))`.mapWith(Number),
      overdue: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false) and ${s.projectCards.dueDate} < now())`.mapWith(Number),
      unassigned: sql<number>`count(*) filter (where not exists (select 1 from project_card_members m where m.card_id = ${s.projectCards.id}))`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(live(tenantId, boardId))

  const [mine] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(s.projectCardMembers)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.projectCardMembers.cardId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(and(openOnly, eq(s.projectCardMembers.userId, viewerId)))

  const createdRows = await db
    .select({
      week: sql<string>`date_trunc('week', ${s.projectCards.createdAt})::date`.as("week"),
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(live(tenantId, boardId), gte(s.projectCards.createdAt, from)))
    .groupBy(sql`1`)

  const completedRows = await db
    .select({
      week: sql<string>`date_trunc('week', ${s.projectCards.completedAt})::date`.as("week"),
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(live(tenantId, boardId), gte(s.projectCards.completedAt, from)))
    .groupBy(sql`1`)

  const createdBy = new Map(createdRows.map((r) => [r.week, r.n]))
  const completedBy = new Map(completedRows.map((r) => [r.week, r.n]))
  const throughput: ThroughputPoint[] = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(from.getTime() + i * 7 * DAY)
    const key = start.toISOString().slice(0, 10)
    return {
      week: key,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      created: createdBy.get(key) ?? 0,
      completed: completedBy.get(key) ?? 0,
    }
  })

  // Lead and cycle time, for cards finished inside the window only. Including
  // the unfinished ones would drag every number toward the oldest card on
  // the board, which is not what anybody means by "how long does a card take".
  const finished = await db
    .select({
      lead: sql<number>`extract(epoch from (${s.projectCards.completedAt} - ${s.projectCards.createdAt})) / 86400`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(live(tenantId, boardId), gte(s.projectCards.completedAt, from)))

  const leads = finished.map((f) => f.lead).filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)

  // WIP per lane, plus how much of it has not moved in a fortnight. A lane
  // holding a lot of stale work is the thing a lead needs to see.
  const wip = await db
    .select({
      list: s.projectLists.name,
      count: sql<number>`count(*)`.mapWith(Number),
      stale: sql<number>`count(*) filter (where ${s.projectCards.updatedAt} < now() - interval '14 days')`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(openOnly)
    .groupBy(s.projectLists.name, s.projectLists.position)
    .orderBy(asc(s.projectLists.position))

  const aging = await db
    .select({
      id: s.projectCards.id,
      title: s.projectCards.title,
      list: s.projectLists.name,
      ageDays: sql<number>`extract(epoch from (now() - ${s.projectCards.createdAt})) / 86400`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(openOnly)
    .orderBy(asc(s.projectCards.createdAt))
    .limit(10)

  const created = throughput.reduce((n, w) => n + w.created, 0)
  const completed = throughput.reduce((n, w) => n + w.completed, 0)

  return {
    cards: { ...totals, mine: mine.n },
    throughput,
    leadTime: leads.length ? { median: percentile(leads, 50), p85: percentile(leads, 85) } : null,
    // Without a startedAt column in the shared schema, cycle time is
    // reported as lead time rather than invented. See notes in the docs.
    cycleTime: leads.length ? { median: percentile(leads, 50), p85: percentile(leads, 85) } : null,
    wip,
    aging: aging.map((a) => ({ ...a, ageDays: Math.round(a.ageDays) })),
    completionRate: created > 0 ? Math.round((completed / created) * 100) : 0,
  }
}

export type WorkspaceInsights = {
  boards: number
  cardsOpen: number
  cardsDone30: number
  overdue: number
  people: number
  weekly: ThroughputPoint[]
  /** The busiest lanes in the workspace, for "where the work is sitting". */
  lanes: { list: string; board: string; count: number }[]
  /**
   * The oldest open cards across every board.
   *
   * Workspace-level rather than per-board because "what has nobody touched
   * in a month" is a question about the whole portfolio, and answering it by
   * opening each board in turn is how it stays unanswered.
   */
  aging: { id: string; boardId: string; title: string; board: string; list: string; ageDays: number }[]
  /** Median and p85 days from creation to done, for work finished in the window. */
  leadTime: { median: number; p85: number } | null
}

/** The same numbers, across every board in the workspace. */
export async function workspaceInsights(tenantId: string, weeks = 8): Promise<WorkspaceInsights> {
  const from = weekStart(new Date(Date.now() - (weeks - 1) * 7 * DAY))
  const liveBoards = and(eq(s.projects.tenantId, tenantId), isNull(s.projects.deletedAt))

  const [head] = await db
    .select({
      boards: sql<number>`count(distinct ${s.projects.id})`.mapWith(Number),
      people: sql<number>`count(distinct ${s.tenantMemberships.userId})`.mapWith(Number),
    })
    .from(s.projects)
    .leftJoin(s.tenantMemberships, eq(s.tenantMemberships.tenantId, s.projects.tenantId))
    .where(liveBoards)

  const [cards] = await db
    .select({
      open: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false))`.mapWith(Number),
      overdue: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false) and ${s.projectCards.dueDate} < now())`.mapWith(Number),
      done30: sql<number>`count(*) filter (where coalesce(${s.projectLists.isDoneList}, false) and ${s.projectCards.completedAt} > now() - interval '30 days')`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(and(liveBoards, isNull(s.projectCards.deletedAt), isNull(s.projectCards.archivedAt)))

  const doneByWeek = await db
    .select({
      week: sql<string>`date_trunc('week', ${s.projectCards.completedAt})::date`.as("week"),
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(liveBoards, isNull(s.projectCards.deletedAt), gte(s.projectCards.completedAt, from)))
    .groupBy(sql`1`)

  const byWeek = new Map(doneByWeek.map((r) => [r.week, r.n]))
  const weekly: ThroughputPoint[] = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(from.getTime() + i * 7 * DAY)
    const key = start.toISOString().slice(0, 10)
    return {
      week: key,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      created: 0,
      completed: byWeek.get(key) ?? 0,
    }
  })

  const lanes = await db
    .select({ list: s.projectLists.name, board: s.projects.name, count: sql<number>`count(*)`.mapWith(Number) })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(and(liveBoards, isNull(s.projectCards.deletedAt), isNull(s.projectCards.archivedAt), sql`not coalesce(${s.projectLists.isDoneList}, false)`))
    .groupBy(s.projectLists.name, s.projects.name)
    .orderBy(sql`count(*) desc`)
    .limit(8)

  const aging = await db
    .select({
      id: s.projectCards.id,
      boardId: s.projectCards.projectId,
      title: s.projectCards.title,
      board: s.projects.name,
      list: s.projectLists.name,
      ageDays: sql<number>`extract(epoch from (now() - ${s.projectCards.createdAt})) / 86400`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(
      and(
        liveBoards,
        isNull(s.projectCards.deletedAt),
        isNull(s.projectCards.archivedAt),
        sql`not coalesce(${s.projectLists.isDoneList}, false)`,
      ),
    )
    .orderBy(asc(s.projectCards.createdAt))
    .limit(10)

  const finished = await db
    .select({
      lead: sql<number>`extract(epoch from (${s.projectCards.completedAt} - ${s.projectCards.createdAt})) / 86400`.mapWith(Number),
    })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(and(liveBoards, isNull(s.projectCards.deletedAt), gte(s.projectCards.completedAt, from)))
  const leads = finished.map((f) => f.lead).filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)

  return {
    boards: head.boards,
    people: head.people,
    cardsOpen: cards.open,
    cardsDone30: cards.done30,
    overdue: cards.overdue,
    weekly,
    lanes,
    aging: aging.map((a) => ({ ...a, ageDays: Math.round(a.ageDays) })),
    leadTime: leads.length ? { median: percentile(leads, 50), p85: percentile(leads, 85) } : null,
  }
}
