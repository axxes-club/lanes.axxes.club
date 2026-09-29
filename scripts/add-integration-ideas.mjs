/**
 * Add the cross-product integration ideas to the AXXES Backlog board.
 *
 * These came out of a review of what Vibez could do with the rest of the
 * suite once it had real per-event settings. They are ideas, not commitments,
 * so they go in Backlog to be pulled rather than into a sprint.
 *
 * Each card states what it depends on and — where it matters — what is already
 * true, because several of these turn out to be much cheaper than they look and
 * the reason is worth writing down before somebody estimates them at a week.
 *
 * Idempotent, and it has a --dry-run, because writing to the board is not
 * something to be able to do twice by accident.
 *
 * Usage: node scripts/add-integration-ideas.mjs [--dry-run]
 */

import { readFileSync } from "node:fs"
import { neon } from "@neondatabase/serverless"

const DRY = process.argv.includes("--dry-run")

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const url = raw.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/^["']|["']$/g, "")
if (!url) throw new Error("DATABASE_URL not found in .env.local")

const sql = neon(url)

const [board] = await sql`SELECT id, name FROM projects WHERE name = 'AXXES Backlog' LIMIT 1`
if (!board) throw new Error("No 'AXXES Backlog' board found")

const [list] = await sql`
  SELECT id, name FROM project_lists
  WHERE project_id = ${board.id} AND name = 'Backlog' AND deleted_at IS NULL
  LIMIT 1`
if (!list) throw new Error("No 'Backlog' list on that board")


const CARDS = [
  {
    title: "Vibez: put the ticket's own QR on the Apple Wallet pass — removes the most common failure at the door",
    priority: "high",
    description: [
      "The single best answer to 'nobody can work out the sticker'.",
      "",
      "ALREADY TRUE: the pass is already built and already carries a QR, VibezSpot",
      "exists, spotUrl() builds the right URL, and accessMode 'ticket_or_qr' means",
      "a ticket alone already grants feed access. So this is mostly 'put a second",
      "QR on a pass we already issue'.",
      "",
      "WATCH OUT: a pkpass is signed at issue and cached by the wallet. Regenerating",
      "it when the organizer adds a spot does not reach phones that already cached",
      "one — there is no push. Decide up front whether the pass carries a stable",
      "per-event token (a new column) or the live spot list.",
    ].join("\n"),
  },
  {
    title: "Vibez: surface the night's photos on the event page after it ends",
    priority: "high",
    description: [
      "Cheapest win on this list, and the one that makes the feed feel permanent",
      "instead of ephemeral.",
      "",
      "ALREADY TRUE: every Vibez photo is written to the shared `assets` table, so",
      "the data is already where the rest of the suite reads from. No sync job, no",
      "migration, nothing to copy.",
      "",
      "What is missing is a surface: a 'from tonight' block on /e/[slug] once the",
      "event has ended, backed by a real query against VibezPost.",
      "",
      "Size: mostly a page, not a system.",
    ].join("\n"),
  },
  {
    title: "Vibez: an after-the-event digest — '124 photos, here are yours'",
    priority: "high",
    description: [
      "The product currently evaporates at 4am and nobody sees the photos. Worth",
      "more than any feature above.",
      "",
      "ALREADY TRUE, and this is the good part: for a ticketed event we already",
      "know who every ticket belongs to. VibezAccess matches attendees by order",
      "email precisely so guest checkout is not second class — which means 'the",
      "photos belonging to this person' is a join we can already write, with no",
      "new identity work at all.",
      "",
      "Needs a Resend template, a scheduled send after the event, and a landing",
      "page showing one attendee's photos. All three are ordinary.",
      "",
      "CHECK FIRST: /api/cron/vibez-purge deletes files 24h after a post is",
      "removed. Confirm it cannot eat a digest's photos.",
    ].join("\n"),
  },
  {
    title: "Vibez: booth mode — one iPad at the bar, photos post themselves",
    priority: "medium",
    description: [
      "The most common friction at an actual photobooth is that every guest has to",
      "join, name themselves and upload. In booth mode nobody does: the device is",
      "in the room and already trusted.",
      "",
      "Needs a server-side kiosk token — signed, event-scoped, held by the device,",
      "distinct from the per-person guest token — so posts can still be attributed",
      "(typed name) and still moderated.",
      "",
      "Real work; scope it on its own. It is also the feature that most directly",
      "justifies the watermark: a booth photo with no name on it is a photo nobody",
      "can attribute, and an organizer's mark is what makes it theirs.",
    ].join("\n"),
  },
  {
    title: "Vibez: the door scanner may already mint feed access for free",
    priority: "medium",
    description: [
      "Worth 30 minutes to check before writing anything.",
      "",
      "The scanner already validates tickets at the door, and ticket holders can",
      "already reach the feed by account or by order email. So 'they scanned at",
      "the door, then opened the feed' may work today.",
      "",
      "If it does not, the fix is small: have the scanner mint the Vibez guest",
      "cookie at check-in, so one scan does entry AND feed access.",
      "",
      "Cheapest item here. Verify before estimating it.",
    ].join("\n"),
  },
  {
    title: "Vibez: flag a post when the photographer is on the lineup",
    priority: "low",
    description: [
      "'Also playing tonight' on a photo taken by one of the artists.",
      "",
      "HONEST CAVEAT, and the reason this is low: it depends on matching a",
      "guest's self-typed display name against a lineup name. That is string",
      "matching on something people type at 2am into a phone. It will misfire on",
      "stage names, and it will occasionally crown the wrong person.",
      "",
      "If it is done at all, anchor it to the door: staff check a lineup act in,",
      "that yields a verified identity, and VibezPost.authorSubject can then match",
      "on something trustworthy rather than a nickname.",
      "",
      "Do not build the fuzzy version.",
    ].join("\n"),
  },
]

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
