import "server-only"
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { recordSource, type RecordKind } from "./record-kinds"

/**
 * Reading records from the rest of the AXXES suite.
 *
 * Because every AXXES app reads the same Postgres database, a card in Lanes
 * can point at a real customer, a real order or a real venue without an
 * integration, an OAuth dance or a sync job. The link is a reference into a
 * sibling app's table, and the row is the same row that app is looking at.
 *
 * The *registry* — which kinds exist and where they live — lives in
 * `./record-kinds`, which has no database import, because the card panel's
 * picker is a client component and cannot import a module that reaches for
 * the database. This file is the server half: how to read one.
 *
 * Two rules protect the rest of the suite:
 *
 *   1. Every query is scoped to the tenant, always. A board in one workspace
 *      can never surface a record from another, even by guessing an id.
 *   2. Only tables that are safe to read cross-product are listed here.
 *      Anything holding a secret or a payment instrument does not belong.
 */

export type { RecordKind, RecordSource } from "./record-kinds"
export { recordSource } from "./record-kinds"

export type LinkedRecord = {
  kind: RecordKind
  product: string
  id: string
  label: string
  href: string
  detail: string | null
}

/** The table behind each kind. */
function tableFor(kind: RecordKind) {
  switch (kind) {
    case "contact": return s.contacts
    case "order": return s.orders
    case "event": return s.events
    case "product": return s.products
    case "venue": return s.venues
    case "supplier": return s.suppliers
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    // Money columns read better with a currency mark; the rest of the suite
    // formats money the same way.
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
  return String(value).replaceAll("_", " ")
}

/**
 * Find records to link.
 *
 * With no query the most recently touched are returned, which is the useful
 * default for "link the thing I just created in the other app".
 */
export async function searchRecords(
  tenantId: string,
  kind: RecordKind,
  q = "",
  limit = 10,
): Promise<LinkedRecord[]> {
  const source = recordSource(kind)
  if (!source) return []
  const table = tableFor(kind) as unknown as Record<string, never>

  const cols = (name: string) => table[name] as never
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const searchable = [...source.label, ...source.fields].map(cols).filter(Boolean)

  const rows = (await db
    .select(table)
    .from(table as never)
    .where(
      and(
        eq(cols("tenantId") as never, tenantId as never),
        isNull(cols("deletedAt") as never),
        q && searchable.length ? or(...searchable.map((c) => ilike(c, pattern))) : undefined,
      ),
    )
    .orderBy(desc(cols("updatedAt") as never))
    .limit(Math.min(200, Math.max(1, limit)))
    .catch(() => [])) as Record<string, unknown>[]

  return rows.map((row) => {
    const id = String(row.id)
    const label = source.label.map((c) => display(row[c])).filter(Boolean).join(" ") || id
    const detail = source.fields
      .map((f) => display(row[f]))
      .filter(Boolean)
      .join(" · ")
    return { kind, product: source.product, id, label, href: source.href(id), detail: detail || null }
  })
}

/**
 * One record by id, tenant-scoped.
 *
 * Used to re-read a linked record live when a card panel opens, so renaming a
 * customer updates every card that references it with no sync job involved.
 * Returns null for a record in another workspace, which is what "missing"
 * should mean.
 */
export async function readRecord(
  tenantId: string,
  kind: RecordKind,
  recordId: string,
): Promise<LinkedRecord | null> {
  const source = recordSource(kind)
  if (!source) return null
  const table = tableFor(kind) as unknown as Record<string, never>

  const [row] = (await db
    .select(table)
    .from(table as never)
    .where(
      and(
        eq(table["id"] as never, recordId as never),
        eq(table["tenantId"] as never, tenantId as never),
        isNull(table["deletedAt"] as never),
      ),
    )
    .limit(1)
    .catch(() => [])) as Record<string, unknown>[]

  if (!row) return null
  const label = source.label.map((c) => display(row[c])).filter(Boolean).join(" ") || recordId
  const detail = source.fields.map((f) => display(row[f])).filter(Boolean).join(" · ")
  return { kind, product: source.product, id: recordId, label, href: source.href(recordId), detail: detail || null }
}

/** A count per kind, so a panel can say what there is to link. */
export async function recordCounts(tenantId: string): Promise<Partial<Record<RecordKind, number>>> {
  const { RECORD_SOURCES } = await import("./record-kinds")
  const out: Partial<Record<RecordKind, number>> = {}
  await Promise.all(
    RECORD_SOURCES.map(async ({ kind }) => {
      const table = tableFor(kind) as unknown as Record<string, never>
      const [row] = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(table as never)
        .where(and(eq(table["tenantId"] as never, tenantId as never), isNull(table["deletedAt"] as never)))
        .catch(() => [{ n: 0 }])
      out[kind] = row.n
    }),
  )
  return out
}
