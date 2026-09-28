# API

## Authentication

Personal API tokens only, presented as a bearer token:

```
Authorization: Bearer lnk_<id>_<secret>
```

- Prefix is `lnk_`.
- Only the **SHA-256 hash** of the secret is stored. The plaintext is shown once
  at creation and cannot be recovered.
- Comparison is **constant-time** (`timingSafeEqual`). A byte-by-byte string
  compare leaks the secret one character at a time.
- Missing or invalid → `401` with a message naming the header to use.

Principal resolution lives in `src/lib/lanes/api-auth.ts`; token creation,
expiry and revocation in `api-tokens.ts`.

**A token is a person, not a scope.** An authenticated request is still subject
to the same `permissions.ts` matrix as the browser. A token does not bypass
board roles, and it is not tenant-scoped any more loosely than a session is.

## Endpoints that exist

### `GET /api/v1/boards/[id]`

Read one board. `board.read`.

### `GET /api/v1/boards/[id]/cards`

List cards on a board. `card.read`.

### `POST /api/v1/boards/[id]/cards`

Create a card. `card.create`. Validates the title and list.

That is the entire public API: **three methods on two paths.**

## Endpoints the code assumes exist

`search.ts` and `insights.ts` are written against routes that have never been
created. They are referenced in comments and, if the reference documentation is
generated, they will appear as if they were real. They are not.

- [ ] `GET /api/v1/search` — the shared ranked search
- [ ] `GET /api/v1/insights` — throughput and lead time

**Fix or remove the references before publishing the reference.** A documented
endpoint that 404s is worse than an undocumented one.

## Not built

See [`TODO.md` § 5](./TODO.md#5-api-surface). The list is short on purpose —
a three-endpoint API that works beats a documented one that lies.

Planned:

```
GET    /api/v1/boards
POST   /api/v1/boards
GET    /api/v1/cards/[id]
PATCH  /api/v1/cards/[id]
DELETE /api/v1/cards/[id]
GET    /api/v1/boards/[id]/members
POST   /api/v1/boards/[id]/members
GET    /api/v1/sprints
GET    /api/v1/search
```

## Conventions

- **Errors** are `apiError(message, status, hint)` from `errors.ts` — a message
  a person can act on, a correct status, and a hint. Never a bare
  `res.json({ error: "failed" })`.
- **Tenant scope comes from the principal**, never from a query parameter. A
  `?tenantId=` on any endpoint is a bug waiting to be found.
- **Every route checks a permission.** Route-level auth is not enough if the
  underlying action re-derives nothing.
- **No rate limiting yet.** Required before this is public.
