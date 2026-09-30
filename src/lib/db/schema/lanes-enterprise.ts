import { pgTable, text, timestamp, uuid, integer, jsonb, pgEnum, index, uniqueIndex, boolean, real } from "drizzle-orm/pg-core"
import { projects, projectCards, projectMembers } from "./projects"
import { user } from "./users"

/* ══════════════════════════════════════════════════════════════════════
   Roles and permissions

   The workspace role (owner/admin/manager/member/viewer) says what you may
   do to the workspace. It says nothing about what you may do to a *board*,
   which is where delivery actually happens.

   So boards carry their own roles: the same person can be the product owner
   on one board and a read-only stakeholder on another. The role maps to a
   fixed set of capabilities — see src/lib/lanes/permissions.ts — rather
   than storing a list of grants, because "what can a QA do" has to have one
   answer everywhere or two screens will disagree.
   ══════════════════════════════════════════════════════════════════════ */

export const boardRoleEnum = pgEnum("board_role", [
  "owner",        // owns the board: settings, people, delete
  "product_owner",// writes the backlog, sets priority, runs the sprint
  "scrum_master", // facilitates: starts/ends sprints, runs poker, unblocks
  "developer",    // works the sprint: moves cards, logs time, opens PRs
  "designer",     // works the sprint, owns design links
  "qa",           // verifies: test status, bugs, sign-off
  "stakeholder",  // reads everything, comments, cannot change cards
  "viewer",       // reads only
])

export const boardMemberRoles = pgTable(
  "board_member_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: boardRoleEnum("role").notNull().default("developer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("board_member_roles_board_user_idx").on(table.boardId, table.userId),
    index("board_member_roles_user_idx").on(table.userId),
  ],
)

/* ══════════════════════════════════════════════════════════════════════
   Custom fields

   Definitions live on the board so two boards can disagree ("Severity" here,
   "Impact" there). Values live on the card's existing custom_fields jsonb
   keyed by the field's key — a definition with no value simply has no key,
   which is what "optional" means, and it keeps reads to a single row.
   ══════════════════════════════════════════════════════════════════════ */

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text", "number", "select", "multi_select", "date", "checkbox", "url", "user",
])

export const customFields = pgTable(
  "custom_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),      // stable machine key, snake_case
    name: text("name").notNull(),    // what people see
    type: customFieldTypeEnum("type").notNull().default("text"),
    options: jsonb("options").$type<{ value: string; label: string; color?: string }[]>().default([]),
    required: boolean("required").notNull().default(false),
    position: integer("position").notNull().default(0),
    // Shown on the card face as a badge, not just in the panel.
    showOnCard: boolean("show_on_card").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("custom_fields_board_key_idx").on(table.boardId, table.key),
    index("custom_fields_board_position_idx").on(table.boardId, table.position),
  ],
)

/* ══════════════════════════════════════════════════════════════════════
   Sprints and the backlog

   A sprint is a timebox with a goal. The backlog is not a separate table:
   it is the board's lists minus the current sprint, so a card becomes a
   sprint commitment by being *moved into a sprint* — one fact, no sync.
   ══════════════════════════════════════════════════════════════════════ */

export const sprintStatusEnum = pgEnum("sprint_status", [
  "planned", "active", "completed", "cancelled",
])

export const sprints = pgTable(
  "sprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal"),
    status: sprintStatusEnum("status").notNull().default("planned"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdById: text("created_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sprints_board_status_idx").on(table.boardId, table.status),
    index("sprints_board_position_idx").on(table.boardId, table.position),
  ],
)

/** Which sprint a card is committed to. Null = still in the backlog. */
export const cardSprints = pgTable(
  "card_sprints",
  {
    cardId: uuid("card_id").primaryKey().references(() => projectCards.id, { onDelete: "cascade" }),
    sprintId: uuid("sprint_id").notNull().references(() => sprints.id, { onDelete: "cascade" }),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull().defaultNow(),
    // Carried in from the previous sprint, and why, so the retro has data.
    carriedOver: boolean("carried_over").notNull().default(false),
  },
  (table) => [index("card_sprints_sprint_idx").on(table.sprintId)],
)

