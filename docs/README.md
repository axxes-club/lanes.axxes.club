# Lanes — handoff

**lanes.axxes.club** — Kanban boards for AXXES workspaces.

> **Live.** Everything on `main` is deployed at `lanes.axxes.club`. This
> directory is the map for anyone picking it up.

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

Lanes used to be a complete **data and logic layer** with a largely **absent UI
layer**: roughly 30 exported functions across `src/lib/lanes/`, five of which
no route could reach. The product was a backend with a board view bolted on.

**That gap is closed.** Every module has a screen, the public API exists and is
exercised end to end, and the developer documentation ships at `/docs`.

What remains is written down in [`TODO.md`](./TODO.md), not guessed at. The
largest remaining gaps are integrations, custom fields, webhooks and the audit
viewer — all of which have finished tables and no UI yet.

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