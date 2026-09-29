"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { badRequest, notFound } from "./errors"
import { requireBoardPermission } from "./board-access"
import { recordSource, searchRecords, type LinkedRecord, type RecordKind } from "@/lib/axxes/records"

/**
 * Linking a card to a record in another AXXES product.
 *
 * This is the whole "integrated with the suite" claim, and it is unusually
 * cheap to build, because Lanes and its siblings read the same database. The
 * link is a foreign key into a table another app owns: no connector, no
 * OAuth, no sync job, and nothing that can go stale, because the row the card
 * shows is the row the other app is looking at.
 *
 * Two rules keep it honest, and both live in the queries rather than in a
 * check afterwards:
 *
 * 1. Every read joins through `projects` and filters on the tenant. A link is
 *    a join, and a join to another organization is a data leak dressed as a
 *    convenience. A card you cannot see returns 404, not 403 — a 403 would
 *    confirm it exists.
 * 2. Re-linking the same record updates the label rather than stacking a
 *    second row. The unique index on (card, kind, record) is the guarantee;
 *    a read-then-write would be a race.
 */

export type LinkResult = { error?: string; records?: LinkedRecord[] }

/** The board a card belongs to, or null if it is not in this workspace. */
async function boardOf(cardId: string, tenantId: string): Promise<string | null> {
  const [row] = await db
    .select({ boardId: s.projectCards.projectId })
    .from(s.projectCards)
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(
      and(
        eq(s.projectCards.id, cardId),
        eq(s.projects.tenantId, tenantId),
        isNull(s.projectCards.deletedAt),
      ),
    )
    .limit(1)
  return row?.boardId ?? null
}

function asKind(value: string): RecordKind {
  if (!recordSource(value as RecordKind)) throw badRequest("That is not a linkable record type.")
  return value as RecordKind
}

/** Search a sibling app's records. Scoped to this workspace, always. */
export async function searchLinkableRecords(kind: string, q: string): Promise<LinkResult> {
  const ctx = await requireContext()
  return { records: await searchRecords(ctx.tenant.id, asKind(kind), q, 12) }
}

/** Link a record to a card. Idempotent on (card, kind, record). */
export async function linkRecordAction(
  cardId: string,
  kind: string,
  recordId: string,
  label: string,
  detail: string | null,
  product: string,
): Promise<LinkResult> {
  const ctx = await requireContext()
  const boardId = await boardOf(cardId, ctx.tenant.id)
  if (!boardId) throw notFound("That card")
  await requireBoardPermission(boardId, "card.update")

  asKind(kind)
  if (!recordId) throw badRequest("No record was chosen.")

  await db
    .insert(s.cardLinks)
    .values({
      cardId,
      kind,
      recordId,
      label: label.slice(0, 200),
      detail: detail?.slice(0, 300) ?? null,
      product,
      createdById: ctx.userId,
    })
    // Re-linking refreshes the stored label rather than adding a second row.
    .onConflictDoUpdate({
      target: [s.cardLinks.cardId, s.cardLinks.kind, s.cardLinks.recordId],
      set: { label: label.slice(0, 200), detail: detail?.slice(0, 300) ?? null, product },
    })

  await db.insert(s.projectActivity).values({
    projectId: boardId,
    tenantId: ctx.tenant.id,
    cardId,
    type: "card.linked",
    description: `linked a ${kind} from ${product}`,
    userId: ctx.userId,
  })

  revalidatePath(`/dashboard/b/${boardId}`)
  return {}
}

export async function unlinkRecordAction(cardId: string, linkId: string): Promise<LinkResult> {
  const ctx = await requireContext()
  const boardId = await boardOf(cardId, ctx.tenant.id)
  if (!boardId) throw notFound("That card")
  await requireBoardPermission(boardId, "card.update")

  const [row] = await db
    .select({ kind: s.cardLinks.kind })
    .from(s.cardLinks)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.cardLinks.cardId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(
      and(
        eq(s.cardLinks.id, linkId),
        eq(s.cardLinks.cardId, cardId),
        eq(s.projects.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1)
  if (!row) throw notFound("That link")

  await db.delete(s.cardLinks).where(eq(s.cardLinks.id, linkId))
  await db.insert(s.projectActivity).values({
    projectId: boardId,
    tenantId: ctx.tenant.id,
    cardId,
    type: "card.unlinked",
    description: `unlinked a ${row.kind}`,
    userId: ctx.userId,
  })

  revalidatePath(`/dashboard/b/${boardId}`)
  return {}
}
