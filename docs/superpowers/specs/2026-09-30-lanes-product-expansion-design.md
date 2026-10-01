# Lanes product expansion

Date: 2026-09-30
Status: Proposed specification for user review

## Intent and success

Make Lanes a task management application teams can adopt from their current tool, with extensive customization and useful AXXES workflows. Preserve familiar sidebar, board, column, and card navigation. Existing boards and shared AXXES projects must continue to work without conversion.

The user requested right-click support for spaces, cards, and columns; easy per-board user management; migration from Monday, Jira, Trello, and other tools; customization; and integration with the AXXES suite. The implementation sequence below is a recommendation, not a claim that those capabilities already exist.

## Approach

Extend the existing application in independently deliverable releases. A replacement application would duplicate shared project data and disrupt navigation. Building all subsystems in one release would make permissions, migrations, and failure recovery difficult to verify. The first release completes everyday interaction and customization; later releases retain the full requested scope.

## Evidence from the repository

- `projects` and `project_*` tables are shared with AXXES. Board preferences belong in project settings; personal preferences must not change other users' boards.
- Kanban, list, and table views, a command palette, sprints, poker, and member-role management already have screens.
- `context-menu.tsx` is used for cards and columns. It closes on Escape but does not implement arrow navigation, focus restoration, or keyboard submenu navigation.
- `settings-panels.tsx` displays custom fields, integrations, and webhooks without write controls.
- `CardT` does not expose custom field values. Card JSON also stores internal sequence metadata, so replacing the JSON wholesale would corrupt card identity.
- `board-access.ts`, `permissions.ts`, and server mutation helpers are the existing authorization foundation. Client visibility never substitutes for server enforcement.
- AXXES links cover contacts, orders, events, products, venues, and suppliers through the shared registry.
- `docs/TODO.md` and portions of `docs/STATE.md` contradict the current code. Treat source and fresh verification as evidence; reconcile handoff docs when shipping.

## Release 1: everyday interaction and customization

### Navigation and context menus

Keep Boards, My cards, Insights, People, workspace switching, and the AXXES product switcher in their current locations. Extend the existing menu component rather than introducing a second action system.

Menus open by right click, an explicit overflow button, or Shift+F10/the context-menu key on a focused object. Arrow keys navigate enabled items, Home/End select boundaries, Enter/Space execute, Right/Left open and close submenus, and Escape dismisses. Focus returns to the trigger. Menus and submenus stay within the viewport, including small screens. Disabled items cannot execute.

Card menus offer open, move, priority, labels, assignment, duplicate, archive, and delete according to their individual permissions. Column menus offer rename, WIP limit, done-column setting, add card, and delete. Board tiles and board headers offer open, star/unstar, rename, people, settings, and archive as applicable. Destructive actions require clear in-app confirmation. Overflow controls expose the same actions on touch devices.

A workspace is the existing top-level space in this release. Its menu offers switch workspace, people, and AXXES apps. A nested named-space model is a later release and must not be simulated by changing workspace semantics.

### Board settings

Add a General tab at the existing settings URL. Allow board name, description, board color, default card tint, and the existing feature settings for due dates, labels, members, checklists, and comments. Validate colors against a supported palette and validate bounded text on the server. Preserve unrelated project settings during updates.

Feature settings control visibility and availability of the corresponding UI. They do not delete existing values. Default card tint applies when a card has no individual cover color. Column color and WIP controls use the existing list data model. Marking a column done must have explicit semantics: recompute completion for its active cards and record the change; preserve historical completion dates where already completed. Unmarking clears active-card completion for that column. Do not rewrite archived/deleted cards.

### Custom fields

Turn the existing Fields tab into an editor for text, number, select, multi-select, date, checkbox, URL, and user fields. Managers can create, rename, reorder, configure choices, mark required, choose card visibility, and delete definitions. Field keys are stable and board-unique. Reserve internal metadata keys, including `seq`; user field writes cannot modify them.

Once a field exists its type and key are immutable in this release. Removing a select choice is rejected while active cards reference it. Removing a field requires confirmation and removes its definition from current UI while retaining stored values; recreating a deleted key is rejected so old values cannot silently become a new field's values.

Show fields in card detail with controls appropriate to type. Fields marked visible appear as compact card metadata and as table columns. Values survive reloads and card duplication. Validate user references against active members of the current workspace, select values against configured choices, finite numbers, valid dates, and HTTP/HTTPS URLs. Blank optional values are represented consistently as absent/null.

Required fields are enforced when saving the custom-field form. Adding a required definition to an existing board does not block unrelated actions on older cards; missing values are shown explicitly so the team can fill them in. A future migration/release can strengthen lifecycle enforcement without surprising existing users.

Custom-field writes merge only validated keys into existing card JSON, preserving internal metadata and concurrent unrelated field changes. All definitions are resolved from the card's actual board on the server.

