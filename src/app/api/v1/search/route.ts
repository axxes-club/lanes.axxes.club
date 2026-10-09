import { authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { fail, ok, withHeaders } from "@/lib/lanes/api-response"
import { rateLimit, retryAfterSeconds } from "@/lib/lanes/rate-limit"
import { searchWorkspace } from "@/lib/lanes/search"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/search?q=… — boards, cards and people, ranked.
 *
 * The same `searchWorkspace` the command palette and the search page call.
 * Three surfaces sharing one ranking function is the entire point: if each
 * had its own query, the same query would return the same board in three
 * different positions, and the first person to notice would stop trusting
 * all three.
 *
 * The ranking rules are documented and stable on purpose:
 *
 *   1. a key or title prefix beats a substring match
 *   2. a title match beats a description match
 *   3. newer work beats older work at equal relevance
 *
 * A result set that reorders itself between releases is worse than a worse
 * result set, because a team builds a habit around it.
 */
export async function GET(req: Request) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized(req)
  if (!auth.scope("read")) return forbidden("This token cannot read.", undefined, req)

  const limit = await rateLimit(`${auth.tokenId}:read`, "read")
  if (!limit.ok) {
    return withHeaders(
      fail(req, "Rate limit exceeded.", limit.unavailable ? 503 : 429, "rate_limited", `Try again in ${retryAfterSeconds(limit)}s.`),
      limit,
    )
  }

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  if (!q) {
    return withHeaders(
      fail(req, "A query is required.", 400, "bad_request", `Send ?q=sprint, or a card key like ?q=WEB-42.`),
      limit,
    )
  }

  const kindsParam = url.searchParams.get("kinds")
  const kinds = kindsParam
    ? (kindsParam.split(",").map((k) => k.trim()).filter(Boolean) as ("board" | "card" | "person")[])
    : undefined
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20))

  const hits = await searchWorkspace(auth.tenantId, q, { limit: take, kinds })

  return withHeaders(
    ok({
      query: q,
      total: hits.length,
      results: hits.map((h) => ({
        type: h.kind,
        id: h.id,
        title: h.title,
        subtitle: h.subtitle,
        // The in-app path, not an API path: a search result is a place a
        // person goes, and a person goes to the product.
        url: h.href,
        score: h.score,
        meta: h.meta ?? {},
      })),
    }),
    limit,
  )
}
