/**
 * Repair cards that have no sequence number.
 *
 * A card's key is `<prefix>-<seq>`, and `seq` lives in the card's
 * `custom_fields` jsonb. A card without one renders as the same key as every
 * other card on that board that also lacks one — several all showing as
 * "AB-00". A key that silently addresses the wrong card is worse than having
 * no key at all, so this is worth running whenever a board is found to have
 * duplicate keys.
 *
 * The UPDATE lives in `migrate.sql` and is idempotent. This script applies it
 * and then reports what it found, because "82 rows repaired" is only useful
 * if you also know whether 0 is a stable number.
 *
 * Usage:  node scripts/fix-card-keys.mjs
 */
import { readFileSync } from "node:fs"
import { neon } from "@neondatabase/serverless"

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const url = raw.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/^["']|["']$/g, "")
if (!url) throw new Error("DATABASE_URL not found in .env.local")

const sql = neon(url)
const count = async (where) => (await sql.query(`select count(*)::int c from project_cards where ${where}`, []))[0].c

const missingBefore = await count("not (coalesce(custom_fields,'{}'::jsonb) ? 'seq')")
const dupesBefore = await count("deleted_at is null") // real check below
const dupGroups = await sql.query(
  `select project_id, custom_fields->>'seq' seq, count(*) c
     from project_cards where deleted_at is null
    group by 1,2 having count(*) > 1`, [])

console.log(`cards without a sequence: ${missingBefore}`)
console.log(`boards with duplicate keys: ${dupGroups.length}`)

if (missingBefore === 0 && dupGroups.length === 0) {
  console.log("Nothing to repair.")
  process.exit(0)
}

const ddl = readFileSync(new URL("./migrate.sql", import.meta.url), "utf8")
const statements = ddl
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  try {
    await sql.query(statement, [])
  } catch (e) {
    // The CREATE TABLE statements are for a database that has not had the
    // platform migration applied; their failure here is not the repair failing.
    if (!statement.startsWith("create")) console.error("  !", e.message)
  }
}

const missingAfter = await count("not (coalesce(custom_fields,'{}'::jsonb) ? 'seq')")
const dupAfter = await sql.query(
  `select count(*)::int c from (
     select project_id, custom_fields->>'seq' from project_cards
      where deleted_at is null group by 1,2 having count(*) > 1) x`, [])

console.log(`\nafter: ${missingAfter} without a sequence, ${dupAfter[0].c} with duplicate keys`)
if (missingAfter !== 0 || dupAfter[0].c !== 0) {
  console.error("Repair incomplete — do not ship until this reads zero.")
  process.exit(1)
}
console.log("Repaired.")
