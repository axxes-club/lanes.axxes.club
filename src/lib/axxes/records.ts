import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import "server-only"
import { db, schema as s } from "@/lib/db"

/**
 * Cross-product records.
 *
 * Because every AXXES app reads the same Postgres database, a card in Lanes
 * can point at a real customer, a real stock item or a real order without an
 * integration, an OAuth dance or a sync job. The link is a foreign key into
 * a sibling app's table; the row is the same row that app is looking at.
 *
 * The registry below is the only place that knows which tables are safe to
 * read and which column is the human label. Everything else — the picker, the
 * card panel, the command palette — is driven from it, so adding a record
 * type to the suite is one entry.
 *
 * Two rules protect the rest of the suite:
 *
 *   1. Every query is scoped to the tenant, always. A board in one workspace
 *      can never surface a record from another, even by guessing an id.
 *   2. Only tables that are safe to read cross-product are listed. Anything
 *      holding a secret or a payment instrument does not belong here.
 */

export type RecordKind = "contact" | "order" | "event" | "product" | "venue" | "supplier"

export type RecordSource = {
  kind: RecordKind
  /** Product name, shown next to the record. */
  product: string
  /** The record's own URL in the app that owns it. */
  href: (id: string) => string
  /** Columns that make up the human label, in order. */
  label: string[]
  /** Extra columns worth showing in a picker or a card panel. */
  fields: string[]
  /** A noun, for "Link a contact". */
  noun: string
}

export const RECORD_SOURCES: RecordSource[] = [
  { kind: "contact", product: "Members", noun: "contact", href: (id) => `https://members.axxes.club/c/${id}`, label: ["first_name", "last_name"], fields: ["email", "company"] },
  { kind: "order", product: "Ledger", noun: "order", href: (id) => `https://ledger.axxes.club/orders/${id}`, label: ["order_number"], fields: ["status", "total"] },
  { kind: "event", product: "Signal", noun: "event", href: (id) => `https://signal.axxes.club/events/${id}`, label: ["name"], fields: ["starts_at", "status"] },
  { kind: "product", product: "Invn", noun: "product", href: (id) => `https://inventree.axxes.club/product/${id}`, label: ["name"], fields: ["sku", "quantity", "status"] },
  { kind: "venue", product: "Invn", noun: "venue", href: (id) => `https://inventree.axxes.club/venue/${id}`, label: ["name"], fields: ["city", "capacity"] },
  { kind: "supplier", product: "Invn", noun: "supplier", href: (id) => `https://inventree.axxes.club/supplier/${id}`, label: ["name"], fields: ["email", "is_active"] },
]

export function recordSource(kind: RecordKind): RecordSource | undefined {
  return RECORD_SOURCES.find((r) => r.kind === kind)
}

/**
 * The tables behind each kind, kept out of RECORD_SOURCES so that file stays
 * importable from client components (it has no Drizzle or DB dependency).
 */
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

export type LinkedRecord = {
  kind: RecordKind
  product: string
  id: string
  label: string
  href: string
  detail: string | null
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (value instanceof Date) return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    // Order totals and money columns read better with a currency mark, and
    // the rest of the suite formats money the same way.
    return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { style: "currency", currency: "USD" })
  }
  return String(value).replaceAll("_", " ")
}

/** Find records to link. With no query, the ten most recently touched. */
export async function searchRecords(tenantId: string, kind: RecordKind, q = "", limit = 10): Promise<LinkedRecord[]> {
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
    .limit(Math.min(20, Math.max(1, limit)))
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

/** A count per kind, so the link panel can say what there is to link. */
export async function recordCounts(tenantId: string): Promise<Partial<Record<RecordKind, number>>> {
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

