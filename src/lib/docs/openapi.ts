/**
 * The OpenAPI 3.1 document.
 *
 * Generated rather than hand-written, from the same field lists the routes
 * and the docs pages use. A hand-maintained spec drifts from the code the
 * first time a response field is added, and a spec that lies is worse than no
 * spec — it is a lie a developer builds against.
 *
 * It is served at `/api/v1/openapi.json` and rendered at `/docs/openapi`, so
 * "the docs" and "the machine-readable version" cannot be different documents.
 */

const ENVELOPE_ERROR = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["message", "code", "requestId"],
      properties: {
        message: { type: "string" },
        code: { type: "string" },
        hint: { type: "string", description: "What to do next, in plain English." },
        requestId: { type: "string" },
      },
    },
  },
} as const

const CARD = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    key: { type: "string", description: "Stable, sayable, survives export. e.g. WEB-42" },
    board: { type: "string" },
    list: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" } } },
    title: { type: "string" },
    description: { type: ["string", "null"] },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    position: { type: "number", description: "Changes when the card is dragged. Never store it." },
    dueDate: { type: ["string", "null"], format: "date-time" },
    completedAt: { type: ["string", "null"], format: "date-time" },
    estimatedHours: { type: ["number", "null"] },
    loggedHours: { type: ["number", "null"] },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const

const BOARD = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    keyPrefix: { type: "string", description: "Cards on this board are PREFIX-1, PREFIX-2, …" },
    cards: { type: "object", properties: { open: { type: "integer" }, done: { type: "integer" } } },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const json = (schema: unknown) => ({ "application/json": { schema } })

const commonErrors = {
  "401": { description: "Missing, malformed, revoked or expired token", ...json(ref("Error")) },
  "403": { description: "Valid token, not allowed. Read the hint.", ...json(ref("Error")) },
  "429": { description: "Rate limited. Back off using x-ratelimit-reset.", ...json(ref("Error")) },
}

export const OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: "Lanes API",
    version: "2026-09-01",
    description:
      "The delivery workspace API. Every response is `{ data }` or `{ error: { message, code, hint, requestId } }` — never a third shape.\n\n" +
      "A token resolves to the board role of the person who created it, so a script can do exactly what its owner could and not one thing more.",
    contact: { name: "AXXES", url: "https://lanes.axxes.app/docs" },
    license: { name: "Proprietary" },
  },
  servers: [{ url: "https://lanes.axxes.app/api/v1", description: "Production" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Boards", description: "Boards, lanes and labels" },
    { name: "Cards", description: "Tasks, addressed by key or UUID" },
    { name: "Search", description: "One ranked search over everything" },
  ],
  paths: {
    "/boards": {
      get: {
        tags: ["Boards"],
        summary: "List boards",
        description: "Cursor-paginated on `(updatedAt, id)`, so the cursor is unique even when two boards are touched in the same millisecond.",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
          { name: "cursor", in: "query", schema: { type: "string" }, description: "nextCursor from the previous page" },
        ],
        responses: {
          "200": { description: "A page of boards", ...json({ type: "object", properties: { data: { type: "object", properties: { boards: { type: "array", items: ref("Board") }, nextCursor: { type: ["string", "null"] } } } } }) },
          ...commonErrors,
        },
      },
      post: {
        tags: ["Boards"],
        summary: "Create a board from a template",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", maxLength: 100 },
                  template: { type: "string", enum: ["kanban", "sprint", "bug", "release", "pipeline", "content", "onboarding", "events", "blank"], default: "kanban" },
                  description: { type: "string" },
                  color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "The created board", ...json({ type: "object", properties: { data: ref("Board") } }) },
          "400": { description: "No name, or an unknown template", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
    },
    "/boards/{id}": {
      get: {
        tags: ["Boards"],
        summary: "One board, its lanes and the token's role on it",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "The board", ...json({ type: "object", properties: { data: { type: "object", properties: { board: ref("Board"), lists: { type: "array", items: { type: "object" } }, yourRole: { type: "string" } } } } }) },
          "404": { description: "No such board in this workspace", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
    },
    "/boards/{id}/cards": {
      get: {
        tags: ["Cards"],
        summary: "Every card on a board",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "list", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Opaque nextCursor from the previous page; retain list filter." },
        ],
        responses: {
          "200": { description: "The cards", ...json({ type: "object", properties: { data: { type: "object", properties: { cards: { type: "array", items: ref("Card") }, nextCursor: { type: ["string", "null"] } } } } }) },
          ...commonErrors,
        },
      },
      post: {
        tags: ["Cards"],
        summary: "Create a card",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", minLength: 1, maxLength: 300 },
                  description: { type: "string", maxLength: 20000 },
                  listId: { type: "string", format: "uuid", description: "Defaults to the board's first lane." },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "The created card", ...json({ type: "object", properties: { data: ref("Card") } }) },
          "400": { description: "No title", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
    },
    "/cards/{id}": {
      get: {
        tags: ["Cards"],
        summary: "One card, by UUID or by key",
        description: "`WEB-42` and `web-42` both work, and zero padding is optional: `AB-7` and `AB-07` resolve to the same card. Prefer the key — it survives export and a change of database.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, examples: { key: { value: "WEB-42" }, uuid: { value: "b0e9506e-44c5-4dc0-9374-28c682a2b1fa" } } }],
        responses: {
          "200": { description: "The card", ...json({ type: "object", properties: { data: ref("Card") } }) },
          "404": { description: "No such card", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
      patch: {
        tags: ["Cards"],
        summary: "Partial update, including moves",
        description: "Only the keys present in the body are touched. Sending `listId` moves the card, and its completion state is recalculated from the lane it lands in.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", minLength: 1, maxLength: 300 },
                  description: { type: ["string", "null"] },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  dueDate: { type: ["string", "null"], format: "date-time" },
                  listId: { type: "string", format: "uuid", description: "Moving needs card.move, which is separate from card.update." },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "The updated card", ...json({ type: "object", properties: { data: ref("Card") } }) },
          "400": { description: "Empty title, or a lane that is not on this board", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
      delete: {
        tags: ["Cards"],
        summary: "Soft delete",
        description: "Sets `deleted_at` and returns 204 with no body. The row stays, so it can still be audited.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, ...commonErrors },
      },
    },
    "/search": {
      get: {
        tags: ["Search"],
        summary: "Boards, cards and people, ranked",
        description:
          "The same ranking the command palette and the search page use. Rules: a key or title prefix beats a substring, a title match beats a description match, and newer work beats older at equal relevance. A card key like WEB-42 jumps straight to that card.",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string", minLength: 1 } },
          { name: "kinds", in: "query", schema: { type: "string", enum: ["board", "card", "person"] }, description: "Comma separated. Omit for all." },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          "200": { description: "Ranked results", ...json({ type: "object", properties: { data: { type: "object", properties: { query: { type: "string" }, total: { type: "integer" }, results: { type: "array", items: { type: "object" } } } } } }) },
          "400": { description: "No query", ...json(ref("Error")) },
          ...commonErrors,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "A Lanes API token, as `lnk_<32 hex>_<secret>`. Created in Settings → API tokens, shown once, stored only as a SHA-256 hash. Optional scopes: read, write, *.",
      },
    },
    schemas: { Board: BOARD as never, Card: CARD as never, Error: ENVELOPE_ERROR as never },
  },
} as const
