import { OPENAPI } from "@/lib/docs/openapi"
import { h2, list, note, p, table } from "@/lib/docs/content"
import type { DocBody } from "@/lib/docs/content"
import { DocBodyView } from "@/lib/docs/render"
import { findDoc } from "@/lib/docs/nav"

export const metadata = { title: "OpenAPI", description: findDoc("openapi")?.summary }

/**
 * The reference, generated from the document that is also served as JSON.
 *
 * The page and the spec are the same object. A hand-written table and a
 * hand-written spec are two artefacts that disagree within a release, and the
 * one a developer is reading at 02:00 is whichever they found first.
 */

const METHOD_TONE: Record<string, string> = {
  get: "bg-info-soft text-info",
  post: "bg-success-soft text-success",
  patch: "bg-warning-soft text-warning",
  delete: "bg-danger-soft text-danger",
}

const INTRO: DocBody = [
  p(
    <>
      This page is rendered from <code>/api/v1/openapi.json</code>. Point your generator at that URL and you get the same
      thing, including the descriptions.
    </>,
  ),
  note(
    "info",
    "Everything below is generated",
    <>
      There is no hand-written reference table to fall out of date. Adding a field to a response changes this page and the
      served spec in the same commit.
    </>,
  ),
  h2("generate-a-client", "Generate a client"),
  code0("bash", `curl -o openapi.json https://lanes.axxes.app/api/v1/openapi.json

# TypeScript
npx openapi-typescript openapi.json -o lanes.d.ts

# Python
pip install openapi-python-client && openapi-python-client generate --path openapi.json`),
  h2("endpoints", "Endpoints"),
]

const body: DocBody = [
  ...INTRO,
  ...Object.entries(OPENAPI.paths).flatMap(([path, ops]) =>
    Object.entries(ops as Record<string, { summary: string; description?: string; responses: Record<string, unknown> }>).map(
      ([method, op]) => ({
        kind: "endpoint" as const,
        method: method.toUpperCase() as "GET" | "POST" | "PATCH" | "DELETE",
        path,
        blurb: op.summary,
      }),
    ),
  ),
  h2("responses", "Response codes"),
  table(
    ["Status", "Meaning"],
    [
      ["200", "Success, with a body"],
      ["201", "Created, with the new resource"],
      ["204", "Deleted. No body, by design — a 204 with a JSON body is a lie."],
      ["400", "The body or query was not usable. The hint says which part."],
      ["401", "No token, malformed, revoked or expired."],
      ["403", "Valid token, not allowed. A scope or a board role."],
      ["404", "No such board or card in this workspace. Cross-workspace ids are 404, never 403 — a 403 would confirm the record exists."],
      ["429", "Rate limited. x-ratelimit-reset says when."],
    ],
  ),
  h2("the-envelope", "The envelope"),
  code0("json", `{
  "data": { "…": "the resource" }
}

// or

{
  "error": {
    "message": "This token cannot write.",
    "code": "forbidden",
    "hint": "Issue a token with the write scope.",
    "requestId": "req_muly4whn000"
  }
}`),
  list([
    <>Branch on <code>code</code>, never on <code>message</code>. Messages get reworded; codes do not.</>,
    <>Quote <code>requestId</code> in a bug report. It is also the x-request-id header.</>,
  ]),
]

function code0(lang: string, code: string): DocBody[number] {
  return { kind: "code", lang, code }
}

export default function OpenApiPage() {
  return (
    <div className="min-w-0 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">OpenAPI</h1>
      <p className="mt-2 text-lg text-muted text-pretty">{findDoc("openapi")?.summary}</p>
      <div className="mt-8">
        <DocBodyView body={body} />
      </div>
    </div>
  )
}
