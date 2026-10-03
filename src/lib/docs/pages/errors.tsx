import { code, h2, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const errors: DocBody = [
  p(
    <>
      Every failure has the same shape, so your error handling is written once and never branched on which route was called.
    </>,
  ),
  code(
    "json",
    `{
  "error": {
    "message": "A card needs a title.",
    "code": "bad_request",
    "hint": "Send { \\"title\\": \\"Ship the thing\\" }.",
    "requestId": "req_muly4whn000"
  }
}`,
  ),
  table(
    ["Field", "Always present", "What it is"],
    [
      ["message", "yes", "What went wrong, in one sentence."],
      ["code", "yes", "A stable machine token. Branch on this, not on the message."],
      ["hint", "no", "What to do next. Written for a developer at 01:00."],
      ["requestId", "yes", "Also sent as x-request-id. Quote it in a bug report."],
    ],
  ),
  note(
    "info",
    "Read the hint",
    <>
      It is the part that saves you an hour. &ldquo;Forbidden&rdquo; on its own is not an answer;{" "}
      &ldquo;Your token cannot write. Issue a token with the write scope.&rdquo; is.
    </>,
  ),

  h2("codes", "Status codes"),
  table(
    ["Status", "code", "Means"],
    [
      ["400", "bad_request", "The body or query was not usable. The hint says which part."],
      ["401", "unauthorized", "No token, a malformed one, or one that is revoked or expired."],
      ["403", "forbidden", "Valid token, not allowed. Either a scope or a board role."],
      ["404", "not_found", "No such board or card in this workspace. Cross-workspace ids are 404, never 403 — a 403 would confirm the record exists."],
      ["429", "rate_limited", "Too many requests. x-ratelimit-reset says when."],
      ["500", "internal_error", "Ours. Retry; if it persists, quote the requestId."],
    ],
  ),

  h2("a-handler", "A handler that needs no per-route branches"),
  code(
    "ts",
    `type Envelope<T> = { data: T } | { error: { message: string; code: string; hint?: string; requestId: string } }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(\`https://lanes.axxes.app/api/v1\${path}\`, {
    ...init,
    headers: { Authorization: \`Bearer \${process.env.LANES_TOKEN}\`, "Content-Type": "application/json", ...init?.headers },
  })

  if (res.status === 429) {
    // Back off using the header rather than a guessed sleep.
    await new Promise((r) => setTimeout(r, Number(res.headers.get("x-ratelimit-reset")) * 1000))
    return call<T>(path, init)
  }

  const body: Envelope<T> = await res.json().catch(() => ({ error: { message: "Unreadable response", code: "internal_error", requestId: "-" } }))

  if ("error" in body) {
    // console.error(body.error.requestId) goes with the bug report, not the message.
    throw Object.assign(new Error(body.error.message), { code: body.error.code, hint: body.error.hint, requestId: body.error.requestId })
  }
  return body.data
}`,
  ),

  h2("idempotency", "Retry safety"),
  p(
    <>
      <code>GET</code> is safe to retry. <code>PATCH</code> is safe too, because it only touches the fields you send.{" "}
      <code>POST</code> is not: a retried create makes a second card. If your integration can retry, send a title derived
      from your own identifier and reconcile on the key, or check for the card first with{" "}
      <a href="/docs/search">search</a>.
    </>,
  ),
]
