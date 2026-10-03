import { code, ep, h2, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const cards: DocBody = [
  p(
    <>
      A card is a task on a board. It has a stable key, a lane, and enough structure to carry a discussion and a history
      without leaving the tool.
    </>,
  ),

  h2("addressing", "Addressing a card"),
  p(
    <>
      Two forms, both stable. A key like <code>AB-42</code> survives export, import and a change of database; a UUID does
      not. Anything a human is going to type into a script should be the key.
    </>,
  ),
  p("Card lists are ordered by position and ID. Use nextCursor as the cursor parameter to load the next page, keeping the same list filter. A null nextCursor marks the final page. The maximum page size is 200."),
  code(
    "bash",
    `curl https://lanes.axxes.app/api/v1/cards/AB-42     -H "Authorization: Bearer $LANES_TOKEN"
curl https://lanes.axxes.app/api/v1/cards/ab-42     -H "Authorization: Bearer $LANES_TOKEN"
curl https://lanes.axxes.app/api/v1/cards/AB-0042   -H "Authorization: Bearer $LANES_TOKEN"
curl https://lanes.axxes.app/api/v1/cards/$UUID     -H "Authorization: Bearer $LANES_TOKEN"`,
    "All four are the same card",
  ),

  h2("create", "Creating"),
  ep("POST", "/api/v1/boards/:id/cards", "Create a card in a lane"),
  table(
    ["Field", "Type", "Notes"],
    [
      ["title", "string", "Required. 1–300 characters."],
      ["description", "string", "Markdown, up to 20,000 characters."],
      ["listId", "string", "Which lane. Defaults to the board's first lane."],
      ["priority", "enum", "low · medium · high · urgent"],
      ["dueDate", "string", "ISO 8601. Setting it to null clears it."],
    ],
  ),
  code(
    "bash",
    `curl -X POST https://lanes.axxes.app/api/v1/boards/$BOARD/cards \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Rotate the signing key","priority":"high","dueDate":"2026-12-01T17:00:00Z"}'`,
  ),

  h2("update", "Updating and moving"),
  p(
    <>
      <code>PATCH</code> touches only the keys present in the body. Moving is not a separate concept: send{" "}
      <code>listId</code> and the card moves, with its completion state recalculated from the lane it lands in.
    </>,
  ),
  code(
    "bash",
    `# Only the priority changes
curl -X PATCH https://lanes.axxes.app/api/v1/cards/AB-42 \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"priority":"urgent"}'

# Move it into the done lane
curl -X PATCH https://lanes.axxes.app/api/v1/cards/AB-42 \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d "{\\"listId\\":\\"$DONE_LANE\\"}"`,
  ),
  note(
    "info",
    "A move needs its own permission",
    <>
      Editing a card needs <code>card.update</code>; moving one needs <code>card.move</code>. They are separate because
      "this needs fixing" and "this changes what the team is working on" are different decisions, and a read-heavy
      integration should not be able to do the second one by accident.
    </>,
  ),

  h2("delete", "Deleting"),
  p(
    <>
      <code>DELETE</code> is a soft delete: the row stays, <code>deleted_at</code> is set, and the call returns{" "}
      <code>204</code> with no body. A tool that can quietly erase a backlog is one people stop trusting with a backlog.
    </>,
  ),
  code(
    "bash",
    `curl -X DELETE https://lanes.axxes.app/api/v1/cards/AB-42 \\
  -H "Authorization: Bearer $LANES_TOKEN" -i
# HTTP/1.1 204 No Content`,
  ),

  h2("custom-fields", "Custom fields"),
  p(
    <>
      <code>customFields</code> is a JSON object on the card carrying a stable <code>seq</code> plus any board-defined
      values. Lanes reads the sequence out of it, so{" "}
      <strong>do not overwrite the object</strong> — merge into it.
    </>,
  ),
  code(
    "json",
    `{ "seq": 42, "severity": "S1", "component": "checkout" }`,
  ),
  note(
    "warn",
    "seq is not yours to set",
    <>
      It is what the key is made of. Sending a <code>seq</code> that collides with another card&apos;s makes two cards share
      a key, and a key that silently addresses the wrong card is worse than no key at all.
    </>,
  ),
]
