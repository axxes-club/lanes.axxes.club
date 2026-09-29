# State

Verified against the working tree and the live database on the last pass.
Where something is unverified it says so.

## Deployed

**Everything on `main` is live at `lanes.axxes.club`.** The Vercel deployment
block recorded below has cleared; `npx vercel --prod --yes` works and takes the
production alias automatically.

| SHA | Summary |
|-----|---------|
| `29dae5e` | feat: Lanes — Kanban boards for AXXES workspaces |
| `1774bbd` | feat(delivery): roles, permissions, sprints, poker, API |
| `ed238e9` | feat(organizations): switch which organization you are in |
| `e207ebd` | feat(roles): board members, sprint clock, permission-gated board UI |
| `e9af4b4` | feat(poker): planning poker |
| `4c9fe71` | feat(api): the public API, plus two bugs it exposed |
| `8013faa` | docs(api): the developer documentation site |
| `73bb793` | fix(cards): repair rows with no sequence |

## Working tree

**Nothing is uncommitted.** The working tree is clean and everything is
deployed.

### Committed and live

- Board model: projects, lists, cards, checklists, comments, members, labels,
  activity.
- `src/lib/lanes/`: `roles`, `permissions`, `board-access`, `prefix`, `errors`,
  `types`, `api-auth`, `api-tokens`, `data`, `actions`.
- Database tables: `board_member_roles`, `sprints`, `card_sprints`,
  `poker_rounds`, `poker_votes`, `integrations`, `card_integrations`,
  `webhooks`, `audit_log`, `custom_fields`.
- Organization switching (`src/lib/actions/org.ts`), deployed to Lanes, Nexus
  and developer.axxes.club.

### Uncommitted — code only, never deployed

Roughly **1,700 lines** across new server libraries and components.

| File | Lines | What it is |
|------|-------|------------|
| `src/lib/lanes/search.ts` | 265 | One ranked search over boards, cards and people, shared by the command palette, the search page and `/api/v1/search`. |
| `src/lib/lanes/insights.ts` | 266 | Delivery analytics — throughput and lead time, deliberately not CFD. |
| `src/lib/lanes/templates.ts` | 259 | The board template registry: 8 templates, each with lists, labels, card tint and suggested checklists. |
| `src/lib/lanes/commands.ts` | 61 | The command palette's command list. |
| `src/lib/db/schema/lanes-platform.ts` | — | Four new tables: `board_stars`, `saved_views`, `card_links`, `dismissed_tips`. |
| `scripts/migrate.sql` | — | Idempotent DDL for those four tables. **Already applied to the live database.** |

New components, all unwired unless noted: `app-shell` (wired to the dashboard
layout), `theme-toggle` (wired to the root layout), `command-palette`,
`new-board`, `product-switcher`, `avatar`, `icons`.

Also modified: `globals.css`, root `layout.tsx`, `ui.tsx`, `logo.tsx`,
`org-switcher.tsx`, `sign-out.tsx`, `product.config.ts`, `lib/product.ts`.

## Build status

`npx tsc --noEmit` — **0 errors.**

There was one blocking error, now fixed. `createBoard` wrote `cardColor` and
`template` into `projects.settings`, but the `jsonb.$type<…>()` on that column
did not declare them, so TypeScript rejected the insert and **the build could
not pass**. Both are now declared in `src/lib/db/schema/projects.ts`.

The rule: a `$type` on a JSONB column is the schema. If a library starts
writing a new key, the type has to change in the same commit, or the build
stops. The error was only in the uncommitted code, which is why no deploy ever
saw it.

## Wiring audit

Exported server logic, and whether a page can reach it. **All five orphans now
have screens** — this table is the record of that.

| Module | Reachable from |
|--------|----------------|
| `templates` | `/dashboard` gallery, the create dialog, `POST /api/v1/boards` |
| `commands` | the command palette, mounted in the app shell |
| `search` | the palette, `/dashboard/search`, `GET /api/v1/search` |
| `roles` | `/dashboard/b/[id]/settings` |
| `permissions` | the same screen, the board UI, and every API route |
| `sprints` | the board toolbar |
| `poker` | the board card menu → Estimate with poker |
| `insights` | `/dashboard/insights` and the boards home |

## Routes

Pages:

```
/                              marketing
/docs                          developer documentation, 12 pages
/sign-in                       AXXES SSO
/no-tenant                      no workspace membership
/dashboard                      boards home
/dashboard/b/[id]               the board
/dashboard/b/[id]/settings      people and roles
/dashboard/my-cards             cards assigned to you
/dashboard/insights             throughput, lead time, aging
/dashboard/search               workspace search
/dashboard/people               people and their load
/dashboard/apps                 the AXXES suite hub
```

API:

```
/api/auth/[...all]                      Better Auth
/api/v1/boards                          list, create
/api/v1/boards/[id]                     board read/update
/api/v1/boards/[id]/cards               card list and create
/api/v1/cards/[id]                      read, patch, soft delete
/api/v1/search                          ranked search
```

## Data, right now

The four `lanes-platform` tables exist and are in use: `board_stars`,
`saved_views`, `card_links`, `dismissed_tips`.

`board_member_roles` had **0 rows** — the role matrix had never run against
real data because no screen could write to it. That gap is now closed by
`/dashboard/b/[id]/settings`.

`sprints`, `poker_rounds`, `integrations`, `custom_fields`, `webhooks` and
`audit_log` are still empty. Sprints and poker are reachable from the board
now but have not been used in production; integrations, custom fields,
webhooks and the audit viewer have **no screen yet** and are the next thing
worth building.

## Two real bugs, found by running the API

Both are recorded in full in the `4c9fe71` commit message.

1. **API tokens had never worked.** `api_tokens.id` is a `uuid` column and
   `newToken()` generated 18 hex characters. Every insert failed. The table had
   zero rows and the authenticated API was unreachable.
2. **Card keys collided.** 82 cards had no `custom_fields.seq` and rendered as
   the same key. Repaired by `scripts/migrate.sql`; `scripts/fix-card-keys.mjs`
   re-runs it and reports.

The lesson worth keeping: neither showed up in `tsc` or `next build`. Both were
found by minting a token and calling the endpoints.

## Still open

- **No git remote.** Every commit is on this machine only. A disk failure loses
  everything. `git remote add origin …` is the highest-value thing left to do.
- **Integrations, custom fields, webhooks and the audit viewer** have finished
  tables and no screens.
- **The rate limiter is per-instance.** Correct for one, wrong for two. Put a
  shared store behind `rateLimit()` before running more than one.
- **Board templates are not shared across a workspace** and there is no
  template gallery duplication flow.
- **`developer.axxes.club` still needs an A record** → `76.76.21.21`.