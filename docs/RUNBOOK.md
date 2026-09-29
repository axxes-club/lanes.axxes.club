# Runbook

## Environment

Referenced in the source. Values are **not** in this repository.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres. Shared AXXES schema, not Lanes-specific. |
| `BETTER_AUTH_SECRET` | Session signing key. |
| `BETTER_AUTH_URL` | Canonical origin. **Must be set** — the build warns loudly without it, and callbacks break silently. |
| `AUTH_COOKIE_DOMAIN` | Cookie scope, so sessions work across `*.axxes.club`. |
| `HANDSHAKE_URL` | The AXXES identity provider. |
| `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` | Used for origin detection in dev vs prod. |

### The two that bite

- **`BETTER_AUTH_URL` unset** produces this at build time, and it is a warning,
  not an error:
  ```
  [Better Auth]: Base URL could not be determined. Without this, callbacks
  and redirects may not work correctly.
  ```
  It then works perfectly on the homepage and fails only on sign-in.
- **`AUTH_COOKIE_DOMAIN`** must be `.axxes.club` for the session to survive
  across the SSO round trip. Too narrow and every login appears to work and
  silently drops the session on return.

## Database

Migrations live in `scripts/migrate.sql` — hand-written, **idempotent**, every
statement `IF NOT EXISTS`. It can be applied to a database that already has the
shared AXXES schema without touching anything else.

```
psql "$DATABASE_URL" -f scripts/migrate.sql
```

Currently applied: the four `lanes-platform` tables. Re-running is safe.

The rest of the Lanes tables came from earlier runs and are already live.

## Build

```
npx tsc --noEmit          # must be 0 errors
npm run build
```

**Run `tsc` before every deploy.** The `projects.settings` type error described
in [STATE.md](./STATE.md) sat in uncommitted code and would have failed the
deploy outright. A JSONB `$type` is the schema; if a library writes a new key,
the type changes in the same commit.

## Deploy

The Vercel deployment block cleared. `npx vercel --prod --yes` works, and a
`--prod` deploy takes the `lanes.axxes.club` alias automatically.

```
npx vercel --prod --yes
npx vercel alias ls
```

**A `200` from the deployment URL is not the check.** Preview deployments sit
behind Vercel Deployment Protection and answer every request with a 302 to
`vercel.com/sso-api`, which looks exactly like a redirect in your own app and
is not one. Verify against `https://lanes.axxes.club` instead, and check the
alias with `vercel alias ls` — during the Qortr SSO work an alias reported
success three times and never appeared in the list.

## Card keys can be repaired

`project_cards` is a **shared** table. Other AXXES apps write to it, and rows
that arrive without a `custom_fields.seq` render as `PREFIX-00` — the same key
as every other row on that board that also lacks one. A key that silently
addresses the wrong card is worse than no key.

```bash
node scripts/fix-card-keys.mjs
```

It reports before and after, and exits non-zero unless the after-state is
zero missing and zero duplicated. Run it whenever a board shows duplicate
keys.

There is deliberately **no database constraint** forcing `seq` to exist. The
table is shared across the suite, and a `CHECK (custom_fields ? 'seq')` would
turn a cosmetic key collision into a failed insert in whichever sibling app
happened to write next. The cost of that risk is higher than the cost of a
repair script.

## Verify after deploying

Type check the route and look for the diagnostic, not just a 200:

```
curl -sI https://lanes.axxes.club/dashboard
curl -s  https://lanes.axxes.club/api/v1/boards/<id>/cards \
  -H "Authorization: Bearer $TOKEN" | jq
```

A `401` on the second is correct — it proves the token path works. A `200` for
an invalid token is a serious bug.

## Current blockers

| Blocker | Effect | Unblock |
|---------|--------|---------|
| Vercel deploy limit | Cannot ship the 1,700 uncommitted lines | Wait / raise limit |
| No git remote for this repo | Disk failure loses all uncommitted work | `git add -A && git commit` |
| `developer.axxes.club` DNS | API reference has nowhere to live | `A developer → 76.76.21.21`, DNS only |
| No test credentials for AXXES | Full browser SSO cannot be proven autonomously | A test user, or a human completes one round trip |

## Standing caution

A `200` from a page proves a route exists. It does not prove the feature behind
it works.

Nine tables in [DATA-MODEL.md](./DATA-MODEL.md) are live and empty, and the
role matrix has never run against a real row. When the screens land, test the
**permissions** first — a board where a viewer can move a card is a data
integrity problem, and a permissions bug found in production is found by
somebody else.