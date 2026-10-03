import { code, h2, list, note, ordered, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const search: DocBody = [
  p(
    <>
      One ranked search over boards, cards and people. The command palette, the search page and this endpoint call the same
      function, so the same query returns the same ordering everywhere.
    </>,
  ),

  h2("use", "Using it"),
  code(
    "bash",
    `curl "https://lanes.axxes.app/api/v1/search?q=onboarding" \\
  -H "Authorization: Bearer $LANES_TOKEN"`,
  ),
  code(
    "json",
    `{
  "data": {
    "query": "onboarding",
    "total": 2,
    "results": [
      {
        "type": "card",
        "id": "b0e9506e-44c5-4dc0-9374-28c682a2b1fa",
        "title": "Onboarding checklist for new engineers",
        "subtitle": "AB-14 · AXXES Backlog · Ready",
        "url": "/dashboard/b/38acb6b3…?card=b0e9506e…",
        "score": 700,
        "meta": { "key": "AB-14", "board": "AXXES Backlog", "list": "Ready" }
      }
    ]
  }
}`,
  ),
  table(
    ["Parameter", "Default", "Notes"],
    [
      ["q", "required", "The query. A card key like WEB-42 jumps straight to that card."],
      ["kinds", "all", "Comma-separated: board, card, person"],
      ["limit", "20", "1–100"],
    ],
  ),

  h2("ranking", "The ranking, and why it is not clever"),
  p(
    <>
      Someone who types <code>onb</code> and gets &ldquo;Website onboarding&rdquo; has to be able to predict the rest of the
      list. Anything clever breaks that habit, so the rules are four and they are stable:
    </>,
  ),
  ordered([
    <>An exact key match, or a card key like <code>WEB-42</code>, scores highest of all.</>,
    <>A prefix match on the title beats a substring match.</>,
    <>A word-boundary match beats a bare substring match, so &ldquo;board&rdquo; finds &ldquo;Boards&rdquo; and not &ldquo;reboard&rdquo;.</>,
    <>A title match beats a description match.</>,
    <>Newer work beats older work at equal relevance.</>,
  ]),
  note(
    "info",
    "The rules do not change under you",
    <>
      A result set that reorders itself between releases is worse than a worse result set, because a team builds a habit
      around it. If a rule has to change it will be additive and documented here.
    </>,
  ),

  h2("matching", "Prefixes, not substrings"),
  p(
    <>
      The index is a prefix match over the title, the key and the description. That is a deliberate trade: it is fast and
      predictable, and it will not find a word buried in the middle of a paragraph. The board search and people search have
      the same property.
    </>,
  ),
  code(
    "json",
    `// meta carries everything a caller needs to render a row
"meta": { "key": "AB-14", "board": "AXXES Backlog", "list": "Ready", "done": 0, "dueDate": null }`,
  ),
  list([
    <><code>done</code> is 1 when the card sits in a lane marked done.</>,
    <><code>dueDate</code> is ISO 8601 or null. Compare it yourself rather than trusting a formatted string.</>,
    <><code>url</code> is an in-app path, not an API path. A search result is a place a person goes.</>,
  ]),
]