### Board members

Keep the existing People tab and permission matrix. Add search across current board members and available workspace members, a clear add-member control with role selection, and visible role descriptions. Distinguish explicit board roles from implicit workspace access. Show the current user's actual role label and elevated workspace access accurately.

Retain server-side checks for role changes and removal, verify target workspace membership, and preserve existing ownership safeguards. Removing a board role must accurately explain whether the person retains implicit workspace access. External email invitation and guest access belong to the subsequent access release; this release does not send invitation messages.

### Bulk work

Enable multi-card selection in Kanban, list, and table views with accessible checkboxes and a selection toolbar. Select-all affects only currently visible cards. Clear selection on board changes; prune cards removed by a refresh. Supported operations are move, priority, assignee add/remove, due-date update/clear, and archive.

Each request contains at most 100 distinct card IDs from one board. Validate every ID, destination, user, value, and required permission before any write. Apply the operation atomically where supported by the current database driver; if the driver cannot provide the needed transaction, choose a compatible execution mechanism before exposing bulk writes. Do not present partial success as complete. Reuse the single-card completion semantics for moving into or out of done columns.

### Saved views

Expose the existing `saved_views` model through the board toolbar: create, name, apply, update, and delete personal views; share only with board-update permission. Persist view type, text filter, labels, members, priority, and sort. Personal views are editable only by their creator. Shared views require board access to read and board-update permission to modify. Applying a view never changes another user's current view. Reject unknown state keys and incompatible enum values.

## Implementation boundaries

Use focused server modules for field definitions/values, general settings, bulk operations, and saved views. Keep validation code independent of database imports for meaningful unit tests. Route all writes through current context, tenant-scoped board/card lookup, and the central permission matrix before querying or modifying dependent records.

Extend serializable board/card types and existing load functions. Never expose credentials or unrelated tenant records in client data. Preserve existing REST response contracts. If custom fields are added to REST writes, use the same validators as UI mutations and retain internal metadata protection.

Read the relevant installed Next.js 16.3.6 documentation under `node_modules/next/dist/docs/` before implementation. Follow its current server/client boundary and revalidation APIs. Revalidate board, settings, and board gallery paths affected by writes; refresh card detail after relevant changes.

Check actual database schema availability before relying on existing tables. Any required schema change gets an additive, idempotent migration and an explicit verification step. Never automatically apply broad migrations to the shared production database.

## Failure and feedback

Every mutation shows pending state, prevents duplicate submission, and reports actionable errors. Failed mutations retain input and existing server data. Optimistic changes roll back or refresh on failure. Concurrent field deletion or permission changes cause a clear refusal rather than silently losing values. Activity records identify the actor and affected board/card for new writes.

## Verification and release acceptance

- Type checking and a production build pass after implementation.
- Keyboard and pointer menus execute the same actions; touch users can reach them through overflow buttons.
- Test denied and permitted server operations, including another tenant's board/card IDs, another board's fields/lists, and removed workspace members.
- Verify all eight field types, stable keys, required behavior, reserved metadata, duplication, reload persistence, and select-choice removal constraints.
- Verify default tint, individual overrides, board setting merges, feature visibility, WIP edits, and done-column completion changes.
- Verify member search, role assignment/removal, implicit access messaging, and ownership safeguards.
- Verify bulk operations reject mixed boards and invalid inputs without partial writes, handle done transitions, and limit visible selection correctly.
- Verify personal/shared saved view permissions, persistence, and isolation between users.
- Perform browser checks at desktop and narrow mobile widths. If database-backed verification is unavailable, report that limitation explicitly and do not claim persistence was verified.
- Update handoff docs with implemented behavior and remaining work. Deployment is a separate action from local completion.

## Subsequent releases retained in scope

2. Migration: a preview-first import wizard; CSV field/status/user mapping; Trello JSON and Jira/Monday CSV adapters; provenance, duplicate detection, resumable jobs, error reports, and export. Research current official export formats during that release. Preserve source IDs and disclose unsupported attachments/history before import.

3. AXXES workflows: related tasks on shared records, create tasks from records, contextual links/actions, and Matrix board-channel workflows. Verify sibling application contracts and permissions before adding cross-app writes. Keep each application's records authoritative.

4. Organization and access: named spaces/folders within a workspace, board organization and menus, guests, external invitation acceptance, and explicit private-board visibility. Space inheritance must not bypass board permission enforcement.

5. Advanced delivery: dependencies, recurring tasks, calendar/timeline views, notifications, automation rules, and webhook delivery. Use durable jobs with idempotency, retry handling, execution history, and loop prevention; design those systems independently before implementation.

These releases require their own detailed specifications and validation. Release 1 completion does not mean migration, cross-app automation, or competitor feature parity is complete.
