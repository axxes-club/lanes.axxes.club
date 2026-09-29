/**
 * The AXXES suite.
 *
 * Lanes is one product in a family that shares one account, one workspace and
 * one set of records. This file is the single place that knows what the rest
 * of the family is, which is what makes the product switcher, the app hub and
 * the cross-product record links possible without a hard-coded URL in a
 * component.
 *
 * Two kinds of entry live here, and the difference matters:
 *
 *   SuiteProduct — a sibling app you switch to. It has its own UI and its own
 *                  URL, and signing in is automatic on the shared cookie
 *                  domain. Switching means navigating.
 *   SuiteRecord  — a row in a sibling app's tables that Lanes can read
 *                  directly, because they share one database. Linking means a
 *                  join, not an integration: no OAuth, no sync, no staleness.
 *                  A contact linked to a card is the same row.
 *
 * The second kind is the reason a board in Lanes can show a live customer
 * name, a real stock level or an actual order total. No competitor built on
 * per-tool integrations can do that without wiring a connector.
 */

export type SuiteProduct = {
  key: string
  name: string
  /** What it does, in under ten words. */
  blurb: string
  href: string
  accent: string
  /** Two-letter monogram, drawn in the product's own accent. */
  glyph: string
  /** True for the app the visitor is currently in. */
  self?: boolean
  /** Shown in the switcher ahead of the rest. */
  primary?: boolean
  /** Which kind of work this is good at, for the "find the right app" page. */
  category: "work" | "commerce" | "audience" | "infrastructure"
}

/**
 * Only products that actually exist belong here.
 *
 * This list had picked up Signal, Matrix and Ledger — apps that were planned,
 * named, given a colour and a blurb, and never built. No repo, no DNS, no
 * references anywhere else, and three dead tiles in the switcher that led
 * nowhere. `tests/lib/suite-links.test.ts` now checks every href here resolves,
 * so the next one has to be a real product rather than a good name.
 */
export const SUITE: SuiteProduct[] = [
  {
    key: "lanes",
    name: "Lanes",
    blurb: "Boards, sprints and pipelines for delivery.",
    href: "/dashboard",
    accent: "#5b8cff",
    glyph: "Ln",
    self: true,
    primary: true,
    category: "work",
  },
  {
    key: "handshake",
    name: "Handshake",
    blurb: "One identity for every AXXES app.",
    href: "https://handshake.axxes.club",
    accent: "#22d3ee",
    glyph: "Hs",
    primary: true,
    category: "infrastructure",
  },
  {
    key: "members",
    name: "Members",
    blurb: "People, teams, invitations and roles.",
    href: "https://members.axxes.club",
    accent: "#a78bfa",
    glyph: "Mb",
    primary: true,
    category: "audience",
  },
  {
    key: "manifest",
    // Named "Stock" in the catalog. Renamed to match: a switcher that says
    // "Manifest" and a launcher that says "Stock" is two products to the user.
    name: "Stock",
    blurb: "Inventory operations on one honest ledger.",
    // Was manifest-axxes.vercel.app, which 404s. The real host is this one —
    // the same value the catalog row carries.
    href: "https://manifest.axxes.club",
    accent: "#c8ff3d",
    glyph: "St",
    primary: true,
    category: "commerce",
  },
  {
    key: "nexus",
    name: "Nexus",
    blurb: "Your team's knowledge base.",
    href: "https://nexus.axxes.club",
    accent: "#f472b6",
    glyph: "Nx",
    category: "commerce",
  },
  {
    key: "tollbooth",
    name: "Tollbooth",
    blurb: "Payments and event ticketing.",
    href: "https://tollbooth.axxes.club",
    accent: "#f87171",
    glyph: "Tb",
    category: "commerce",
  },
]

export function suiteProduct(key: string): SuiteProduct | undefined {
  return SUITE.find((p) => p.key === key)
}
