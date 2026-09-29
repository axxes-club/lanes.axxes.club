# Data model

Every table Lanes owns, its status, and the gaps. Status was read from the live
database, not from the schema files.

Legend: **live** = the table exists in the database. **empty** = it exists and
has no rows. **code-only** = declared in TypeScript but not in the database.

## Lanes-owned tables

| Table | Status | Rows | Notes |
|-------|--------|-----:|-------|
| `projects` | live | 4 | One row per board. `settings` is JSONB; keys are typed — see [ARCHITECTURE](./ARCHITECTURE.md#Templates). |
| `project_lists` | live | — | The lanes. |
| `project_cards` | live | 35 | |
| `project_card_comments` | live | — | Stakeholders may comment; see the permission matrix. |
| `project_checklists` / `project_checklist_items` | live | — | |
| `project_members` | live | — | Workspace-level board membership. |
| `project_labels` / `project_card_labels` | live | — | |
| `project_activity` | live | — | Written on every change, **read by nothing yet**. |
| `board_member_roles` | live | **0** | Per-board role overrides. Never populated. |
| `sprints` | live | **0** | |
| `card_sprints` | live | **0** | |
| `poker_rounds` | live | **0** | |
| `poker_votes` | live | **0** | Votes are blind until reveal. |
| `custom_fields` | live | **0** | |
| `integrations` | live | **0** | |
| `card_integrations` | live | **0** | |
| `webhooks` | live | **0** | |
| `audit_log` | live | **0** | No code path writes to this yet. |

## Platform tables (uncommitted code, migration already applied)

Added in `src/lib/db/schema/lanes-platform.ts`, DDL in `scripts/migrate.sql`,
**already run against the live database**.

| Table | Rows | Belongs to |
|-------|-----:|-----------|
| `board_stars` | — | the person |
| `saved_views` | — | the person |
| `card_links` | — | the work (shared) |
| `dismissed_tips` | — | the person |

`scripts/migrate.sql` is idempotent — every statement is `IF NOT EXISTS`, so it
can be applied to a database that already has the shared AXXES schema without
touching anything else. Re-running it is safe.

## The pattern: nine tables, zero rows

`board_member_roles`, `sprints`, `card_sprints`, `poker_rounds`, `poker_votes`,
`custom_fields`, `integrations`, `card_integrations`, `webhooks` and
`audit_log` **all exist and all are empty.**

This is not a data-seeding problem. It is the same fact as the wiring audit in
[STATE.md](./STATE.md): the logic is written and the screens do not exist, so
no row has ever been created through the product.

Consequences to keep in mind:

- The role matrix has **never** run against real data. Treat it as untested.
- `audit_log` has **no writer**. Building an audit-log *viewer* before an audit
  log *writer* produces an empty screen that looks like a bug.
- No sprint, poker or webhook behaviour has been observed end to end.

## Shared schema

Lanes does not own these; it references them:

- `tenants`, `tenant_memberships`, `tenant_modules`
- `user`, `session`, `account`
- `api_tokens`, `apps`
- `page_blocks`, `pages`, `nexus_spaces`, `nexus_pages`, `nexus_links`

## Conventions

- **Snake_case in the database, camelCase in Drizzle.** `tenant_id` →
  `tenantId`.
- **`uuid` primary keys**, `text` for references to `user.id` (which is text,
  not uuid — this trips people up).
- **`timestamp with time zone` everywhere.** No naive timestamps.
- **Soft delete** via `deleted_at`; `archived_at` is separate and means
  something different (archived is visible in the UI, deleted is not).
- **Every tenant-scoped table** gets a `tenant_id` and an index on it. Adding a
  tenant-scoped table without the index is how a board app gets slow at 3am.