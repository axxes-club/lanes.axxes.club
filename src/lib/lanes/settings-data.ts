import "server-only"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { LanesError } from "./errors"
import { requireBoard } from "./access"

/**
 * The board settings reads.
 *
 * Four features — custom fields, integrations, webhooks and the audit trail —
 * have had finished tables since the enterprise commit and no screen at all.
 * These are the reads they need. Every one of them goes through
 * `requireBoardPermission` rather than trusting the route, so a guessed board
 * id does not return a webhook secret or an audit row.
 *
 * They all tolerate a missing table. `custom_fields`, `integrations`,
 * `webhooks` and `audit_log` are part of the shared AXXES schema but an
 * older database will not have them, and a settings page that 500s because a
 * table is absent is worse than one that says "not available yet".
 */

async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback)
}

export type CustomField = {
  id: string
  key: string
  name: string
  type: string
  options: { value: string; label: string; color?: string }[]
  required: boolean
  showOnCard: boolean
  position: number
}

export async function listCustomFields(boardId: string): Promise<CustomField[]> {
  await requireBoard(boardId, "board.read")
  try {
  return (await db.select().from(s.customFields).where(and(eq(s.customFields.boardId, boardId), isNull(s.customFields.deletedAt))).orderBy(asc(s.customFields.position))).map((f) => ({ id:f.id,key:f.key,name:f.name,type:f.type,options:f.options??[],required:f.required,showOnCard:f.showOnCard,position:f.position }))
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code
    if (code === "42703" || code === "42P01") throw new LanesError("Custom fields need the Lanes field migration before they can be edited.", 503)
    throw error
  }
}

export async function availableCustomFields(boardId: string): Promise<{ fields: CustomField[]; error?: string }> {
  try { return { fields: await listCustomFields(boardId) } } catch (error) {
    if (error instanceof LanesError && error.status === 503) return { fields: [], error: error.message }
    throw error
  }
}

export type Webhook = {
  id: string
  url: string
  events: string[]
  enabled: boolean
  lastDeliveredAt: Date | null
  lastError: string | null
  createdAt: Date
}

/**
 * Webhooks, without their secrets.
 *
 * The `secret` column is an HMAC key shown exactly once at creation. A list
 * endpoint that returned it would put every webhook key in a browser's memory
 * and in anything that logs the response, so the field is not selected at
 * all rather than selected and hidden — the query cannot leak what it never
 * asks for.
 */
export async function listWebhooks(boardId: string): Promise<Webhook[]> {
  await requireBoard(boardId, "webhook.manage")
  return safely(
    async () =>
      db
        .select({
          id: s.webhooks.id,
          url: s.webhooks.url,
          events: s.webhooks.events,
          enabled: s.webhooks.enabled,
          lastDeliveredAt: s.webhooks.lastDeliveredAt,
          lastError: s.webhooks.lastError,
          createdAt: s.webhooks.createdAt,
        })
        .from(s.webhooks)
        .where(eq(s.webhooks.boardId, boardId))
        .orderBy(desc(s.webhooks.createdAt)),
    [],
  )
}

export type AuditRow = {
  id: string
  action: string
  userId: string | null
  user: string | null
  cardId: string | null
  cardTitle: string | null
  from: unknown
  to: unknown
  createdAt: Date
}

export async function listAudit(boardId: string, limit = 100): Promise<AuditRow[]> {
  await requireBoard(boardId, "audit.read")
  return safely(
    async () =>
      db
        .select({
          id: s.auditLog.id,
          action: s.auditLog.action,
          userId: s.auditLog.userId,
          user: s.user.name,
          cardId: s.auditLog.cardId,
          cardTitle: s.projectCards.title,
          from: s.auditLog.from,
          to: s.auditLog.to,
          createdAt: s.auditLog.createdAt,
        })
        .from(s.auditLog)
        .leftJoin(s.user, eq(s.user.id, s.auditLog.userId))
        .leftJoin(s.projectCards, eq(s.projectCards.id, s.auditLog.cardId))
        .where(eq(s.auditLog.boardId, boardId))
        .orderBy(desc(s.auditLog.createdAt))
        .limit(limit),
    [],
  )
}

export type Integration = {
  id: string
  provider: string
  name: string
  externalUrl: string | null
  enabled: boolean
  lastSyncedAt: Date | null
  lastError: string | null
  linkedCards: number
}

export async function listIntegrations(boardId: string): Promise<Integration[]> {
  await requireBoard(boardId, "integration.manage")
  return safely(
    async () => {
      const rows = await db
        .select({
          id: s.integrations.id,
          provider: s.integrations.provider,
          name: s.integrations.name,
          externalUrl: s.integrations.externalUrl,
          enabled: s.integrations.enabled,
          lastSyncedAt: s.integrations.lastSyncedAt,
          lastError: s.integrations.lastError,
        })
        .from(s.integrations)
        .where(eq(s.integrations.boardId, boardId))
        .orderBy(asc(s.integrations.name))

      return Promise.all(
        rows.map(async (r) => {
          const [linked] = await db
            .select({ n: s.cardIntegrations.id })
            .from(s.cardIntegrations)
            .where(eq(s.cardIntegrations.integrationId, r.id))
            .limit(1)
          return { ...r, linkedCards: linked ? 1 : 0 }
        }),
      )
    },
    [],
  )
}

export type BoardStat = {
  cards: number
  lists: number
  members: number
  sprints: number
  comments: number
  activityThisWeek: number
}

export async function boardStats(boardId: string): Promise<BoardStat> {
  await requireBoard(boardId, "board.read")
  return safely(
    async () => {
      const [row] = await db
        .select({
          cards: sql<number>`(select count(*) from project_cards where project_id = "projects"."id" and deleted_at is null)`.mapWith(Number),
          lists: sql<number>`(select count(*) from project_lists where project_id = "projects"."id" and deleted_at is null)`.mapWith(Number),
          members: sql<number>`(select count(*) from board_member_roles where board_id = "projects"."id")`.mapWith(Number),
          sprints: sql<number>`(select count(*) from sprints where board_id = "projects"."id")`.mapWith(Number),
          comments: sql<number>`(select count(*) from project_card_comments c join project_cards k on k.id = c.card_id where k.project_id = "projects"."id" and c.deleted_at is null)`.mapWith(Number),
          activityThisWeek: sql<number>`(select count(*) from project_activity where project_id = "projects"."id" and created_at > now() - interval '7 days')`.mapWith(Number),
        })
        .from(s.projects)
        .where(eq(s.projects.id, boardId))
        .limit(1)
      // Five sub-selects against one row. The counts are shown in a header on
      // the settings page, so they must not each be their own round trip.
      return row ?? { cards: 0, lists: 0, members: 0, sprints: 0, comments: 0, activityThisWeek: 0 }
    },
    { cards: 0, lists: 0, members: 0, sprints: 0, comments: 0, activityThisWeek: 0 },
  )
}
