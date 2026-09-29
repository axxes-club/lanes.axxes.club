# Lanes — handoff

**lanes.axxes.club** — Kanban boards for AXXES workspaces.

> **Paused.** Deploys are blocked by a Vercel limit, so nothing below is live
> beyond commit `ed238e9`. This directory is the map for picking it back up.

## Read in this order

| # | File | What it's for |
|---|------|---------------|
| 1 | [`STATE.md`](./STATE.md) | What is built, what is deployed, what is only on disk. Facts, verified. |
| 2 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | The data model and the reasoning behind the decisions that aren't obvious from the code. |
| 3 | [`TODO.md`](./TODO.md) | The ordered backlog. Start here when picking up. |
| 4 | [`DATA-MODEL.md`](./DATA-MODEL.md) | Every table, its status (live / code-only), and the gaps. |
| 5 | [`API.md`](./API.md) | Public and internal HTTP surface. |
| 6 | [`RUNBOOK.md`](./RUNBOOK.md) | Env vars, migrations, deploy and verification steps. |

## The short version

Lanes has a complete **data and logic layer** and a largely **absent UI layer**.

Roughly 30 exported functions across `src/lib/lanes/` implement roles,
permissions, sprints, poker planning, templates, search, insights and API
tokens. Of those, **five are wired to a page and five are not reachable at
all from any route**. The product is currently a backend with a board view
bolted on.

That is the whole of it. The rest of this directory exists so the next person
does not have to re-derive which half is done.

## Ground rules this codebase follows

These are not aspirations; they are enforced by the code and are the reason
several things are shaped the way they are.

1. **One permission table, consulted everywhere.** `permissions.ts` is the only
   answer to "can this person do this?". The board, the card panel, the API and
   webhooks all call it, so two screens cannot disagree.
2. **A preference belongs to the person, not the board.** Stars, saved views,
   collapsed lanes and dismissed tips live on a per-user row. Putting them on
   the board row means one person's settings change everybody's board.
3. **Authorization is re-derived server-side, every time.** Nothing trusts a
   cookie or a client claim for a permission decision.
4. **A number shown to a team must be one they can act on.** This is why
   `insights.ts` ships throughput and lead time and deliberately does *not*
   ship CFD-derived "cycle time", which is routinely computed wrong.
5. **Idempotent migrations.** `scripts/migrate.sql` can be re-run against a
   database that already has the shared AXXES schema without touching
   anything else.