/* ══════════════════════════════════════════════════════════════════════
   Scrum poker

   A round is one estimation session: a card, a deck, a set of votes, and a
   consensus flag. Participants are recorded even after the round closes, so
   a facilitator can see who was in the room and whether the same three people
   are always arguing.
   ══════════════════════════════════════════════════════════════════════ */

export const pokerDecksEnum = pgEnum("poker_deck", ["fibonacci", "modified_fibonacci", "powers_of_two", "t_shirt"])

export const pokerRounds = pgTable(
  "poker_rounds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").references(() => projectCards.id, { onDelete: "set null" }),
    sprintId: uuid("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
    deck: pokerDecksEnum("deck").notNull().default("fibonacci"),
    // Votes hidden until everyone has answered, or the room anchors on the
    // first hand raised.
    revealAt: timestamp("reveal_at", { withTimezone: true }),
    consensus: integer("consensus"),   // the agreed estimate, once reached
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdById: text("created_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("poker_rounds_board_idx").on(table.boardId, table.createdAt)],
)

export const pokerVotes = pgTable(
  "poker_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roundId: uuid("round_id").notNull().references(() => pokerRounds.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    card: text("card").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One vote per person per round; the database enforces it.
    uniqueIndex("poker_votes_round_user_idx").on(table.roundId, table.userId),
  ],
)

/* ══════════════════════════════════════════════════════════════════════
   Integrations

   One table for all three, because the interesting part is the same: an
   encrypted credential, a mapping rule, and a sync cursor. The provider
   decides which columns are meaningful (a Figma link has no "state", a
   GitLab merge request does).
   ══════════════════════════════════════════════════════════════════════ */

export const integrationProviderEnum = pgEnum("integration_provider", ["github", "gitlab", "figma"])

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    name: text("name").notNull(),
    // Encrypted at rest; never returned by any read path.
    credential: text("credential").notNull(),
    // Provider-side identifiers: repo, group, team key.
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    // How a card maps to a remote thing, e.g. branch pattern.
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdById: text("created_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("integrations_board_idx").on(table.boardId),
    uniqueIndex("integrations_board_provider_idx").on(table.boardId, table.provider),
  ],
)

/** A card's link to something in an external system. */
export const cardIntegrations = pgTable(
  "card_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id").notNull().references(() => projectCards.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),        // pull_request | issue | design | commit
    externalId: text("external_id").notNull(),
    externalUrl: text("external_url"),
    title: text("title"),
    state: text("state"),                // open | merged | closed | draft
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("card_integrations_link_idx").on(table.integrationId, table.externalId),
    index("card_integrations_card_idx").on(table.cardId),
  ],
)

/* ══════════════════════════════════════════════════════════════════════
   Webhooks and the audit trail

   api_tokens is not declared here: it already exists in inventree.ts and in
   the shared database, and a second definition of the same table is a
   compile error, not a feature.
   ══════════════════════════════════════════════════════════════════════ */

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull().default([]),
    secret: text("secret").notNull(),  // HMAC key, shown once
    enabled: boolean("enabled").notNull().default(true),
    lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhooks_board_idx").on(table.boardId)],
)

/** Immutable audit trail. Enterprise boards are asked "who changed this". */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").references(() => projectCards.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    from: jsonb("from"),
    to: jsonb("to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_board_idx").on(table.boardId, table.createdAt),
    index("audit_log_card_idx").on(table.cardId),
  ],
)

export type BoardRole = (typeof boardRoleEnum.enumValues)[number]
export type Sprint = typeof sprints.$inferSelect
export type CustomField = typeof customFields.$inferSelect
export type PokerRound = typeof pokerRounds.$inferSelect
export type Integration = typeof integrations.$inferSelect
