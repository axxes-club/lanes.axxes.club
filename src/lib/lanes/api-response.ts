import { NextResponse } from "next/server"
import { LanesError } from "./errors"
import { rateLimitStoreName } from "./rate-limit"

/**
 * One response shape for the whole public API.
 *
 * Every endpoint answers with the same envelope, in the same order, so a
 * consumer can write its error handling once:
 *
 *   { "data": … }                      2xx
 *   { "error": { "message", "code", "hint", "requestId" } }   4xx / 5xx
 *
 * `hint` is the part that matters. "Forbidden" tells a developer nothing at
 * 01:00. "Your token cannot write. Ask for a token with the write scope"
 * tells them what to do next, and it costs one line here rather than a page
 * of support tickets.
 */

export type ApiErrorBody = {
  error: { message: string; code: string; hint?: string; requestId: string }
}

let counter = 0

/** A short id that can be quoted in a bug report and grepped in the logs. */
function requestId(req: Request): string {
  const existing = req.headers.get("x-request-id")
  if (existing) return existing
  // Deterministic within a process, unique enough to correlate a support
  // thread with a log line.
  return `req_${Date.now().toString(36)}${(counter++).toString(36).padStart(3, "0")}`
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init)
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 })
}

/** No body, but the same headers. 204 with a JSON body is a lie. */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function fail(req: Request, message: string, status: number, code: string, hint?: string) {
  const body: ApiErrorBody = {
    error: { message, code, requestId: requestId(req), ...(hint ? { hint } : {}) },
  }
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": body.error.requestId },
  })
}

/** Turn any thrown value into the standard shape. */
export function fromError(req: Request, e: unknown) {
  if (e instanceof LanesError) {
    return fail(req, e.message, e.status, codeFor(e.status), e.hint ?? undefined)
  }
  console.error("[api] unhandled", e)
  return fail(req, "Something went wrong on our side.", 500, "internal_error", "Retry. If it keeps happening, quote the request id.")
}

const codeFor = (status: number) =>
  status === 401 ? "unauthorized" :
  status === 403 ? "forbidden" :
  status === 404 ? "not_found" :
  status === 429 ? "rate_limited" : "bad_request"

/** Read and validate a JSON body without letting a malformed one 500. */
export async function body<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

/**
 * Standard headers on every response, including rate-limit state.
 *
 * `x-lanes-ratelimit-store` says which store is enforcing the ceiling. With
 * an in-process counter behind more than one instance the real ceiling is
 * N times the advertised one, and a client that trusts the header and gets
 * throttled with no 429 has no way to explain it. Publishing the store makes
 * that visible rather than a mystery.
 */
export function withHeaders(res: NextResponse, limits?: { limit: number; remaining: number; reset: number }) {
  res.headers.set("x-lanes-version", "2026-09-01")
  res.headers.set("x-lanes-ratelimit-store", rateLimitStoreName())
  if (limits) {
    res.headers.set("x-ratelimit-limit", String(limits.limit))
    res.headers.set("x-ratelimit-remaining", String(limits.remaining))
    res.headers.set("x-ratelimit-reset", String(limits.reset))
  }
  return res
}
