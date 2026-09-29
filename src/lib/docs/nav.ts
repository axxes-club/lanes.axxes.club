/**
 * The documentation's table of contents.
 *
 * One array, read by the sidebar, the page routes and the "on this page"
 * outline. A docs site where the nav and the routes are maintained
 * separately is a docs site with a broken link in it within a month.
 *
 * `slug` is the route segment. Nesting is by `children`, not by slashes, so
 * the URL stays flat (`/docs/cards` rather than `/docs/api/v1/cards`) and a
 * page can be moved without a redirect table.
 */

export type DocPage = {
  slug: string
  title: string
  /** One line, shown under the title and in the nav tooltip. */
  summary: string
}

export type DocSection = {
  title: string
  pages: DocPage[]
}

export const DOC_NAV: DocSection[] = [
  {
    title: "Start here",
    pages: [
      { slug: "", title: "Introduction", summary: "What Lanes is, and what the API is for." },
      { slug: "quickstart", title: "Quickstart", summary: "First board, first card, in about two minutes." },
      { slug: "authentication", title: "Authentication", summary: "Tokens, scopes, and what a token can do." },
    ],
  },
  {
    title: "Core concepts",
    pages: [
      { slug: "boards", title: "Boards", summary: "Boards, lanes, labels and templates." },
      { slug: "cards", title: "Cards", summary: "Cards, keys, checklists, comments and activity." },
      { slug: "sprints", title: "Sprints", summary: "Timeboxes, commitment and the backlog." },
      { slug: "search", title: "Search", summary: "One ranked search over everything." },
    ],
  },
  {
    title: "Reference",
    pages: [
      { slug: "permissions", title: "Permissions", summary: "The role matrix, and who may do what." },
      { slug: "errors", title: "Errors", summary: "Every status code and what to do about it." },
      { slug: "rate-limits", title: "Rate limits", summary: "Ceilings, headers and backoff." },
      { slug: "webhooks", title: "Webhooks", summary: "Event delivery and signature verification." },
      { slug: "openapi", title: "OpenAPI", summary: "The machine-readable specification." },
    ],
  },
  {
    title: "Coming from elsewhere",
    pages: [
      { slug: "migration", title: "Migrating", summary: "From Jira, Linear, Trello or Asana." },
    ],
  },
]

export const ALL_DOCS: DocPage[] = DOC_NAV.flatMap((s) => s.pages)

export function findDoc(slug: string): DocPage | undefined {
  return ALL_DOCS.find((p) => p.slug === slug)
}

/** The neighbours of a page, for the previous/next links. */
export function neighbours(slug: string) {
  const flat = ALL_DOCS
  const i = flat.findIndex((p) => p.slug === slug)
  return { prev: i > 0 ? flat[i - 1] : null, next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null }
}
