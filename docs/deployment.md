
## Production delivery from main

Pushes to `main` run `.github/workflows/gcp-production.yml`, authenticate to Google without stored keys, and submit `cloudbuild.yaml` in project `gravy-meta` (build metadata region `global`; production runtime and artifacts in `us-west1`). The pipeline retains Linux checks, final-image secret scanning, immutable image deployment, staged readiness and rollback. `deploy/gcp` is retained as migration history and no longer triggers production. Superseded queued commits are skipped before build submission. Runtime secrets and database authority are managed separately; production releases preserve current Cloud Run configuration.

The independent main-triggered GCP staging v2 workflow deploys `lanes-v2` using `cloudbuild-v2.yaml` and `Dockerfile.v2`. Build inputs privately merge `lanes-v2-env` then `v2-db-env`; the database overlay supplies authoritative DATABASE_URL while product public origins remain intact. Runtime loads the same two mounts in that order and requires both. Staging images use the separate immutable `ci-lanes-v2/lanes-v2` repository. No production database or runtime settings are changed by this workflow.

## Canonical domain — 2026-10-03

Production uses `https://lanes.axxes.app`, routed to the existing `lanes` Cloud Run service. Cloudflare authoritative DNS and the mirrored Cloud DNS zone use A `136.81.161.193`; the existing `*.axxes.app` certificate covers HTTPS. `lanes.axxes.club` permanently redirects with HTTP 308, preserving paths, queries, and request methods. API clients should use the new origin directly.

The `lanes-env` runtime secret sets `BETTER_AUTH_URL=https://lanes.axxes.app`, `VERCEL_PROJECT_PRODUCTION_URL=lanes.axxes.app`, `AUTH_COOKIE_DOMAIN=axxes.app`, and an empty `HANDSHAKE_URL`. Lanes uses its existing email/password sign-in against the shared AXXES account tables because the `.club` Handshake cookie cannot be shared with `.app`. Existing `.club` browser sessions require sign-in on the new domain. Staging v2 keeps its separate domain and configuration.
