/**
 * Add the VIBEZ follow-up cards to the AXXES Backlog board.
 *
 * Written as a one-off rather than pushed through the REST API because the API
 * needs a bearer token standing in for a person, and the only way to get one
 * here is to mint it — which would put a live credential on this laptop for no
 * reason. The board and these tables are the same database either way.
 *
 * What it follows from: afters PR #83 shipped the data model, the filter and
 * watermark engines and the API. What is left is the part a human can see, and
 * the things that should be verified against a real database rather than
 * asserted in a pull request.
 *
 * Idempotent: re-running finds cards by title and skips them, because a script
 * that duplicates work on every run is worse than no script.
 *
 * Usage: node scripts/add-vibez-cards.mjs [--dry-run]
 */

import { readFileSync } from "node:fs"
import { neon } from "@neondatabase/serverless"

const DRY = process.argv.includes("--dry-run")

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const url = raw.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/^["']|["']$/g, "")
if (!url) throw new Error("DATABASE_URL not found in .env.local")

const sql = neon(url)

/** The board, found by name rather than hardcoded — a hardcoded uuid would
 *  silently start creating cards on whatever board inherited it. */
const [board] = await sql`SELECT id, name FROM projects WHERE name = 'AXXES Backlog' LIMIT 1`
if (!board) throw new Error("No 'AXXES Backlog' board found")

const [list] = await sql`
  SELECT id, name FROM project_lists
  WHERE project_id = ${board.id} AND name = 'Backlog' AND deleted_at IS NULL
  LIMIT 1`
if (!list) throw new Error("No 'Backlog' list on that board")

const CARDS = [
  {
    title: "Vibez: the settings screen — nothing in PR #83 is visible to an organizer yet",
    priority: "urgent",
    description: [
      "PR axxes-club/afters#83 shipped the model, the engines and the API. There is",
      "no UI: an organizer cannot turn on a watermark, pick a filter or choose an",
      "access mode yet.",
      "",
      "Wire event-editor/[eventId]/vibez to GET/PATCH",
      "/api/events/[eventId]/vibez/settings, covering every column on",
      "VibezSettings: access mode, geofence, filter, watermark, moderation,",
      "limits, TV wall.",
      "",
      "The camera already takes a `settings` prop and the feed API already returns",
      "`publicSettings()`, so this is mostly presentation — plus the one real gap:",
      "the watermark upload control (SVG or PNG, constrained to our own storage).",
    ].join("\n"),
  },
  {
    title: "Vibez: TV wall page and the QR print sheet",
    priority: "high",
    description: [
      "VibezSpot, its scan counts and the join QR all exist. There is no wall to",
      "put on a screen and no sheet to print.",
      "",
      "- /e/[slug]/vibez/wall — the wallLayout grid/single renderer, polling the",
      "  feed, showing the join QR when wallShowQr is on.",
      "- A print sheet of every spot's QR, labelled, sized for a sticker.",
      "",
      "This is the whole 'photobooth in a room' pitch from vibez.axxes.club and it",
      "is currently just a database table.",
    ].join("\n"),
  },
]
CARDS.push(
  {
    title: "Vibez: rehearse migration 20260929140000 against a real Postgres",
    priority: "urgent",
    description: [
      "The Vibez migration has NOT been run. It was written and reviewed statically",
      "but never executed — no Postgres or Docker on the machine it was authored on.",
      "",
      "MIGRATION.md says why this matters: the Vercel build runs",
      "`prisma migrate deploy`, so if this migration is wrong it fails the build and",
      "deploys nothing. That is the safe direction, but it means the feed is broken",
      "until somebody runs it somewhere real.",
      "",
      "Rehearse it twice in a row against a real Postgres, in both shapes:",
      "  1. a database built purely from migrations (VibezPost arrives empty)",
      "  2. the production shape, where VibezPost already exists from `db push`",
      "",
      "It assumes gen_random_uuid() is available (pgcrypto, built in from PG13).",
    ].join("\n"),
  },
  {
    title: "Vibez: the TV screen is the integration — test it in a real room",
    priority: "medium",
    description: [
      "The access model is sound on paper and untested on a phone in a basement.",
      "",
      "Before this goes in front of an organizer, stand up a real event and check:",
      "- a guest who bought a ticket as a guest (no account) can get in and post",
      "- a scanned QR grants a browser-only session, and expires between events",
      "- the geofence does not turn away people standing on the pin indoors (the",
      "  55m tolerance exists for exactly this)",
      "- the watermark is in the uploaded bytes, not just on screen",
      "- all eight filters render acceptably on an iPhone SE",
    ].join("\n"),
  }
)

/** Next free seq, so keys keep counting up like the rest of the board. */
const [{ m }] = await sql`
  SELECT COALESCE(MAX((custom_fields->>'seq')::int), 0) AS m
  FROM project_cards WHERE project_id = ${board.id}`
let seq = m

// End of list, so new cards land at the bottom rather than jumping the queue.
const [{ p }] = await sql`
  SELECT COALESCE(MAX(position), -1) AS p FROM project_cards
  WHERE list_id = ${list.id} AND deleted_at IS NULL`
let position = p

console.log(`board=${board.name} list=${list.name} starting at seq ${seq + 1}`)
let added = 0
for (const card of CARDS) {
  seq++
  position++
  const existing = await sql`
    SELECT id FROM project_cards
    WHERE project_id = ${board.id} AND title = ${card.title} AND deleted_at IS NULL
    LIMIT 1`
  if (existing.length) {
    console.log(`  ~ already there: ${card.title}`)
    continue
  }
  console.log(`  + AB-${seq} [${card.priority}] ${card.title}`)
  if (DRY) continue
  await sql`
    INSERT INTO project_cards
      (project_id, list_id, title, description, position, priority, custom_fields)
    VALUES
      (${board.id}, ${list.id}, ${card.title}, ${card.description},
       ${position}, ${card.priority}, ${JSON.stringify({ seq })}::jsonb)`
  added++
}

if (DRY) console.log("\ndry run — nothing written")
else console.log(`\nadded ${added} card(s) to ${board.name} / ${list.name}`)

