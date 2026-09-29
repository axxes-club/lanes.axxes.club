import { requireContext } from "@/lib/context"
import { recordCounts } from "@/lib/axxes/records"
import { RECORD_SOURCES } from "@/lib/axxes/record-kinds"
import { SUITE } from "@/lib/axxes/suite"
import { PageHeader, Section } from "@/components/ui"
import { SuiteCard } from "@/components/product-switcher"
import { IconCheck, IconLink, IconGlobe } from "@/components/icons"
import { boardPrefix } from "@/lib/lanes/prefix"

export const dynamic = "force-dynamic"
export const metadata = { title: "AXXES apps" }

/**
 * The suite hub.
 *
 * The claim this page has to earn is "integrated with the rest of AXXES out
 * of the box". Marketing copy cannot do that, so the page is built out of
 * live numbers: how many customers, orders, events and stock items exist in
 * this workspace right now and can be linked to a card with one click.
 *
 * The distinction the copy keeps making — and the page keeps proving — is
 * between *integrating with* a tool and *being part of* one. Jira integrates
 * with Slack. Lanes and Members are the same workspace reading the same rows.
 */
export default async function AppsPage() {
  const ctx = await requireContext()
  const counts = await recordCounts(ctx.tenant.id)

  // What each product shares with Lanes, and which registry entry proves it.
  const SHARES: Record<string, string[]> = {
    lanes: ["Boards", "Cards", "Sprints", "Estimates"],
    members: ["Contacts", "Roles", "Invitations"],
    inventree: ["Products", "Venues", "Suppliers"],
    ledger: ["Orders", "Revenue"],
    signal: ["Events", "Publishing"],
    matrix: ["Channels linked to boards"],
    handshake: ["Accounts", "Sessions"],
    nexus: ["Pages, orders and stock surface here"],
  }

  const linkable = RECORD_SOURCES.map((src) => ({
    ...src,
    count: counts[src.kind] ?? 0,
  }))

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="One workspace"
        title="The AXXES suite"
        description="Lanes is not a tool you connect to your other tools. It is one of them — same account, same workspace, same records."
      />

      <div className="card overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-balance">
              Every AXXES app, already signed in.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted text-pretty">
              Sign in once at <span className="text-text-2">handshake.axxes.club</span> and every app on{" "}
              <span className="text-text-2">*.axxes.club</span> shares that session. No second login, no OAuth app to
              register, no connector to keep alive. Boards in Lanes are Projects in the suite &mdash; the same rows, not a
              copy.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                <IconCheck size={12} /> No API keys
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                <IconCheck size={12} /> No sync jobs
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                <IconCheck size={12} /> Nothing to go stale
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel-2 p-4">
            <p className="eyebrow">Signed in as</p>
            <p className="mt-2 truncate font-medium">{ctx.user.name || ctx.user.email}</p>
            <p className="truncate text-sm text-muted">{ctx.user.email}</p>
            <p className="mt-4 text-sm text-muted">
              Workspace <span className="text-text-2">{ctx.tenant.name}</span>
            </p>
          </div>
        </div>
      </div>

      <Section
        title="Linkable records"
        description="These live in sibling AXXES apps but share this workspace's database. Open any card and link one in a click — no integration, because there is nothing to keep in sync."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {linkable.map((l) => (
            <div key={l.kind} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">{l.product}</p>
                  <p className="mt-1 font-semibold capitalize tracking-tight">{l.kind.replace("_", " ")}</p>
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <IconLink size={15} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{l.count}</p>
              <p className="text-xs text-muted">
                {l.count === 0 ? `No ${l.kind.replace("_", " ")}s in this workspace yet` : `available in ${ctx.tenant.name}`}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Every app" description="Open any of them in a new tab. Your session comes with you.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUITE.map((p) => (
            <SuiteCard key={p.key} product={p} shares={SHARES[p.key] ?? []} href={p.self ? undefined : p.href} />
          ))}
        </div>
      </Section>

      <p className="flex items-start gap-2 text-xs text-muted">
        <IconGlobe size={13} className="mt-0.5 shrink-0" />
        Lanes reads these tables directly and always scoped to your workspace, so a board can never surface a record from
        another organization. Want to build on it yourself?{" "}
        <a href="/docs" className="text-accent hover:underline">
          The API is documented
        </a>
        .
      </p>
    </div>
  )
}
