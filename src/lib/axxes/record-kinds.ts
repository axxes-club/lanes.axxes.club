/**
 * The registry of linkable AXXES records.
 *
 * This file is deliberately free of any database import. It is read by the
 * card panel's picker, which is a client component, and a client component
 * cannot import a module that reaches for the database — the bundler refuses,
 * and rightly so.
 *
 * The split is: this file says *what kinds exist and where they live*; the
 * server-only module next door says *how to read one*. Adding a record type
 * to the suite is one entry here and one `case` there.
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

export function recordSource(kind: string): RecordSource | undefined {
  return RECORD_SOURCES.find((r) => r.kind === kind)
}

/** The registry, flattened to what the picker needs to render a pill. */
export const RECORD_KIND_PILLS = RECORD_SOURCES.map((r) => ({ kind: r.kind, product: r.product, noun: r.noun }))
