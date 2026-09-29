import "server-only"

/**
 * Rate limiting.
 *
 * A token that can be handed to a script needs a ceiling, or one runaway
 * retry loop takes the whole workspace down with it.
 *
 * ── Why the store is pluggable ────────────────────────────────────────────
 * An in-process counter is correct for a single instance and silently wrong
 * for two: each instance counts separately, so the real ceiling becomes N ×
 * the limit and a client gets no error to tell it to slow down. The previous
 * version had a module-level Map and a comment admitting it was wrong for
 * more than one instance — which is the kind of comment that survives until
 * somebody runs two.
 *
 * So the store is an interface, the default is in-process, and
 * `setRateLimitStore` swaps in a shared one. The call sites do not change.
 *
 * A real deployment sets UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * and Lanes uses Redis; without them it uses memory and says so in a header,
 * so a client is never misled about the limit it is being held to.
 */

const WINDOW_MS = 60_000
const LIMIT_WRITE = 120
const LIMIT_READ = 600

export type Limit = { limit: number; remaining: number; reset: number; ok: boolean }

/** The minimum a store must provide. `increment` returns the new count. */
export interface RateLimitStore {
  name: string
  increment(key: string, windowMs: number): Promise<{ count: number; reset: number }>
}

type Bucket = { count: number; reset: number }

function memoryStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>()
  // Housekeeping. A map keyed by token id is a slow leak that only shows up
  // in production, so entries are swept as we go rather than never.
  const SWEEP_EVERY = 500
  let calls = 0

  return {
    name: "memory",
    async increment(key, windowMs) {
      if (++calls % SWEEP_EVERY === 0) {
        const now = Date.now()
        for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k)
      }
      const now = Date.now()
      const existing = buckets.get(key)
      if (!existing || existing.reset <= now) {
        const fresh = { count: 1, reset: now + windowMs }
        buckets.set(key, fresh)
        return fresh
      }
      existing.count += 1
      return existing
    },
  }
}

function redisStore(url: string, token: string): RateLimitStore {
  return {
    name: "redis",
    async increment(key, windowMs) {
      // A sorted-set window: ZREMRANGEBYSCORE trims what has expired, ZADD
      // records this hit, and ZCARD counts what is left. All three in one
      // round trip, because a limit is on the hot path of every API call.
      const bucket = Math.floor(Date.now() / windowMs)
      const member = `${bucket}:${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["ZREMRANGEBYSCORE", key, "-inf", bucket * windowMs],
          ["ZADD", key, Date.now(), member],
          ["ZCARD", key],
          ["PEXPIRE", key, windowMs * 2],
        ]),
      })
      if (!res.ok) throw new Error(`rate limit store: ${res.status}`)
      const count = (await res.json())[2] as number
      return { count, reset: (bucket + 1) * windowMs }
    },
  }
}

function buildStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    try {
      return redisStore(url, token)
    } catch {
      // Fall through to memory rather than failing every request.
    }
  }
  return memoryStore()
}

let store: RateLimitStore = buildStore()

/** Swap the store. Called once at startup, or from a test. */
export function setRateLimitStore(next: RateLimitStore) {
  store = next
}

export function rateLimitStoreName(): string {
  return store.name
}

export async function rateLimit(key: string, kind: "read" | "write"): Promise<Limit> {
  const limit = kind === "write" ? LIMIT_WRITE : LIMIT_READ
  let bucket: { count: number; reset: number }
  try {
    bucket = await store.increment(key, WINDOW_MS)
  } catch {
    // A rate limiter that is down must not be an outage. The cost is that one
    // window goes unlimited; the alternative is refusing every API call
    // because a cache is unreachable, which is a far worse failure.
    return { limit, remaining: limit, reset: Date.now() + WINDOW_MS, ok: true }
  }
  return { limit, remaining: Math.max(0, limit - bucket.count), reset: bucket.reset, ok: bucket.count <= limit }
}

export function retryAfterSeconds(limit: Limit): number {
  return Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))
}
