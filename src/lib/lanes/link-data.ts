import "server-only"
import { and, asc, eq, isNull } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { recordSource, type RecordKind } from "@/lib/axxes/record-kinds"

/**
 * The links on a card, with the referenced record re-read live.
 *
 * `card_links.label` is a snapshot taken when the link was made. It is what
 * the picker shows and what survives if the record is later deleted — but the
 * label shown on a card is re-read from the source table every time the panel
 * opens, so renaming a customer updates every card that references it without
 * a sync job. That is the property that makes "we share a database" worth
 * saying out loud.
 */

export type CardLinkView = {
  id: string
  kind: RecordKind
  recordId: string
  product: string
  /** Live from the source table, falling back to the snapshot. */
  label: string
  detail: string | null
  href: string
  /** True when the source row no longer exists. */
  missing: boolean
}

export async function linksForCard(tenantId: string, cardId: string): Promise<CardLinkView[]> {
  const rows = await db
    .select({
      id: s.cardLinks.id,
      kind: s.cardLinks.kind,
      recordId: s.cardLinks.recordId,
      product: s.cardLinks.product,
      label: s.cardLinks.label,
      detail: s.cardLinks.detail,
    })
    .from(s.cardLinks)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.cardLinks.cardId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .where(
      and(
        eq(s.cardLinks.cardId, cardId),
        eq(s.projects.tenantId, tenantId),
        isNull(s.projectCards.deletedAt),
      ),
    )
    .orderBy(asc(s.cardLinks.createdAt))
    .catch(() => [])

  return Promise.all(
    rows.map(async (row) => {
      const kind = row.kind as RecordKind
      const source = recordSource(kind)
      if (!source) {
        return { ...row, kind, href: "#", live: null, missing: true } as unknown as CardLinkView
      }
      const live = await readLive(tenantId, kind, row.recordId)
      return {
        id: row.id,
        kind,
        recordId: row.recordId,
        product: row.product,
        // The live label wins; the snapshot is only a fallback.
        label: live?.label ?? row.label,
        detail: live?.detail ?? row.detail,
        href: source.href(row.recordId),
        missing: !live,
      }
    }),
  )
}

/** Re-read one record. Any failure is "missing", never an exception. */
async function readLive(
  tenantId: string,
  kind: RecordKind,
  recordId: string,
): Promise<{ label: string; detail: string | null } | null> {
  const { readRecord } = await import("@/lib/axxes/records")
  // A direct tenant-scoped read by id. It also *proves* the record is one
  // this workspace can see, which is the point of scoping it.
  const hit = await readRecord(tenantId, kind, recordId).catch(() => null)
  return hit ? { label: hit.label, detail: hit.detail } : null
}
