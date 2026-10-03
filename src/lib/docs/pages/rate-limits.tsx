import { code, h2, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"

export const rateLimits: DocBody = [
  p(
    <>
      A token that can be handed to a script needs a ceiling, or one runaway retry loop takes the whole workspace down with
      it.
    </>,
  ),

  h2("the-ceiling", "The ceiling"),
  table(
    ["Kind", "Per minute", "Counts"],
    [
      ["read", "600", "GET"],
      ["write", "120", "POST, PATCH, DELETE"],
    ],
  ),
  note(
    "info",
    "Per token, not per IP",
    <>
      An IP limit punishes an office of fifty people sharing one address, which is the normal shape of a team tool and a
      very effective way to make a company give up on it. The counter is keyed to the token, so two integrations cannot
      spend each other&apos;s budget.
    </>,
  ),

  h2("headers", "The headers"),
  p(<>Every response carries them, including successful ones, so a client can adapt before it hits a 429.</>),
  code(
    "bash",
    `curl -sI https://lanes.axxes.app/api/v1/boards -H "Authorization: Bearer $LANES_TOKEN" \\
  | grep -i x-ratelimit

# x-ratelimit-limit: 600
# x-ratelimit-remaining: 598
# x-ratelimit-reset: 1780000000000`,
    "Unix milliseconds",
  ),

  h2("backing-off", "Backing off properly"),
  p(
    <>
      When you are limited you get a 429 with a <code>hint</code> that already says how long to wait. Use the header
      rather than a guessed sleep — a fixed backoff either wastes the tail of your budget or hammers the wall.
    </>,
  ),
  code(
    "ts",
    `async function call(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, { ...init, headers: auth(init?.headers) })
  if (res.status === 429) {
    const seconds = Math.max(1, Math.ceil(Number(res.headers.get("x-ratelimit-reset")) * 1000 / 1000 - Date.now() / 1000))
    await new Promise((r) => setTimeout(r, seconds * 1000))
    return call(path, init)   // one retry; the window has reset by then
  }
  return res
}`,
  ),
  list([
    <>Retry at most once per call. A client that loops on 429 turns a soft limit into a hard outage.</>,
    <>Jitter if you have many workers, so they do not all wake on the same millisecond.</>,
    <>Watch <code>x-ratelimit-remaining</code> in tests, not just in production. A test suite that shares one token will hit the ceiling long before production does.</>,
  ]),

  h2("today", "One honest caveat"),
  p(
    <>
      Counters currently live in the memory of a single instance, which is correct for one and wrong for more. Before
      running two or more, put a shared store behind <code>rateLimit()</code> in{" "}
      <code>src/lib/lanes/rate-limit.ts</code> — the call sites do not change, only that function does. It is called out
      here rather than left to be discovered during an incident.
    </>,
  ),
]
