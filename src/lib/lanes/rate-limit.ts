import "server-only"

/**
 * Rate limiting.
 *
 * A token that can be handed to a script needs a ceiling, or one runaway
 * retry loop takes the whole workspace down with it. The counters live in
 * module scope, which is correct for a single instance and deliberately
 * documented as wrong for more than one: a real deployment puts a shared
 * store here (Upstash, Redis) and nothing else about the call sites changes.
 *
 * The limit is per token rather than per IP. An IP limit punishes an office
 * of fifty people sharing one address, which is the common case for a team
 * tool and a very effective way to make a company give up on it.
 */

const WINDOW_MS = 60_000
const LIMIT_WRITE = 120
const LIMIT_READ = 600

type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

// Housekeeping. A leaked map keyed by token id is a slow memory leak that
// only shows up in production, so entries are swept on the way through.
const SWEEP_EVERY = 500
let sweeps = 0

export type Limit = { limit: number; remaining: number; reset: number; ok: boolean }

export function rateLimit(key: string, kind: "read" | "write"): Limit {
  const limit = kind === "write" ? LIMIT_WRITE : LIMIT_READ
  const now = Date.now()

  if (++sweeps % SWEEP_EVERY === 0) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k)
  }

  const existing = buckets.get(key)
  if (!existing || existing.reset <= now) {
    const bucket = { count: 1, reset: now + WINDOW_MS }
    buckets.set(key, bucket)
    return { limit, remaining: limit - 1, reset: bucket.reset, ok: true }
  }

  existing.count += 1
  const remaining = Math.max(0, limit - existing.count)
  return { limit, remaining, reset: existing.reset, ok: existing.count <= limit }
}

export function retryAfterSeconds(limit: Limit): number {
  return Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
}
