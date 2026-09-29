# Lanes — boards for every team

Kanban boards for AXXES workspaces (lanes.axxes.club). Uses the shared
`projects` / `project_*` tables, so boards also appear as Projects across the
AXXES suite. Sign-in via Handshake.

## What is here

| | |
|---|---|
| Boards | Kanban, list and table views, templates, stars, saved filters |
| Delivery | Sprints, scrum poker, roles and an eight-role permission matrix |
| Insight | Throughput, lead time, WIP, aging — every number links to its cards |
| Suite | One account with the rest of AXXES; link a card to a real customer, order or stock item |
| Developer | REST API, twelve-page docs at `/docs`, bearer tokens, webhooks |

## Developer docs

**[lanes.axxes.club/docs](https://lanes.axxes.club/docs)** — quickstart,
authentication, every endpoint, the permission matrix, rate limits, webhooks
and how to migrate from Jira, Linear, Trello or Asana.

## Working in this repository

```bash
npx tsc --noEmit          # must be 0 errors
npm run build
npx vercel --prod --yes   # takes the lanes.axxes.club alias
node scripts/fix-card-keys.mjs   # only if a board shows duplicate keys
```

Read [`docs/README.md`](./docs/README.md) first. It is the map: what is built,
what the reasoning behind it was, and what is still open. [`docs/TODO.md`](./docs/TODO.md)
is the ordered backlog.
