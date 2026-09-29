import { code, h2, h3, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const authentication: DocBody = [
  p(
    <>
      Every request is authenticated with a bearer token. There are no sessions, no cookies and no OAuth flow in the API
      surface — a token stands in for exactly one person, and it can do exactly what that person can do.
    </>,
  ),

  h2("tokens", "Tokens"),
  p(
    <>
      Tokens are created in <strong>Settings &rarr; API tokens</strong>. The secret is shown once and stored only as a
      SHA-256 hash, so a database compromise hands over no working credential.
    </>,
  ),
  code("text", `lnk_<32 hex characters>_<43 character secret>`),
  list([
    <>
      The middle section is the token&apos;s id with its UUID dashes removed. It is located by <em>position</em>, not by
      splitting on <code>_</code>: base64url emits <code>_</code> as a character, so roughly half of all secrets contain one
      and a split would reject the tokens that happened to be minted with it.
    </>,
    <>Give each integration its own token. Revoking one script should not revoke another.</>,
    <>Set an expiry. A token without one is a token you will forget.</>,
  ]),

  h2("scopes", "Scopes"),
  p(
    <>
      A scope narrows what a token may attempt. It is not a second permission system — the board role still applies — it is
      a way to stop a read-only reporting script from ever issuing a write.
    </>,
  ),
  table(
    ["Scope", "Allows"],
    [
      ["read", "GET requests"],
      ["write", "POST, PATCH and DELETE requests"],
      ["*", "Everything, for a token you control end to end"],
    ],
  ),
  code(
    "bash",
    `# 403 with a hint, rather than a mysterious 401
{
  "error": {
    "message": "This token cannot write.",
    "code": "forbidden",
    "hint": "Issue a token with the write scope.",
    "requestId": "req_muly4whn000"
  }
}`,
  ),

  h2("resolution", "How a permission is decided"),
  ordered([
    <>The token is resolved to the person who created it.</>,
    <>That person&apos;s board role is read for the board in the URL.</>,
    <>A workspace manager or owner is elevated above their board role, so nobody is locked out of a board their organization owns.</>,
    <>The scope narrows the result, and the endpoint&apos;s own check has the last word.</>,
  ]),
  note(
    "warn",
    "Authorization is re-derived every time",
    <>
      Nothing trusts a claim made by the client, a cookie, or a field in a request body. Every request re-reads the board
      role from the database, so changing somebody&apos;s role takes effect on their next call rather than when their session
      expires.
    </>,
  ),

  h2("errors", "Authentication failures"),
  table(
    ["Status", "Meaning", "What to do"],
    [
      ["401", "Missing, malformed, revoked or expired token", "Check the Authorization header format"],
      ["403", "Valid token, not allowed", "Read the hint; it names the permission and the board"],
      ["429", "Rate limited", "Back off using x-ratelimit-reset"],
    ],
  ),
]
