import { code, ep, h2, list, note, p } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const quickstart: DocBody = [
  p(
    <>
      This takes about two minutes and leaves you with a board, a card, and a token you can use from a script. Every command
      below is real and has been run against a live instance.
    </>,
  ),

  h2("get-a-token", "1. Get a token"),
  p(
    <>
      Open <strong>Settings &rarr; API tokens</strong> in any Lanes workspace. Tokens are created there, shown once, and stored
      only as a SHA-256 hash — the server cannot show you yours again. If you lose it, revoke it and make another.
    </>,
  ),
  note(
    "info",
    "A token acts as a person",
    <>
      A token does not have permissions of its own. It resolves to the board role of the person who made it, so a script can
      do exactly what its owner could do and not one thing more. That is the property that makes it safe to hand to a
      third-party integration.
    </>,
  ),

  h2("first-request", "2. Make your first request"),
  p(
    <>
      <code>Authorization</code> takes the token, and every response comes back inside a <code>data</code> envelope.
    </>,
  ),
  code(
    "bash",
    `curl https://lanes.axxes.club/api/v1/boards \\
  -H "Authorization: Bearer lnk_9f2c1a7b4e8d6035_5hK2pQ…"`,
    "Every board in the workspace",
  ),
  code(
    "json",
    `{
  "data": {
    "boards": [
      {
        "id": "38acb6b3-80ea-46db-b261-b5ecdd57ed40",
        "name": "AXXES Backlog",
        "keyPrefix": "AB",
        "cards": { "open": 24, "done": 1 },
        "updatedAt": "2026-09-28T20:58:14.086Z"
      }
    ],
    "nextCursor": null
  }
}`,
    "200 OK",
  ),

  h2("create", "3. Create a board and a card"),
  ep("POST", "/api/v1/boards", "Create a board from a template"),
  code(
    "bash",
    `curl -X POST https://lanes.axxes.club/api/v1/boards \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Website relaunch","template":"sprint"}'`,
  ),
  p(
    <>
      The <code>template</code> key comes from the shared registry, so adding a template to the product adds it to the API
      with no change here. The full set is on the <a href="/docs/boards">Boards</a> page.
    </>,
  ),
  code(
    "bash",
    `curl -X POST https://lanes.axxes.club/api/v1/boards/$BOARD/cards \\
  -H "Authorization: Bearer $LANES_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Rewrite the pricing page","priority":"high"}'`,
    "The card lands in the board's first lane",
  ),

  h2("keys", "4. Use the key, not the id"),
  p(
    <>
      Every card gets a short key like <code>AB-42</code> — the thing you would say out loud in a stand-up. Keys are stable
      across export, import and a change of database; UUIDs are not. The API takes either, and zero padding is optional, so{" "}
      <code>AB-42</code> and <code>AB-042</code> both resolve.
    </>,
  ),
  code(
    "bash",
    `curl https://lanes.axxes.club/api/v1/cards/AB-42 \\
  -H "Authorization: Bearer $LANES_TOKEN"`,
  ),
  note(
    "good",
    "Keys are made unique for you",
    <>
      A key is only as good as the sequence behind it. Cards created through any of Lanes&apos; own paths — the UI, the API,
      an import — are always numbered, so two cards on one board can never share a key.
    </>,
  ),

  h2("next", "Where to go next"),
  list([
    <a href="/docs/cards">Cards</a>,
    <a href="/docs/search">Search</a>,
    <a href="/docs/webhooks">Webhooks</a>,
    <a href="/docs/permissions">Permissions</a>,
    <a href="/docs/migration">Migrating from another tool</a>,
  ]),
]
