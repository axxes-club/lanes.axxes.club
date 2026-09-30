# State

## Lanes customization release — 2026-09-30

Merged into `main`, preserving newer remote branding, app launcher and collapsed-sidebar changes. Deployment verification is recorded in the runbook.

- Tenant-scoped board/card authorization for existing mutations, including board creation ownership.
- Keyboard-accessible context menus for boards, columns, cards and workspace switching, with touch overflow controls and destructive confirmations.
- General board settings, feature visibility, default column color and card tint; existing navigation remains in place.
- Custom field definitions and card values: text, number, select, multi-select, date, checkbox, URL and workspace user. Deleted keys stay reserved; sequence/internal JSON is retained. Obsolete choice values are omitted when duplicating archived cards.
- Searchable board membership controls with role descriptions and existing role safeguards.
- Visible-result selection and atomic bulk move, priority, assignment, date and archive actions.
- Personal/shared saved filters and sort state across Board, List and Table presentations. Shared edits require board update permission.

## Verification

Automated tests cover authorization, validation, SQL persistence/atomicity, selection and menu keyboard behavior. PGlite executes the SQL against disposable PostgreSQL storage. Desktop/mobile browser fixtures exercise actual client components with mocked actions; they do not establish authenticated production workflows or real SSO. Production build and live HTTP checks are recorded in RUNBOOK.md.

## Schema

The release adds only `custom_fields.deleted_at`, using `scripts/lanes-custom-fields.sql`. Existing saved view and board membership tables are reused. No shared-platform migration is bundled into deployment.

## Still outstanding

Releases 2–5 of the approved design remain: import/migration workflows for Monday/Jira/Trello, richer AXXES relationships, automation, advanced views and customization. This release is the foundation, not complete competitive parity. Concurrent multi-connection Neon behavior and authenticated multi-user browser flows remain beyond the isolated test evidence.
