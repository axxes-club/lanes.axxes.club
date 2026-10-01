# Lanes Usability and Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver release 1 of the approved expansion: reliable menus, customization, members, bulk operations, and saved views.

**Architecture:** Extend existing Next.js routes and shared project tables. Use tenant-scoped access helpers, pure validators, and focused server modules. Preserve internal JSON metadata and use atomic SQL for changes involving multiple records with the Neon HTTP driver.

**Tech Stack:** Next.js 16.3.6, React 19, TypeScript, Zod 4, Drizzle, Neon HTTP, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-30-lanes-product-expansion-design.md`

## Global Constraints

- Preserve familiar sidebar, board, column, and card navigation.
- Existing boards and shared AXXES projects must continue to work without conversion.
- Client visibility never substitutes for server enforcement.
- Custom-field writes merge only validated keys into existing card JSON, preserving internal metadata and concurrent unrelated field changes.
- Each request contains at most 100 distinct card IDs from one board.
- Read the relevant installed Next.js 16.3.6 documentation under `node_modules/next/dist/docs/` before implementation.
- Never automatically apply broad migrations to the shared production database.
- Deployment is a separate action from local completion.

## Review Focus

- A role revoked after a menu opens must prevent the action on the server (task 1).
- A submenu opened next to the bottom-right corner must remain reachable by keyboard and pointer (task 2).
- Deleting and recreating a field must not revive unrelated retained values (task 4).
- Concurrent changes to unrelated JSON settings or card values must survive (tasks 3–4).
- An invalid card mixed into a bulk request must cause zero writes, including activity records (task 6).

## Execution and verification setup

Execute natively in this session, in an isolated branch/worktree using the applicable skill. No parallel delegation is needed: tasks share types and board UI. Read installed Next.js guides for server/client components and revalidation before touching product code. Read current Neon/Drizzle documentation or installed implementation before choosing transaction interfaces.

Add `tsx`, Vitest, Testing Library, and jsdom as development tooling only when implementing the first task that needs them. Provide `npm test` for unit/component checks. Database tests are separate, require an explicitly configured disposable database, and must never truncate shared tables. Use unique test IDs and clean up only test-owned rows. Browser verification uses available browser tooling; disclose unavailable tooling instead of claiming checks passed.

## Task 1: tenant access and server permission enforcement

**Files:** Create `src/lib/lanes/access.ts`; modify `actions.ts`, `board-access.ts`, `settings-data.ts`, `member-actions.ts`, `members.ts`, `commands.ts`, `data.ts`; create `tests/lanes/access.test.ts` and test configuration.

**Interfaces:** `requireBoard(boardId: string, permission: Permission)` returns `{ ctx, project, access }`; `requireCard(cardId: string, permission: Permission)` returns `{ ctx, project, card, access }`. Both are server-only and resolve active tenant ownership before permission checks. Export `recordActivity(...)` in a focused server module for subsequent tasks.

- [ ] Write failing tests using mocked context/database boundaries: permitted role succeeds; forbidden role, revoked role, deleted board/card, missing session, and foreign-tenant IDs fail without mutation. Assert foreign-tenant IDs never query privileged dependent records.
- [ ] Run `npm test -- tests/lanes/access.test.ts`; confirm meaningful failures.
- [ ] Implement the helpers. Apply them to existing UI mutations, star writes, settings reads, and board/card reads. Map each action to its precise permission; priority and assignment use `card.priority` and `card.assign`, not a generic update check. Preserve authorized workspace-manager elevation.
- [ ] Verify every exported board/card mutation in `actions.ts` has server enforcement, including labels, checklists, comments, and duplication. Keep existing actor/self/last-owner restrictions in member code.
- [ ] Run access tests and `npx tsc --noEmit`; commit `fix: enforce tenant and board permissions for Lanes actions`.

## Task 2: accessible shared menus and confirmations

**Files:** Modify `src/components/lanes/context-menu.tsx`, `board.tsx`, `src/components/board-card.tsx`, `src/components/org-switcher.tsx`, `src/app/dashboard/page.tsx`; create `src/components/lanes/confirm-dialog.tsx`, `menu-actions.ts`, `tests/lanes/context-menu.test.tsx`.

**Interfaces:** Keep `MenuItem` compatible; add optional trigger/focus-return reference to `ContextMenu` props. Produce permission-filtered `cardMenuItems`, `listMenuItems`, and `boardMenuItems` builders with callbacks supplied by their owners. `ConfirmDialog` receives `{ open, title, description, pending, onConfirm, onClose }`.

- [ ] Write component tests: skip disabled items/separators with arrows; Home/End; Enter/Space; submenu Right/Left; Escape; outside click; restored focus; all viewport edges; touch overflow execution. Assert destructive actions wait for confirmation and cannot submit twice.
- [ ] Run menu tests and confirm they fail against current behavior.
- [ ] Implement focus management and viewport placement for root/submenus. Share action builders between right-click, keyboard context-menu triggers, and overflow buttons. Replace relevant native prompt/confirm flows with named dialogs/forms.
- [ ] Wire card actions, column rename/WIP/done/add/delete, and board open/star/rename/people/settings/archive. Workspace menu provides switching, people, and apps; retain existing organization switching and route locations.
- [ ] Run menu tests, type check, and browser keyboard/pointer checks at desktop/mobile widths; commit `feat: provide accessible menus across Lanes`.

## Task 3: board and column customization

**Files:** Create `src/lib/lanes/settings-validation.ts`, `settings-actions.ts`, `src/components/lanes/general-settings-panel.tsx`, `tests/lanes/settings.test.ts`; modify `types.ts`, `data.ts`, `actions.ts`, `settings-tabs.tsx`, `board.tsx`, `card-panel.tsx`, `list-view.tsx`, and `src/app/dashboard/b/[id]/settings/page.tsx`.

**Interfaces:** `BoardSettings` includes existing enable flags, `cardColor`, and `defaultListColor`. `updateBoardSettings(boardId: string, input: BoardSettingsInput): Promise<void>` validates name (1–100), description (0–5000), supported palette/null colors, and booleans. `updateList` adds validated `color` and keeps its existing fields.

- [ ] Write tests for settings validation, unknown keys, blank name, malformed colors/WIP limits, and preservation of unrelated JSON settings. Cover done-column transitions: active incomplete cards become completed, completed dates remain, unmark clears completion, archived/deleted cards stay unchanged.
- [ ] Run settings tests; confirm failures.
- [ ] Add General tab while preserving People as the default URL. Build pending/error-aware forms and expose editable colors, default tint, feature flags, and column settings. Merge settings in SQL instead of read-replace-write.
- [ ] Apply enable flags consistently to cards, card detail, list/table, and creation controls without deleting values. Use card cover color before default tint.
- [ ] Implement done-column metadata and active-card completion update in one atomic SQL statement with activity; avoid unsupported `db.transaction`.
- [ ] Run settings tests, type check, and browser persistence checks; commit `feat: add board and column customization`.

## Task 4: custom field definitions and values

**Files:** Create `src/lib/lanes/field-validation.ts`, `field-actions.ts`, `src/components/lanes/fields-panel.tsx`, `card-fields.tsx`, `tests/lanes/fields.test.ts`, `scripts/lanes-custom-fields.sql`; modify `lanes-enterprise.ts`, `settings-data.ts`, `types.ts`, `data.ts`, `actions.ts`, `settings-panels.tsx`, `card-panel.tsx`, `board.tsx`, `list-view.tsx`, and settings page.

**Interfaces:** Export `FieldType`, `FieldValue`, `FieldDefinition`, `FieldDefinitionInput`, and pure `validateFieldValues(definitions, values, activeUserIds): Record<string, FieldValue>`. Actions: `createField(boardId, input)`, `updateField(boardId, fieldId, patch)`, `deleteField(boardId, fieldId)`, `reorderFields(boardId, fieldIds)`, `saveCardFields(cardId, values)`, all `Promise<void>`. Definitions retain existing option `{ value, label, color? }` shape.

- [ ] Write validator tests for all eight types, missing required versus optional values, finite numbers, invalid dates, URL protocols, user membership, duplicate/unknown choices, and reserved `seq`, prototype keys, and existing internal metadata keys.
- [ ] Write server tests for foreign-board definitions, immutable type/key, concurrent unrelated JSON changes, deletion/recreation, duplicate keys, and rejecting removal of referenced choices. Verify duplication retains values but receives a fresh card sequence.
- [ ] Run field tests; confirm failures.
- [ ] Add nullable `deletedAt` to custom-field schema with a narrowly scoped idempotent SQL migration. Soft-delete definitions; the existing board/key unique index reserves keys permanently. Inspect schema availability and expose migration-needed errors honestly; do not silently treat database errors as empty definitions.
- [ ] Implement validated definition CRUD/reorder and atomic JSON value merge using tenant/permission helpers. Lock definitions/cards as needed inside single SQL statements so choice-removal and value-writing cannot race. Reject duplicate reorder IDs and IDs outside the board.
- [ ] Build Fields editor and card form with required markers and preserved input on failure. Show configured badges and table columns; map missing legacy values clearly. Pass only active field values into client data. Keep REST contracts unchanged; do not add a separate unchecked API write path.
- [ ] Run field tests, type check, and database/browser persistence verification with explicit schema configuration; commit `feat: support editable custom fields on boards and cards`.

## Task 5: member management clarity

**Files:** Modify `src/components/lanes/members-panel.tsx`, `src/lib/lanes/members.ts`, `member-actions.ts`, and settings page; create `tests/lanes/members.test.tsx`.

**Interfaces:** Retain current role-action signatures. Settings page supplies current workspace people and current board members; client search filters both without additional unrestricted queries.

- [ ] Write tests for name/email search, explicit member versus available workspace member, selected role when adding, accurate own-role/elevated labels, removal confirmation explaining implicit access, and preserving self/last-owner safeguards.
- [ ] Run member tests; confirm failures.
- [ ] Implement search and add-member controls with role descriptions, pending/error feedback, and existing matrix. Do not introduce external invitation messaging or change implicit workspace access semantics.
- [ ] Run member tests, type check, and permission-aware browser checks; commit `feat: simplify board member management`.

## Task 6: atomic bulk edits and selection

**Files:** Create `src/lib/lanes/bulk-validation.ts`, `bulk-actions.ts`, `src/components/lanes/bulk-toolbar.tsx`, `tests/lanes/bulk.test.ts`; modify `board.tsx`, `list-view.tsx`.

**Interfaces:** `BulkOperation` is a discriminated union for move/listId, priority/value, assignee-add/userId, assignee-remove/userId, due-date/value-or-null, archive. `bulkUpdateCards(boardId: string, cardIds: string[], operation: BulkOperation): Promise<{ updated: number }>` accepts 1–100 distinct UUIDs.

- [ ] Write tests for empty/duplicate/101 IDs, mixed boards, foreign tenant, archived/deleted targets, malformed values, invalid destination/user, operation-specific permissions, and zero writes/activity on any invalid input. Include completion semantics for move into/out of done columns.
- [ ] Run bulk tests; confirm failures.
- [ ] Implement one atomic, parameterized SQL statement per operation. Its locked target set validates the complete requested count and destination/user before data-modifying CTEs execute; activity is written only for successful updates. Do not run one independent mutation per card. Raise a clear failure if returned updated count differs from the validated input count.
- [ ] Add checkboxes and selection toolbar to all three views. Select-all uses only visible results; board changes clear selection and refreshes prune missing cards. Disable duplicate submission, preserve selection on errors, and refresh after success.
- [ ] Run tests and disposable-database atomicity checks; verify filtered selection and touch controls in browser; commit `feat: add atomic bulk card editing`.

## Task 7: personal and shared saved views

**Files:** Create `src/lib/lanes/view-validation.ts`, `view-actions.ts`, `src/components/lanes/saved-views.tsx`, `tests/lanes/views.test.ts`; modify `board-view.ts`, `board-toolbar.tsx`, `board-client.tsx`, `board.tsx`, `list-view.tsx`.

**Interfaces:** `SavedViewState` contains text, labelIds, memberIds, priorities, sort; `SavedView` includes id/name/view/isShared/state. Actions: `listSavedViews(boardId)`, `saveView(boardId, { name, view, state, isShared })`, `updateView(boardId, viewId, patch)`, `deleteView(boardId, viewId)`. Use existing saved_views table; validate supported board/list/table view modes.

- [ ] Write tests for personal visibility/ownership, shared read and edit permission, foreign-board IDs, revoked access, unknown state keys, invalid enums, deleted labels/members, and changes not affecting another user's active state.
- [ ] Run view tests; confirm failures.
- [ ] Implement tenant-scoped reads/writes and validated state storage. Define one controlled view state owned by BoardClient and consumed by Board/list/table. Applying views tolerates deleted filter references by dropping them visibly, rather than breaking the board.
- [ ] Add toolbar picker and create/update/delete/share forms with pending/errors; restore saved filters/sort consistently across all views. Personal preferences do not write project settings.
- [ ] Run view tests, type check, and two-user persistence/isolation browser checks; commit `feat: add personal and shared saved views`.

## Task 8: integrated verification and handoff

**Files:** Modify `docs/STATE.md`, `docs/TODO.md`, `docs/DATA-MODEL.md`, `docs/RUNBOOK.md`, and relevant existing developer docs.

- [ ] Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`. Investigate failures before claiming completion; repeat only affected checks after fixes.
- [ ] Exercise end-to-end create board → customize → fields → assign role → denied mutation → saved view → bulk move → reload, plus mobile overflow and keyboard menu flows. Record actual evidence and any database/browser limitations.
- [ ] Reconcile handoff docs to the shipped code, list required migrations and exact application/verification commands, and retain releases 2–5 as outstanding. Document new schema fields and behavior without implying external integrations or migration tools are implemented.
- [ ] Review the complete diff for tenant leakage, inconsistent permission maps, stale client data, inaccessible controls, broad migrations, and lost JSON metadata. Commit `docs: record Lanes customization release and verification`.

## Plan self-review

All release-1 spec sections map to tasks 1–8. Subsequent releases remain explicitly outside this implementation plan. Foreign tenant access is checked before permissions; role enforcement covers existing and new actions. The custom-field deletion policy requires an additive migration. Neon HTTP atomicity is handled without interactive transactions. Every Review Focus item has an owning test step. Product code and dependencies remain untouched until plan review and execution selection.
