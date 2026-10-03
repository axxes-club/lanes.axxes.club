# Central AXXES organization

The existing tenant `40119de9-ef87-4e41-b479-7a28ec8e3d66` retains its slug `axxes-club-CgWei8`, memberships and all existing boards. Only its display name becomes AXXES. Exact-name boards AXXES.club, AXXES.work and AXXES.app are reused or created with the Kanban API template.

Run `node --conditions=react-server --import tsx scripts/setup-central-axxes.ts --tenant-id <uuid>` with the current production DATABASE_URL. The default is a dry run showing tenant identity and complete board inventory. Add `--apply` only after reviewing the dry run. Apply requires LANES_API_TOKEN bound to that existing tenant, read/write scopes and an existing organization manager membership. Token contents must come from secret storage; never paste them in commands, logs or documentation.

The current production database is GCP Cloud SQL. Historical local Neon configuration is read-only and is not authoritative. Setup refuses duplicate exact-name target boards and never creates a tenant, replaces membership, renames existing boards, or changes slugs. If an API write times out or setup fails after partial progress, inspect a fresh dry run before applying again.

On 2026-10-03 production setup preserved the 15 existing boards and created the three missing exact-name boards. The dedicated WM token is stored in `gravy-meta/webmaster-lanes-token`; its owner is an existing member of the retained tenant. WM operations are attributed to that integration identity upstream.
