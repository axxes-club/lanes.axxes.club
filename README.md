# Lanes — boards for every team

Kanban boards for AXXES workspaces (lanes.axxes.app). Uses the shared
`projects` / `project_*` tables, so boards also appear as Projects across the
AXXES suite. Sign in with your AXXES account.

## What is here

| | |
|---|---|
| Boards | Kanban, list and table views, templates, stars, saved filters |
| Delivery | Sprints, scrum poker, roles and an eight-role permission matrix |
| Insight | Throughput, lead time, WIP, aging — every number links to its cards |
| Suite | One account with the rest of AXXES; link a card to a real customer, order or stock item |
| Developer | REST API, twelve-page docs at `/docs`, bearer tokens, webhooks |

## Developer docs

**[lanes.axxes.app/docs](https://lanes.axxes.app/docs)** — quickstart,
authentication, every endpoint, the permission matrix, rate limits, webhooks
and how to migrate from Jira, Linear, Trello or Asana.

## Working in this repository

```bash
npx tsc --noEmit          # must be 0 errors
npm run build
git push origin HEAD:main # GCP production delivery
node scripts/fix-card-keys.mjs   # only if a board shows duplicate keys
```

Read [`docs/README.md`](./docs/README.md) first. It is the map: what is built,
what the reasoning behind it was, and what is still open. [`docs/TODO.md`](./docs/TODO.md)
is the ordered backlog.
