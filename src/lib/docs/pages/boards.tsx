import { code, ep, h2, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const boards: DocBody = [
  p(
    <>
      A board is a column of lanes holding cards. It is stored in the shared AXXES <code>projects</code> table, which is why
      a board also appears as a Project in the rest of the suite — the same rows, not a copy.
    </>,
  ),

  h2("templates", "Templates"),
  p(
    <>
      A board is always created from a template. The registry is shared with the product, so anything you can pick in the UI
      you can pass as <code>template</code> here, and anything added to the product is added to the API with no change to
      this page.
    </>,
  ),
  table(
    ["Key", "Lanes", "For"],
    [
      ["kanban", "To do → In progress → Done", "Any team that wants a shared picture of what is moving"],
      ["sprint", "Backlog → Ready → In progress → In review → Done", "A timeboxed sprint with a committed backlog"],
      ["bug", "Reported → Triaged → Fixing → Verifying → Closed", "Defects with a real triage step"],
      ["release", "Planned → Building → Testing → Cutting → Shipped", "Shipping on a schedule"],
      ["pipeline", "Leads → Contacted → Qualified → Proposal → Won", "Deal stage"],
      ["content", "Ideas → Research → Drafting → Editing → Published", "Marketing and editorial"],
      ["onboarding", "To set up → In progress → Waiting on them → Done", "Getting a new person productive"],
      ["events", "Concept → Budgeting → Vendors → Promotion → Delivered", "Events and experiences"],
      ["blank", "New work", "You would rather not be given an opinion"],
    ],
  ),
  code(
    "bash",
    `curl -X POST https://lanes.axxes.app/api/v1/boards \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Q1 launch","template":"release","description":"Everything shipping in Q1"}'`,
  ),

  h2("keys", "Card keys"),
  p(
    <>
      Each board has a prefix, set once at creation and never changed — renumbering a board that has shipped breaks every
      reference to it. The prefix is derived from the board name unless you override it in settings.
    </>,
  ),
  code(
    "json",
    `{ "keyPrefix": "AB", "keyPadding": 2, "template": "sprint" }`,
    "The settings blob on the board",
  ),
  list([
    <>The prefix is normalised: upper-cased, non-alphanumerics stripped, at most six characters.</>,
    <>Padding is 1 to 6. A key with a number part is accepted padded or not, so <code>AB-7</code> and <code>AB-07</code> both resolve.</>,
    <>The sequence is per board and permanent. It is never the list position.</>,
  ]),

  h2("lanes", "Lanes"),
  p(
    <>
      A lane marked <em>done</em> is what makes a card complete: moving a card into one sets its completion time and mover,
      and moving it back out clears them. That is the only thing that decides whether a card is done, and it is the same rule
      the UI, the API and the analytics all use.
    </>,
  ),
  note(
    "info",
    "WIP limits are advisory",
    <>
      A lane can carry a work-in-progress limit. Lanes shows the lane as over its limit rather than refusing the move.
      Refusing is a policy decision, not a data rule, and a tool that silently drops your cards is a tool people stop
      trusting.
    </>,
  ),

  h2("pagination", "Pagination"),
  p(
    <>
      <code>GET /api/v1/boards</code> is cursor-paginated on <code>(updatedAt, id)</code>. Using both makes the cursor
      unique even when two boards are touched in the same millisecond, which happens constantly when a script writes.
    </>,
  ),
  code(
    "bash",
    `curl "https://lanes.axxes.app/api/v1/boards?limit=50" \\
  -H "Authorization: Bearer $LANES_TOKEN"

# then
curl "https://lanes.axxes.app/api/v1/boards?limit=50&cursor=$CURSOR" …`,
  ),
]
