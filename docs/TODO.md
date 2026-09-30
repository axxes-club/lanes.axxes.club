# Approved expansion follow-up

Release 1 customization foundation is implemented. See [STATE](./STATE.md) for shipped scope and [approved design](./superpowers/specs/2026-09-30-lanes-product-expansion-design.md) for releases 2–5.

- [ ] Import preview, mapping, resumable jobs and source provenance for Monday/Jira/Trello and CSV.
- [ ] Deeper AXXES app links and integration relationships.
- [ ] Expanded customization, advanced views and automation.
- [ ] Authenticated two-user and touch end-to-end tests against an isolated deployed environment.

The historical backlog below may contain obsolete status; current release status is authoritative in STATE.md.

# TODO

The ordered backlog. Written to be picked up cold.

**Before anything else:** `git add -A && git commit`. About 1,700 lines exist
only on this machine, there is no remote for this repo, and Vercel is refusing
deploys. That commit is the first task, not a formality.

---

## 0. Safety

- [ ] **Commit the 25 uncommitted changes.** No remote exists. If this disk
      dies, the search, insights, templates and command-palette work is gone.
      *(done: the `projects.settings` type fix is included — it is required for
      the build to pass at all)*

---

## 1. Unblock deploys

- [ ] Wait for / raise the Vercel deployment limit.
- [ ] First deploy after it clears: **`tsc --noEmit` before `vercel --prod`**.
      The uncommitted code has never been through a real build.
- [ ] Verify the four `lanes-platform` tables are present in production
      (`board_stars`, `saved_views`, `card_links`, `dismissed_tips`). They are
      live in the database this project points at now, but confirm the
      production project points at that same database.
- [ ] `scripts/migrate.sql` is idempotent, so re-running it in production is
      safe. Do it anyway, deliberately.

---

## 2. Wire up finished logic — the highest-value work

Five modules of complete, tested-by-reading logic that **no page can reach**.
Each is a screen, not a system. Roughly in order of what a team needs first.

### 2a. Board roles and members — `roles.ts`, `permissions.ts`

- [ ] `/dashboard/b/[id]/settings/members` — list members, change their role
- [ ] Invite by email, accept-invite flow
- [ ] Remove a member; prevent removing the last owner
- [ ] Role picker, driven by `BOARD_ROLES`
- [ ] **Every** mutation behind a `permissions.ts` check — not an inline
      ownership test
- [ ] Empty-state copy: right now `board_member_roles` has 0 rows, so the role
      matrix has never run against real data. Test it properly, including the
      two surprising rules (stakeholder can comment; only PO/SM can commit).

### 2b. Sprints — `sprints.ts`

- [ ] Sprint panel on the board: current, planned, completed
- [ ] Create / edit / complete a sprint
- [ ] Drag cards into and out of the sprint's scope
- [ ] Commit a sprint (PO/SM only) — sets a commitment number
- [ ] Burndown from real card history
- [ ] Backlog grooming view

### 2c. Planning poker — `poker.ts`

- [ ] Start a round on a card, deck + mode (fibonacci, T-shirt)
- [ ] Everyone votes blind
- [ ] Reveal, then accept / average / consensus
- [ ] Writes the estimate back onto the card
- [ ] Facilitator controls (skip, end round)

### 2d. Insights — `insights.ts`

- [ ] `/dashboard/insights` — throughput per week, lead time
- [ ] Date-range selector
- [ ] **No CFD.** See [ARCHITECTURE.md](./ARCHITECTURE.md#Insights) for why.
- [ ] Every number links to the cards that produced it. A metric you cannot
      click through to is a number nobody trusts.

### 2e. Command palette and search — `commands.ts`, `search.ts`

- [ ] Mount `command-palette.tsx` (written, not mounted) on `⌘K` / `Ctrl-K`
- [ ] `/dashboard/search` page sharing the same function
- [ ] `/api/v1/search` — the endpoint the code already documents
- [ ] Both must use the **same** `search.ts` call, so ranking cannot drift

---

## 3. The rest of the UI

- [ ] `new-board.tsx` — template picker wired to `templates.ts`. Currently
      unwired; this is the only template consumer.
- [ ] `product-switcher.tsx`, `avatar.tsx`, `icons.tsx` — unwired, integrate
- [ ] Card detail: comments, checklists, members, due dates, custom fields
- [ ] Custom fields UI (`custom_fields` table is live and empty)
- [ ] Integrations UI (`integrations`, `card_integrations` — live, empty)
- [ ] Webhooks UI + delivery log (`webhooks` — live, empty)
- [ ] Audit log viewer (`audit_log` — live, empty, and the table nothing
      currently writes to)
- [ ] Board templates gallery — browse and duplicate a template board

---

## 4. Search, before it hurts

`search.ts` is `ILIKE` substring matching. That cannot use a B-tree index and
will fall over somewhere around a few thousand cards.

- [ ] Postgres `tsvector` + GIN on `project_cards` (title, description, key)
- [ ] `websearch_to_tsquery` and `ts_rank` for ordering
- [ ] `pg_trgm` + GIN for typo tolerance — keep the prefix rule from
      [ARCHITECTURE.md](./ARCHITECTURE.md#Search) so "onb" still finds
      "onboarding"
- [ ] Headline generation for snippets
- [ ] **Keep the ranking explainable.** Match the current three rules so results
      do not reorder for people mid-demo.

---

## 5. API surface

The public API is two routes. Everything else is internal.

- [ ] `/api/v1/boards` — list
- [ ] `/api/v1/boards` — create
- [ ] `/api/v1/cards/[id]` — read, update, delete
- [ ] `/api/v1/boards/[id]/members` — manage roles over HTTP
- [ ] `/api/v1/sprints`, `/api/v1/search`
- [ ] Rate limiting on the token path
- [ ] Publish the reference on `developer.axxes.club` once there is something
      to publish (its DNS still needs an `A` record → `76.76.21.21`)

---

## 6. Product gaps worth naming

- [ ] **Offline / optimistic moves.** Dragging a card that then snaps back on a
      flaky connection is the fastest way to make a board tool feel cheap.
- [ ] **Card history.** `project_activity` exists; nobody can read it.
- [ ] **Board templates shared across a workspace** — currently per-user.
- [ ] **Mobile.** A delivery tool people check on a phone needs a real answer
      here. Drag-and-drop is the whole product; it has to work by touch or
      mobile is a checkbox, not a feature.
- [x] **Bulk edit** — visible selection, atomic list/assignee/due-date/priority/archive actions.
