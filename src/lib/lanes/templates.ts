/**
 * Board templates.
 *
 * A template is data, not code: lanes, labels and a card colour. That means
 * a new template is a data change, and a workspace can save any board as a
 * template of its own (see `createBoard` in actions) without a deploy.
 *
 * Templates are written the way a team would describe them out loud. "Sprint"
 * is Backlog / Ready / In progress / In review / Done, not "Column 1..5",
 * because the lane names become the vocabulary the whole team uses.
 */

export type TemplateList = {
  name: string
  /** Marks the lane whose contents count as finished. */
  done?: boolean
  /** A WIP limit suggestion, in cards. */
  wip?: number
}

export type TemplateChecklist = { title: string; items: string[] }

export type Template = {
  key: string
  name: string
  summary: string
  /** What this is for, in one line. Shown in the picker. */
  bestFor: string
  accent: string
  glyph: "board" | "list" | "rocket" | "target" | "stack" | "chart" | "calendar" | "puzzle"
  lists: TemplateList[]
  labels: { name: string; color: string }[]
  /** Applied to every card, so a board is recognisable at a glance. */
  cardColor: string
  /** Offered when creating from this template, not auto-applied. */
  suggestions: TemplateChecklist[]
  featured?: boolean
}

export const LABEL_COLORS = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#10b981",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
  teal: "#14b8a6",
  slate: "#94a3b8",
} as const

