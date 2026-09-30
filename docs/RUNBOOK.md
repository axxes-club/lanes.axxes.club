# Release 1 deployment — 2026-09-30

Deploy the verified `main` checkout to the linked Vercel project with `vercel --prod --yes`. Production environment variables stay in Vercel; never commit local environment files. `vercel pull` on this account returns secret placeholders, so they cannot be used for local database checks.

Before deploying, apply only the additive idempotent migration `scripts/lanes-custom-fields.sql` against the configured shared database. Verify the column in `information_schema.columns` and confirm `saved_views` exists. No broad migration is required.

Checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `git diff --check`. Client fixture smoke: start Vite with `node node_modules/vite/bin/vite.js --config tests/browser/vite.config.mts`, then `node tests/browser/smoke.mjs` with Playwright installed; `LANES_CHROMIUM_PATH` optionally specifies an existing Chromium executable. Fixtures use mocked server actions and do not prove SSO or authenticated production data writes.

After Vercel reports Ready, verify the alias homepage/docs, dashboard redirects to sign-in, token-protected API rejects unauthenticated requests, and production dev-auth refuses access. Deployment URL and actual outcomes are recorded below after deployment.

Historical runbook follows; any older deployment blockers are superseded by the current release record.

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

### The daily deployment cap

```
Error: Resource is limited - try again in 24 hours
  (more than 100, code: "api-deployments-free-per-day")
```

The free tier allows 100 deployments per day per account, counted across
every project, not per project. The counter resets on a rolling 24 hours, so
there is no time of day that is reliably safe. A failed deploy leaves the
previous build serving and changes nothing on disk, so the response to this is
simply to wait and run the deploy again.

Two habits make it less painful:

- **Commit before deploying, always.** The deploy is the last step, not the
  only step. A cap discovered after two hours of work costs a push.
- **Do not redeploy to test a change.** A `next build` plus `next start`
  locally answers the same question and costs nothing.

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
## Release preflight evidence

2026-09-30: 70 tests / 15 files passed after integrating remote main. Production build passed (25 routes); TypeScript and whitespace checks passed. Desktop/mobile fixture smoke passed including bottom-right submenu geometry and keyboard isolation. The additive custom_fields.deleted_at migration was applied and its timestamptz type verified. Existing saved_views schema confirmed. Organization context and app catalog checks passed; organization opener checks use `node scripts/check-organization-open.mjs /dashboard`.

No authenticated production mutation or two-user SSO browser flow was performed. PostgreSQL atomicity evidence is from isolated PGlite, not concurrent Neon connections.

## Deployment outcome

2026-09-30: Release code was pushed to origin/main at `9059ebc`. `vercel --prod --yes` uploaded the source but was rejected with `api-deployments-free-per-day` (more than 100; retry after 24 hours). `vercel list lanes.axxes.club` showed only the previous Ready production deployment from two hours earlier; no new deployment was created. The public homepage remains HTTP200 on that previous release. This customization release is **not yet live**. Retry `vercel --prod --yes` from main when the quota resets, then run the post-deployment HTTP checks above.
