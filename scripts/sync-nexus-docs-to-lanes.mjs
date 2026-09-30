/**
 * Reflect the Nexus documentation work on the AXXES Backlog board.
 *
 * Idempotent: cards are matched on title within the board, so a re-run updates
 * rather than duplicating. Run without --write to preview.
 *
 *   node scripts/sync-nexus-docs-to-lanes.mjs [--write]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const url =
  process.env.DATABASE_URL ||
  readFileSync(join(HERE, "..", ".env.local"), "utf8").match(
    /^DATABASE_URL="?([^"\n]+)/m
  )?.[1];
if (!url) {
  console.error("No DATABASE_URL");
  process.exit(1);
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(url);

const WRITE = process.argv.includes("--write");
const BOARD = "38acb6b3-80ea-46db-b261-b5ecdd57ed40"; // AXXES Backlog
const AUTHOR = "W0xvN8Pdz9gzggTUh38twcaLuAY4R3nP";

const CARDS = [
  {
    list: "Done",
    priority: "medium",
    labels: ["Product"],
    title: "Nexus: AXXES company space — catalog, brand and engineering notes",
    description: `DONE. Eight pages live in the AXXES CLUB tenant of Nexus.

  https://nexus.axxes.club/dashboard/s/52797544-3a08-4469-b770-a59d54d8f996

WHAT IS THERE
  AXXES              the "everything reconciles" position, and the
                     one-account / one-database / one-ledger structure
  The AXXES catalog  all 15 products, grouped by family, with keys
  Events             afters.am, Vibez, Rooms
  Commerce           Stock, Krates, Tollbooth
  Developers         AXXES for Builders, AXXES Developers, Keel
  Work               Lanes, Folders, Nexus, Pulse, Vitrine
  Brand and messaging  the five rules, naming policy, consumer vs B2E
  Engineering notes  decisions that are expensive to undo

THE IMPORTANT BIT
The catalog page is GENERATED from members.axxes.club/db/axxes-products.sql,
not written by hand. That file is already the single source of truth, so a
product added there appears in the docs, and a rename cannot leave a stale
page behind.

  node scripts/seed-axxes-docs.mjs --write   # regenerate

Verified: re-running reports "0 created, 0 updated, 8 unchanged". The 23
pre-existing pages in other tenants were left untouched.

Written by seed-axxes-docs.mjs; see nexus PR #2.`,
  },
  {
    list: "In review",
    priority: "medium",
    labels: ["Product", "Engineering"],
    title: "nexus #2: seed script that generates the AXXES company space",
    description: `REVIEW. Adds scripts/seed-axxes-docs.mjs (705 lines, one file, no
app changes).

  https://github.com/axxes-club/nexus.axxes.club/pull/2

The content is already in the database, so this is not blocking anything.
It is the generator that produced it, so the docs survive a catalog change.

WORTH A LOOKER'S EYE BECAUSE OF THE GUARDS
The script fails closed in three places, and each one covers a failure that
is otherwise silent:

  1. Refuses to write if the catalog parse yields zero products. A malformed
     seed file is the most likely way to run this, and the alternative was a
     silently emptied company space.
  2. Errors on any [[wiki link]] with no matching page. Nexus renders those
     as "create this page", so a typo becomes a dead link that looks
     deliberate. This caught a real one: [[afters.am]] was linking to a page
     that does not exist.
  3. Rebuilds nexus_links after writing. The editor does this on every save;
     writing straight to the table skips it, which would have left the pages
     unlinked and the graph empty.

Pages are matched on title, so a re-run edits in place, and the previous
content is snapshotted to nexus_page_versions before any overwrite.

Note: this branch was rebased onto main. The Bayamon importer is already
merged there via #1, so the PR contains only the doc script.`,
  },
  {
    list: "Ready",
    priority: "medium",
    labels: ["Product"],
    title: "Decide what happens to the standalone AXXES-BRAND.md now that Nexus has it",
    description: `The Nexus company space supersedes /Users/admin/Developer/AXXES-BRAND.md,
which is untracked and lives outside every repo.

The content is not lost — the brand rules, naming policy and the
everything-reconciles positioning are all in the Brand and messaging page.
But the file is still on disk with no remote, which is the exact failure the
Nexus work was meant to remove.

Three options, roughly in order of preference:
  1. Delete it and treat Nexus as the one home for company documentation.
  2. Move it into a tracked repo (afters or a new docs repo) and have Nexus
     link to it rather than restate it.
  3. Leave it. Not recommended — it will drift, and nobody will notice until
     the drift matters.

Decision needed because two copies of the brand rules is one more than there
should be.`,
  },
  {
    list: "Ready",
    priority: "medium",
    labels: ["Engineering"],
    title: "Run the seed script in CI so the AXXES docs cannot silently go stale",
    description: `seed-axxes-docs.mjs defaults to a dry run and prints a content digest
(66a3cee1bb67 at the time of writing). Nothing currently fails when the
digest changes.

The failure mode this prevents: someone adds a product to
members.axxes.club/db/axxes-products.sql, nobody runs the seed, and the
knowledge base quietly stops describing the company accurately. That is the
same class of bug as the dead product links already found in Handshake and
Lanes — documentation that disagrees with the database.

Suggested: a check that runs the script in dry-run mode and fails when the
digest differs from a committed value. Cheap, and it needs no database
credentials.`,
  },
];

async function main() {
  const board = await sql`
    select id::text, name, slug from projects where id = ${BOARD}
  `;
  if (!board.length) {
    console.error("AXXES Backlog board not found");
    process.exit(1);
  }
  console.log(`Board: ${board[0].name} (${board[0].slug})\n`);

  const lists = await sql`
    select id::text, name from project_lists
    where project_id = ${BOARD} and deleted_at is null
  `;
  const listByName = new Map(lists.map((l) => [l.name, l.id]));

  // Labels are duplicated across orgs, so pick the most-used one per name.
  const labelRows = await sql`select id::text, name from project_labels`;
  const usage = await sql`
    select label_id::text, count(*)::int n from project_card_labels group by label_id
  `;
  const useCount = new Map(usage.map((u) => [u.label_id, u.n]));
  const labelByName = new Map();
  for (const l of labelRows) {
    const cur = labelByName.get(l.name);
    if (!cur || (useCount.get(l.id) || 0) > (useCount.get(cur.id) || 0)) {
      labelByName.set(l.name, l);
    }
  }

  const existing = await sql`
    select id::text, title, list_id, description, priority, custom_fields
    from project_cards
    where project_id = ${BOARD} and deleted_at is null
  `;
  const byTitle = new Map(existing.map((c) => [c.title, c]));
  const nextSeq =
    Math.max(0, ...existing.map((c) => Number(c.custom_fields?.seq) || 0)) + 1;

  for (const [i, card] of CARDS.entries()) {
    const listId = listByName.get(card.list);
    if (!listId) {
      console.error(`No list named "${card.list}"`);
      process.exit(1);
    }
    const prior = byTitle.get(card.title);
    const seq = prior?.custom_fields?.seq ?? nextSeq + i;
    console.log(
      `${(prior ? "update" : "create").padEnd(7)} [${card.list}] ${card.title}`
    );

    if (!WRITE) continue;

    // Preserve any other custom_fields already on the card; only set seq.
    const custom = { ...(prior?.custom_fields ?? {}), seq };

    if (prior) {
      await sql`
        update project_cards
           set description = ${card.description},
               priority = ${card.priority},
               list_id = ${listId},
               custom_fields = ${custom},
               updated_at = now()
         where id = ${prior.id}
      `;
      continue;
    }

    const pos = await sql`
      select coalesce(max(position), -1) + 1 as pos
      from project_cards where list_id = ${listId} and deleted_at is null
    `;
    const rows = await sql`
      insert into project_cards
        (project_id, list_id, title, description, position, priority,
         custom_fields, created_by_id)
      values (
        ${BOARD}, ${listId}, ${card.title}, ${card.description},
        ${pos[0].pos}, ${card.priority}, ${custom}, ${AUTHOR}
      )
      returning id::text
    `;

    for (const name of card.labels) {
      const label = labelByName.get(name);
      if (!label) {
        console.error(`  ! unknown label "${name}"`);
        continue;
      }
      await sql`
        insert into project_card_labels (card_id, label_id)
        values (${rows[0].id}, ${label.id})
        on conflict do nothing
      `;
    }
  }

  console.log(WRITE ? "\nDone." : "\nDry run. Pass --write to apply.");
}

main().catch((e) => {
  console.error("Failed:", e?.message ?? e);
  process.exit(1);
});
