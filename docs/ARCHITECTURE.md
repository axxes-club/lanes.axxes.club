# Architecture

The parts of Lanes that are not obvious from reading the code, and the reasons
behind them. Where a decision looks wrong it probably looks wrong on purpose —
the reasoning is here so it does not get "fixed" by accident.

## The shape

```
src/lib/lanes/
  roles.ts          the role vocabulary + workspace rank
  permissions.ts    the single permission table
  board-access.ts   the one way to ask "may this person touch this board?"
  prefix.ts         card keys (ABC-12)
  sprints.ts        sprint lifecycle
  poker.ts          planning poker
  templates.ts      the board template registry
  search.ts         one ranked search, three surfaces
  insights.ts       delivery analytics
  commands.ts       the command palette
  api-tokens.ts     personal API tokens
  api-auth.ts       token → principal
  errors.ts         typed user-facing errors
  data.ts           reads
  actions.ts        server actions (writes)
```

`data.ts` reads, `actions.ts` writes. Nothing else writes to the database. If
you find yourself adding a query to a page, that is the convention being
broken.

## Roles

Eight board roles:

```
owner  product_owner  scrum_master  developer  designer  qa  stakeholder  viewer
```

`roles.ts` also holds `workspaceRoleRank`, which is the escape hatch: a
workspace owner or admin can always act on any board, so nobody can lock
themselves out of a board they own.

## Permissions

One flat table of ~30 identifiers in `permissions.ts`, grouped by subject:

```
board.read  board.update  board.delete  board.settings  board.members
sprint.read  sprint.manage  sprint.commit  sprint.complete
poker.read  poker.facilitate
backlog.read  backlog.write  backlog.groom
card.read  card.create  card.update  card.move  card.delete
card.assign  card.priority  card.estimate  card.comment  card.link  card.verify
customField.manage  integration.manage  webhook.manage
token.manage  audit.read  export.read
```

**Every permission check in the product must go through this file.** The board
view, the card panel, `/api/v1/*` and webhook delivery all consult it, so two
screens can never disagree about the same person. A permission checked inline
with `if (userId === ownerId)` is a bug waiting to happen.

Two entries in the matrix are deliberate and surprising:

- **A stakeholder can comment but cannot change a card.** Review is most of
  what stakeholders are there for. Blocking comments turns them into a
  mailing list.
- **Only a product owner or scrum master may commit a card to a sprint.** If a
  developer could self-commit, the sprint fills with whatever people felt like
  doing and the commitment means nothing.

Both will look wrong to someone the first time they hit them. They are
intentional.

## Per-user state vs shared state

`lanes-platform.ts` adds four tables, and the split is the entire point of
that file:

**Belongs to the person** — one person's settings must never change somebody
else's board:

- `board_stars` — starred boards
- `saved_views` — saved filters and groupings
- `dismissed_tips` — which onboarding tips have been seen

**Belongs to the work** — a shared fact about the board:

- `card_links` — links between cards

The failure mode this avoids is the most common way a collaborative tool loses
trust: one person collapses a lane or dismisses a tip, and it changes for
everybody.

`lane_collapse` appears in some earlier notes as a table name. It is **not** a
table; collapsed lanes live in `saved_views` as a per-user view setting. There
is no `lane_collapse` table and there should not be one — a collapsed lane is a
preference.

## Templates

`templates.ts` is the one place that knows what a "sprint board" or "bug
tracker" is made of. Eight templates, each carrying lists, labels, a card tint
and suggested checklists.

Adding a template is a **data change, not a deploy**. The old inline list
defaults in `actions.ts` were removed specifically so the two could not drift.

Templates write into `projects.settings`:

| Key | Meaning |
|-----|---------|
| `template` | which template this board came from |
| `cardColor` | tint applied to every card |
| `keyPrefix` | the board's card-key prefix |
| `enableDueDates` … | per-capability toggles |

**These keys must be declared in the `$type<…>()` on `projects.settings`.** That
is what caught the build error described in [STATE.md](./STATE.md). A JSONB
column's TypeScript type is the schema; a library that writes a new key without
changing the type breaks the build.

## Search

`search.ts` is one function powering three surfaces — the command palette, a
search page, and `/api/v1/search` — so a result found in one is reachable in
all of them and the ranking cannot drift between them.

The ranking is simple and explainable on purpose:

## Insights

`insights.ts` follows one rule: **a number shown to a team has to be one they
can act on.**

Shipped:

- **throughput** — cards completed per week. Did we get faster?
- **lead time** — created → done, for work finished in the window

Deliberately not shipped: cumulative flow diagrams, and any "cycle time"
derived from them. They look authoritative, they are routinely computed wrong,
and a delivery lead who trusts a wrong number stops trusting the whole tool.

## Card keys

`prefix.ts` generates human-quotable keys (`ABC-12`). The key is stable, the
number is sequential per board, and the prefix comes from the board name. These
show up in commit messages, chat and search results — which is the entire point
of having them, and the reason the prefix is stored per board rather than
per card.

## Multi-tenancy

Every tenant-scoped table has a `tenant_id` with an index, and the context is
resolved per request by `requireContext()` in `actions.ts`. A request without a
workspace lands on `/no-tenant` rather than being treated as belonging to some
default.

**Never** fall back to a default tenant on a miss. Returning a wrong tenant's
data is far worse than returning nothing.

## Organization switching

Deployed across Lanes, Nexus and developer.axxes.club. The selection cookie is a
**preference, never authorization** — it is revalidated against live membership
on every use, and a forged or stale cookie falls back safely rather than
granting anything.


1. a key or title **prefix** beats a substring match
2. a **title** match beats a description match
3. **newer** work beats older work at equal relevance

Someone who types "onb" and gets "Website onboarding" has to be able to
predict the rest of the list. That rules out anything clever, and clever is the
wrong trade for a search box people use a dozen times a day.

**Known limitation:** it is built on `ILIKE`. Substring matching cannot use a
normal B-tree index, so it will not scale past a few thousand cards. This is
fine for now and must not be fine later. See [`TODO.md`](./TODO.md).
