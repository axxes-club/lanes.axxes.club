import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core"
import { projects, projectCards } from "./projects"
import { user } from "./users"

/* ══════════════════════════════════════════════════════════════════════
   The parts of Lanes that the shared schema did not already have.

   Everything here follows one rule: a preference belongs to the person who
   set it, not to the board. Starring a board, saving a view, collapsing a
   lane — these are all per-user facts. Putting them on the board row would
   mean one person's settings change everybody's board, which is the single
   most common way a collaborative tool loses trust.

   The exception is `cardLinks`, where the link is a fact about the work
   rather than a preference, so the row is shared by everyone who opens the
   board.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * A board this person starred.
 *
 * A real table rather than a flag in board settings, so "starred by me" is
 * a join instead of a scan of every board's settings, and so the primary key
 * can make starring idempotent.
 */
export const boardStars = pgTable(
  "board_stars",
  {
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The primary key *is* the idempotency guarantee: starring twice is the
    // same row, so the action needs no read-before-write.
    uniqueIndex("board_stars_pk").on(table.boardId, table.userId),
    index("board_stars_user_idx").on(table.userId),
  ],
)

/**
 * A saved view.
 *
 * The filters a person has dialled in — lane, assignee, label, due window,
 * search text, sort — as one row, so a URL can be a bookmark and a team can
 * share "my overdue work" without re-explaining it. `state` is deliberately
 * untyped: a view is a set of controls, and adding one must not need a
 * migration.
 */
export const savedViews = pgTable(
  "saved_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Which surface the view applies to: board | list | table | timeline. */
    view: text("view").notNull().default("board"),
    state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
    /** Shared views appear for everyone with access to the board. */
    isShared: boolean("is_shared").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("saved_views_board_idx").on(table.boardId, table.position),
    index("saved_views_user_idx").on(table.userId),
  ],
)

/**
 * A card's link to a record in another AXXES product.
 *
 * The whole point of the suite: Lanes and its siblings read one database, so
 * linking a customer, an order or a stock item is a reference, not an
 * integration. There is no sync job, nothing to refresh, and no way for the
 * two views to disagree.
 *
 * `label` and `detail` are snapshots taken at link time. A linked row is
 * re-read live when the panel opens, so the snapshot is only a fallback for
 * the search result and for a record that has since been deleted — the same
 * pattern a bookmark title uses.
 */
export const cardLinks = pgTable(
  "card_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id").notNull().references(() => projectCards.id, { onDelete: "cascade" }),
    /** Which registry entry this is; see src/lib/axxes/records.ts. */
    kind: text("kind").notNull(),
    /** The id of the row in the sibling app's table. */
    recordId: text("record_id").notNull(),
    label: text("label").notNull(),
    detail: text("detail"),
    /** Which product owns it, for display: "Members", "Invn", "Ledger". */
    product: text("product").notNull(),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One link per record per card: re-linking updates rather than stacking.
    uniqueIndex("card_links_card_record_idx").on(table.cardId, table.kind, table.recordId),
    index("card_links_card_idx").on(table.cardId),
    index("card_links_record_idx").on(table.kind, table.recordId),
  ],
)

/**
 * A person dismissed a suggestion for good.
 *
 * The product is full of things worth offering once — "this board has no
 * due dates", "connect GitHub". Offering the same tip to the same person
 * every visit is how a product earns its reputation for nagging, so a
 * dismissal is recorded rather than a flag buried in localStorage where it
 * would not follow the person to another machine.
 */
export const dismissedTips = pgTable(
  "dismissed_tips",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    tipKey: text("tip_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("dismissed_tips_pk").on(table.userId, table.tipKey)],
)

export type BoardStar = typeof boardStars.$inferSelect
export type SavedView = typeof savedViews.$inferSelect
export type CardLink = typeof cardLinks.$inferSelect
