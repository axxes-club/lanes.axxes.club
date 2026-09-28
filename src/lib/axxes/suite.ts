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
    name: "Manifest",
    blurb: "The suite directory and shared data surface.",
    href: "https://manifest-axxes.vercel.app",
    accent: "#f59e0b",
    glyph: "Mf",
    primary: true,
    category: "infrastructure",
  },
  {
    key: "inventree",
    name: "Invn",
    blurb: "Inventory, stock and purchasing.",
    href: "https://inventree.axxes.club",
    accent: "#10b981",
    glyph: "Iv",
    category: "commerce",
  },
  {
    key: "nexus",
    name: "Nexus",
    blurb: "The website and content platform.",
    href: "https://nexus.axxes.club",
    accent: "#f472b6",
    glyph: "Nx",
    category: "commerce",
  },
  {
    key: "signal",
    name: "Signal",
    blurb: "Social publishing and analytics.",
    href: "https://signal.axxes.club",
    accent: "#38bdf8",
    glyph: "Sg",
    category: "audience",
  },
  {
    key: "matrix",
    name: "Matrix",
    blurb: "Team chat, wired to your boards.",
    href: "https://matrix.axxes.club",
    accent: "#34d399",
    glyph: "Mx",
    category: "work",
  },
  {
    key: "ledger",
    name: "Ledger",
    blurb: "Orders, invoicing and revenue.",
    href: "https://ledger.axxes.club",
    accent: "#fbbf24",
    glyph: "Lg",
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