export const TEMPLATES: Template[] = [
  {
    key: "kanban",
    name: "Kanban",
    summary: "To do, In progress, Done.",
    bestFor: "Any team that wants a shared picture of what is moving.",
    accent: "#60a5fa",
    glyph: "board",
    featured: true,
    lists: [
      { name: "To do" },
      { name: "In progress", wip: 5 },
      { name: "Done", done: true },
    ],
    labels: [
      { name: "Bug", color: LABEL_COLORS.red },
      { name: "Feature", color: LABEL_COLORS.blue },
      { name: "Design", color: LABEL_COLORS.violet },
      { name: "Blocked", color: LABEL_COLORS.amber },
    ],
    cardColor: "",
    suggestions: [
      { title: "Definition of done", items: ["Tested", "Documented", "Shipped"] },
      { title: "Before merge", items: ["Lint clean", "Tests green", "Reviewed"] },
    ],
  },
  {
    key: "sprint",
    name: "Sprint",
    summary: "Backlog, Ready, In progress, In review, Done.",
    bestFor: "Teams running a timeboxed sprint with a committed backlog.",
    accent: "#a78bfa",
    glyph: "target",
    featured: true,
    lists: [
      { name: "Backlog" },
      { name: "Ready" },
      { name: "In progress", wip: 4 },
      { name: "In review" },
      { name: "Done", done: true },
    ],
    labels: [
      { name: "Spike", color: LABEL_COLORS.slate },
      { name: "Bug", color: LABEL_COLORS.red },
      { name: "Feature", color: LABEL_COLORS.blue },
      { name: "Tech debt", color: LABEL_COLORS.amber },
    ],
    cardColor: "",
    suggestions: [{ title: "Definition of done", items: ["Code reviewed", "Tests written", "Deployed", "Docs updated"] }],
  },
  {
    key: "bug",
    name: "Bug tracker",
    summary: "Reported, Triaged, Fixing, Verifying, Closed.",
    bestFor: "Support and engineering handling defects with a real triage step.",
    accent: "#ef4444",
    glyph: "puzzle",
    lists: [
      { name: "Reported" },
      { name: "Triaged", wip: 8 },
      { name: "Fixing", wip: 3 },
      { name: "Verifying" },
      { name: "Closed", done: true },
    ],
    labels: [
      { name: "S1 critical", color: LABEL_COLORS.red },
      { name: "S2 major", color: LABEL_COLORS.amber },
      { name: "S3 minor", color: LABEL_COLORS.blue },
      { name: "Regression", color: LABEL_COLORS.pink },
    ],
    cardColor: "",
    suggestions: [
      { title: "Reproduction", items: ["Steps to reproduce", "Expected result", "Actual result", "Environment"] },
    ],
  },
  {
    key: "pipeline",
    name: "Pipeline",
    summary: "Leads, Contacted, Qualified, Proposal, Won.",
    bestFor: "Sales and business development, tracking deal stage.",
    accent: "#f59e0b",
    glyph: "chart",
    lists: [
      { name: "Leads" },
      { name: "Contacted" },
      { name: "Qualified" },
      { name: "Proposal", wip: 5 },
      { name: "Won", done: true },
    ],
    labels: [
      { name: "Inbound", color: LABEL_COLORS.green },
      { name: "Outbound", color: LABEL_COLORS.blue },
      { name: "Referral", color: LABEL_COLORS.violet },
      { name: "Churn risk", color: LABEL_COLORS.red },
    ],
    cardColor: "",
    suggestions: [{ title: "Qualification", items: ["Budget confirmed", "Decision maker identified", "Timeline agreed"] }],
  },
  {
    key: "content",
    name: "Content",
    summary: "Ideas, Research, Drafting, Editing, Published.",
    bestFor: "Marketing, editorial and documentation teams.",
    accent: "#ec4899",
    glyph: "list",
    lists: [
      { name: "Ideas" },
      { name: "Research" },
      { name: "Drafting", wip: 3 },
      { name: "Editing" },
      { name: "Published", done: true },
    ],
    labels: [
      { name: "SEO", color: LABEL_COLORS.green },
      { name: "Newsletter", color: LABEL_COLORS.blue },
      { name: "Social", color: LABEL_COLORS.pink },
      { name: "Evergreen", color: LABEL_COLORS.slate },
    ],
    cardColor: "",
    suggestions: [{ title: "Publish checklist", items: ["Hero image", "Links checked", "Meta description", "Proofread"] }],
  },
  {
    key: "onboarding",
    name: "Team onboarding",
    summary: "To set up, In progress, Waiting on them, Done.",
    bestFor: "Getting a new person productive, with nothing forgotten.",
    accent: "#14b8a6",
    glyph: "stack",
    lists: [
      { name: "To set up" },
      { name: "In progress" },
      { name: "Waiting on them" },
      { name: "Done", done: true },
    ],
    labels: [
      { name: "Access", color: LABEL_COLORS.amber },
      { name: "Equipment", color: LABEL_COLORS.slate },
      { name: "Training", color: LABEL_COLORS.blue },
    ],
    cardColor: "",
    suggestions: [
      { title: "First week", items: ["Accounts created", "Intro call booked", "Laptop configured", "First PR opened"] },
    ],
  },
  {
    key: "events",
    name: "Event planning",
    summary: "Concept, Budgeting, Vendors, Promotion, Delivered.",
    bestFor: "Events and experiences, which is most of what AXXES does.",
    accent: "#f472b6",
    glyph: "calendar",
    lists: [
      { name: "Concept" },
      { name: "Budgeting" },
      { name: "Vendors", wip: 8 },
      { name: "Promotion" },
      { name: "Delivered", done: true },
    ],
    labels: [
      { name: "Venue", color: LABEL_COLORS.violet },
      { name: "Catering", color: LABEL_COLORS.amber },
      { name: "Talent", color: LABEL_COLORS.pink },
      { name: "Permits", color: LABEL_COLORS.red },
    ],
    cardColor: "",
    suggestions: [{ title: "Event day", items: ["Load-in booked", "Crew briefed", "Run sheet printed", "Insurance checked"] }],
  },
  {
    key: "blank",
    name: "Blank",
    summary: "One lane called New work. Add your own.",
    bestFor: "People who would rather not be given an opinion.",
    accent: "#94a3b8",
    glyph: "board",
    lists: [{ name: "New work" }],
    labels: [],
    cardColor: "",
    suggestions: [],
  },
  {
    key: "release",
    name: "Release train",
    summary: "Planned, Building, Testing, Cutting, Shipped.",
    bestFor: "Teams that ship on a schedule rather than continuously.",
    accent: "#10b981",
    glyph: "rocket",
    lists: [
      { name: "Planned" },
      { name: "Building", wip: 6 },
      { name: "Testing", wip: 6 },
      { name: "Cutting" },
      { name: "Shipped", done: true },
    ],
    labels: [
      { name: "Feature flag", color: LABEL_COLORS.teal },
      { name: "Migration", color: LABEL_COLORS.amber },
      { name: "Hotfix", color: LABEL_COLORS.red },
      { name: "Docs", color: LABEL_COLORS.slate },
    ],
    cardColor: "",
    suggestions: [{ title: "Release notes", items: ["User-facing changes", "Migrations", "Known issues"] }],
  },
]

export function template(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key)
}

export const FEATURED_TEMPLATES = TEMPLATES.filter((t) => t.featured)
