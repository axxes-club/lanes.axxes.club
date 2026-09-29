import { OPENAPI } from "@/lib/docs/openapi"

export const dynamic = "force-static"

/**
 * GET /api/v1/openapi.json
 *
 * The same document the docs page renders. Generated from one source, so
 * "the documentation" and "the machine-readable specification" are not two
 * things that quietly disagree.
 */
export async function GET() {
  return new Response(JSON.stringify(OPENAPI, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  })
}
