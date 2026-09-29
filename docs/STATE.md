# State

Verified against the working tree and the live database on the last pass.
Where something is unverified it says so.

## Commits

| SHA | Summary | Deployed |
|-----|---------|----------|
| `29dae5e` | feat: Lanes — Kanban boards for AXXES workspaces | yes |
| `1774bbd` | feat(delivery): the enterprise foundation — roles, permissions, sprints, poker, API | yes |
| `ed238e9` | feat(organizations): let a person switch which organization they are in | yes |

Nothing is deployable beyond `ed238e9` right now — see [Paused](#paused).

## Working tree

**25 uncommitted changes.** This is the important part of this document: a
substantial amount of Lanes exists only on this machine.

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

Exported server logic, and whether any page can reach it.

| Module | Exports | Reachable from a page |
|--------|--------:|----------------------|
| `templates` | 4 | yes — `actions.ts` |
| `commands` | 6 | only via `command-palette.tsx`, which is not mounted |
| `search` | 5 | only via `command-palette.tsx`, which is not mounted |
| `roles` | 5 | **no** |
| `permissions` | 5 | **no** |
| `sprints` | 7 | **no** |
| `poker` | 10 | **no** |
| `insights` | 2 | **no** |

**Five modules of finished logic that a user cannot reach.** This is the single
biggest fact about Lanes: the gap is not missing logic, it is missing screens.

## Routes

Pages:

```
/                              redirect
/sign-in                       AXXES SSO
/no-tenant                      no workspace membership
/dashboard                      board list
/dashboard/b/[id]               the board
/dashboard/my-cards             cards assigned to you
```

API:

```
/api/auth/[...all]                      Better Auth
/api/v1/boards/[id]                     board read/update
/api/v1/boards/[id]/cards               card list and create
```

`search.ts` and `insights.ts` describe a `/api/v1/search` that **does not
exist yet**.

## Data, right now

Live row counts:

| Table | Rows |
|-------|-----:|
| `projects` | 4 |
| `project_cards` | 35 |
| `board_member_roles` | **0** |
| `sprints` | **0** |
| `poker_rounds` | **0** |
| `integrations` | **0** |
| `custom_fields` | **0** |
| `webhooks` | **0** |
| `audit_log` | **0** |

The enterprise tables are **empty**. There are no roles assigned, no sprints,
no integrations, no audit entries. Nobody has used any of that machinery
through the product, because none of it has a screen.

This matters when testing: role behaviour has never been exercised against
real rows. Treat the role matrix as untested.

## Paused

Vercel has stopped accepting deployments. Concretely:

- No new Lanes deploy until the limit resets.
- `lanes.axxes.club` therefore still serves the `ed238e9` build.
- The 1,700 uncommitted lines are **not backed up anywhere** — there is no
  remote for this repo, and no second machine. Commit them locally before
  anything else, or a disk failure loses them.

First action when picking this up:

```
git add -A && git commit -m "..."
```

Nothing on disk is safe yet.