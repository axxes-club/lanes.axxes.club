import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { authenticate, forbidden, unauthorized } from "@/lib/lanes/api-auth"
import { body, created, fail, ok, withHeaders } from "@/lib/lanes/api-response"
import { rateLimit, retryAfterSeconds } from "@/lib/lanes/rate-limit"
import { cardKey } from "@/lib/lanes/prefix"
import { template } from "@/lib/lanes/templates"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/boards — every board in the workspace, with counts.
 *
 * Paginated by cursor rather than offset. `updatedAt, id` is the sort, and
 * using both makes the cursor unique even when two boards are touched in the
 * same millisecond — which happens constantly when a script writes.
 */
export async function GET(req: Request) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized(req)
  if (!auth.scope("read")) return forbidden("This token cannot read.", "Issue a token with the read scope.", req)

  const limit = clamp(Number(new URL(req.url).searchParams.get("limit") ?? 50), 1, 200)
  const limit_ = rateLimit(`${auth.tokenId}:read`, "read")
  if (!limit_.ok) {
    return withHeaders(
      fail(req, "Rate limit exceeded.", 429, "rate_limited", `Try again in ${retryAfterSeconds(limit_)}s.`),
      limit_,
    )
  }

  const url = new URL(req.url)
  const cursor = url.searchParams.get("cursor")

  const rows = await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      description: schema.projects.description,
      color: schema.projects.color,
      status: schema.projects.status,
      settings: schema.projects.settings,
      createdAt: schema.projects.createdAt,
      updatedAt: schema.projects.updatedAt,
      // The correlated subqueries reference the outer row through
      // `schema.projects.id` rather than a literal table name: Drizzle
      // renders it as the properly quoted `"projects"."id"`, and hand-writing
      // the name produces `c.project_id = schema.projects.id`, which Postgres
      // reads as a column named "schema".
      open: sql<number>`(select count(*) from project_cards c join project_lists l on l.id = c.list_id where c.project_id = ${schema.projects.id} and c.deleted_at is null and c.archived_at is null and not coalesce(l.is_done_list, false))`.mapWith(Number),
      done: sql<number>`(select count(*) from project_cards c join project_lists l on l.id = c.list_id where c.project_id = ${schema.projects.id} and c.deleted_at is null and c.archived_at is null and coalesce(l.is_done_list, false))`.mapWith(Number),
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.tenantId, auth.tenantId),
        isNull(schema.projects.deletedAt),
        isNull(schema.projects.archivedAt),
        cursor
          ? sql`(${schema.projects.updatedAt}, ${schema.projects.id}) < (${cursor.split("|")[0]}::timestamptz, ${cursor.split("|")[1]}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(schema.projects.updatedAt), desc(schema.projects.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page.at(-1)

  return withHeaders(
    ok({
      boards: page.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        color: b.color,
        status: b.status,
        keyPrefix: cardKey(b.settings, b.name, 0).split("-")[0],
        cards: { open: b.open, done: b.done },
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      nextCursor: hasMore && last ? `${last.updatedAt.toISOString()}|${last.id}` : null,
    }),
    limit_,
  )
}

/**
 * POST /api/v1/boards — create a board from a template.
 *
 * `template` accepts any key in the registry (src/lib/lanes/templates.ts),
 * so adding a template to the product adds it to the API with no change here.
 */
export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized(req)
  if (!auth.scope("write")) return forbidden("This token cannot write.", "Issue a token with the write scope.", req)

  const limit_ = rateLimit(`${auth.tokenId}:write`, "write")
  if (!limit_.ok) {
    return withHeaders(
      fail(req, "Rate limit exceeded.", 429, "rate_limited", `Try again in ${retryAfterSeconds(limit_)}s.`),
      limit_,
    )
  }

  const payload = await body<{ name?: string; template?: string; description?: string; color?: string }>(req)
  if (!payload) return fail(req, "The body must be valid JSON.", 400, "bad_request")

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : ""
  if (!name) return fail(req, "A board needs a name.", 400, "bad_request", `Send { "name": "Website relaunch" }.`)

  const chosen = template(payload.template ?? "kanban")
  if (!chosen) {
    return fail(
      req,
      `Unknown template "${payload.template}".`,
      400,
      "bad_request",
      "Send no template for the default, or one of: kanban, sprint, bug, release, pipeline, content, onboarding, events, blank.",
    )
  }

  // A token acts as its owner, so the same permission check that guards the
  // UI guards the API. A script can never do more than the person who made it.
  const [firstBoard] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.tenantId, auth.tenantId))
    .limit(1)
  if (firstBoard) {
    const access = await auth.accessFor(firstBoard.id)
    if (!access.permissions("board.read")) {
      return forbidden("You cannot read boards in this workspace.", "Your token stands in for a user with no board access.", req)
    }
  }

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "board"}-${Math.random().toString(16).slice(2, 8)}`

  const [board] = await db
    .insert(schema.projects)
    .values({
      tenantId: auth.tenantId,
      name,
      slug,
      description: typeof payload.description === "string" ? payload.description.slice(0, 2000) : null,
      color: typeof payload.color === "string" && /^#[0-9a-f]{6}$/i.test(payload.color) ? payload.color : chosen.accent,
      createdById: auth.userId,
      settings: { keyPrefix: name.slice(0, 4).toUpperCase(), template: chosen.key },
    })
    .returning()

  await db.insert(schema.projectLists).values(
    chosen.lists.map((l, i) => ({
      projectId: board.id,
      name: l.name,
      position: i,
      isDoneList: l.done ?? false,
      wipLimit: l.wip ?? null,
    })),
  )
  if (chosen.labels.length) {
    await db.insert(schema.projectLabels).values(
      chosen.labels.map((l) => ({ projectId: board.id, name: l.name, color: l.color })),
    )
  }
  await db.insert(schema.projectActivity).values({
    projectId: board.id,
    tenantId: auth.tenantId,
    type: "board.created",
    description: `created the board from the ${chosen.name} template over the API`,
    userId: auth.userId,
  })

  return withHeaders(
    created({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        color: board.color,
        keyPrefix: String((board.settings as { keyPrefix?: string })?.keyPrefix ?? "LN"),
        template: chosen.key,
        lists: chosen.lists.map((l) => ({ name: l.name, position: chosen.lists.indexOf(l), isDone: l.done ?? false })),
        createdAt: board.createdAt,
      },
    }),
    limit_,
  )
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : max
}
