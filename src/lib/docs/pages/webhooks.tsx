import { code, h2, h3, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const webhooks: DocBody = [
  p(
    <>
      A webhook is an HTTP POST to your URL when something happens on a board. Deliveries are signed, so you can tell a real
      event from somebody replaying one.
    </>,
  ),
  note(
    "warn",
    "Registering a webhook is not in the public API yet",
    <>
      The <code>webhooks</code> table and its permission exist and are live, but the registration endpoints are not
      published. Until they are, webhooks are configured from the board settings screen. This page documents the delivery
      contract so you can build a receiver now; the registration call will be added to{" "}
      <a href="/docs/openapi">OpenAPI</a> when it ships rather than being documented ahead of itself.
    </>,
  ),

  h2("payload", "The payload"),
  code(
    "json",
    `{
  "id": "evt_01HQ8K2M9X",
  "type": "card.moved",
  "createdAt": "2026-09-28T20:58:14.086Z",
  "data": {
    "board": { "id": "38acb6b3…", "name": "AXXES Backlog", "keyPrefix": "AB" },
    "card": { "id": "b0e9506e…", "key": "AB-42", "title": "Rewrite the pricing page" },
    "from": { "listId": "d0b0ecb9…", "listName": "Ready" },
    "to":   { "listId": "ca917c4f…", "listName": "Done" },
    "actor": { "id": "9WWz4P0R…", "name": "Jose Viscasillas" }
  }
}`,
  ),
  p(
    <>
      The event <code>id</code> is stable across delivery attempts. Deduplicate on it — a webhook endpoint that is
      restarted mid-delivery will see the same event twice.
    </>,
  ),

  h2("verification", "Verifying the signature"),
  p(
    <>
      Every request carries <code>X-Lanes-Signature</code>, an HMAC-SHA256 of the raw body keyed by the secret shown when
      the webhook was created. Compare with a constant-time comparison: a byte-by-byte <code>===</code> on a signature
      leaks it a character at a time.
    </>,
  ),
  code(
    "ts",
    `import { createHmac, timingSafeEqual } from "node:crypto"

export async function POST(req: Request) {
  const body = await req.text()                       // raw bytes, before any parsing
  const header = req.headers.get("X-Lanes-Signature")
  if (!header) return new Response("no signature", { status: 401 })

  const expected = createHmac("sha256", process.env.LANES_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex")

  const a = Buffer.from(header, "utf8")
  const b = Buffer.from(expected, "utf8")
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("bad signature", { status: 401 })
  }

  const event = JSON.parse(body)
  // Acknowledge before doing slow work: a 5-second timeout means a webhook
  // receiver that processes inline will be retried even on success.
  queue(event)
  return new Response("ok", { status: 200 })
}`,
  ),

  h2("events", "Event types"),
  table(
    ["Event", "Fires when"],
    [
      ["board.created", "A board is created"],
      ["card.created", "A card is added to a lane"],
      ["card.moved", "A card changes lane, including into and out of done"],
      ["card.updated", "A card's title, description, priority or due date changes"],
      ["card.deleted", "A card is soft-deleted"],
      ["comment.added", "Somebody comments on a card"],
      ["sprint.started", "A sprint begins"],
      ["sprint.completed", "A sprint closes"],
    ],
  ),

  h2("responding", "Responding"),
  list([
    <>Answer <code>2xx</code> within five seconds. Do the work afterwards.</>,
    <>A non-2xx is retried with exponential backoff, and eventually the endpoint is disabled and the failure is surfaced on the board rather than swallowed.</>,
    <>Disable the webhook from the board settings if your endpoint is down for maintenance, rather than letting the queue fill.</>,
  ]),
]
