import { code, h2, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const introduction: DocBody = [
  p(
    <>
      Lanes is the delivery workspace for teams that ship. This documentation is the developer surface: a REST API over
      boards, cards, lanes and sprints, using the same permission model the interface uses.
    </>,
  ),
  note(
    "info",
    "One API, not five",
    <>
      The command palette, the search page and <code>/api/v1/search</code> all call the same ranking function. Two surfaces
      that each had their own query would rank the same board differently, and the first person to notice would stop
      trusting both. The same holds for permissions: the board, the card panel, the API and a webhook all consult one
      table.
    </>,
  ),

  h2("shape", "The shape of the API"),
  p(
    <>
      A handful of resources, all under <code>/api/v1</code>. Every response is either <code>{"{ data }"}</code> or{" "}
      <code>{"{ error: { message, code, hint, requestId } }"}</code> — never a third shape.
    </>,
  ),
  table(
    ["Route", "What it does"],
    [
      ["GET /api/v1/boards", "List boards, cursor-paginated"],
      ["POST /api/v1/boards", "Create a board from a template"],
      ["GET /api/v1/boards/:id", "One board with its lanes and counts"],
      ["GET /api/v1/boards/:id/cards", "Every card on a board"],
      ["POST /api/v1/boards/:id/cards", "Create a card"],
      ["GET /api/v1/cards/:id", "One card, by UUID or by key"],
      ["PATCH /api/v1/cards/:id", "Partial update, including moves"],
      ["DELETE /api/v1/cards/:id", "Soft delete"],
      ["GET /api/v1/search", "Boards, cards and people, ranked"],
    ],
  ),

  h2("conventions", "Conventions worth knowing before you start"),
  list([
    <>
      <strong>Keys, not positions.</strong> A card&apos;s <code>key</code> is stable. Its <code>position</code> is a float
      that changes every time somebody drags it, and is never something to store.
    </>,
    <>
      <strong>Deletes are soft.</strong> <code>DELETE</code> sets <code>deleted_at</code> and returns{" "}
      <code>204</code>. The row is still there to audit.
    </>,
    <>
      <strong>Identifiers are scoped.</strong> Every query is scoped to the token&apos;s workspace. A board in one
      organization can never surface a record from another, even by guessing an id.
    </>,
    <>
      <strong>Errors say what to do.</strong> Every error carries a <code>hint</code> aimed at the developer holding the
      request at 01:00, not at an end user.
    </>,
  ]),

  h2("versioning", "Versioning"),
  p(
    <>
      The version is in the path and the date in a response header. Breaking changes get a new path; additive ones do not.{" "}
      <code>x-lanes-version</code> tells you which you are talking to.
    </>,
  ),
  code("bash", `curl -sI https://lanes.axxes.club/api/v1/boards -H "Authorization: Bearer $LANES_TOKEN" | grep -i x-lanes`),

  h2("where-next", "Where to go next"),
  list([
    <>
      <a href="/docs/quickstart">Quickstart</a> — a board, a card and a token in about two minutes.
    </>,
    <>
      <a href="/docs/authentication">Authentication</a> — tokens, scopes, and what a token can do.
    </>,
    <>
      <a href="/docs/migration">Migrating</a> — coming from Jira, Linear, Trello or Asana.
    </>,
  ]),
]
