import Link from "next/link"
import { requireContext } from "@/lib/context"
import { workspaceInsights } from "@/lib/lanes/insights"
import { PageHeader, Empty, Section } from "@/components/ui"
import { ThroughputChart } from "@/components/insights-charts"
import { IconChart, IconClock, IconWarning } from "@/components/icons"

export const dynamic = "force-dynamic"
export const metadata = { title: "Insights" }

const RANGES = [
  { weeks: 4, label: "4 weeks" },
  { weeks: 8, label: "8 weeks" },
  { weeks: 13, label: "13 weeks" },
]

/**
 * Insights.
 *
 * Every number links to the cards behind it. A metric you cannot click
 * through to is a number nobody trusts — a lead who sees "lead time 6.2
 * days" has to be able to answer "which six?" without leaving the product.
 *
 * There is deliberately no cumulative flow diagram. CFD is the chart delivery
 * teams are most sold on and most often compute incorrectly, and a
 * confidently wrong chart is worse than no chart. See ARCHITECTURE.md.
 */
export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ weeks?: string }> }) {
  const ctx = await requireContext()
  const { weeks: raw } = await searchParams
  const weeks = RANGES.some((r) => r.weeks === Number(raw)) ? Number(raw) : 8

  const data = await workspaceInsights(ctx.tenant.id, weeks)
  const empty = data.cardsOpen === 0 && data.cardsDone30 === 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Delivery"
        title="Insights"
        description="Throughput, lead time and where work is piling up. Every number links to the cards behind it."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-1">
            {RANGES.map((r) => (
              <Link
                key={r.weeks}
                href={`/dashboard/insights?weeks=${r.weeks}`}
                aria-current={r.weeks === weeks ? "true" : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  r.weeks === weeks ? "bg-panel-3 text-text" : "text-muted hover:text-text"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      {empty ? (
        <Empty
          icon={<IconChart size={20} />}
          title="Nothing to measure yet"
          body="Create a board, add some cards and move them to Done. These numbers appear once there is real history behind them."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Open cards" value={data.cardsOpen} hint="Right now, across every board" />
            <Metric label="Shipped · 30d" value={data.cardsDone30} hint="Completed in the last month" tone="good" />
            <Metric
              label="Overdue"
              value={data.overdue}
              hint={data.overdue > 0 ? "Past their due date" : "Nothing is late"}
              tone={data.overdue > 0 ? "bad" : "good"}
            />
            <Metric label="People" value={data.people} hint="Active in this workspace" />
          </div>

          <Section
            title="Throughput"
            description="Cards completed per week. A rising line means the team is getting more done; a flat one with rising creation means it is not."
          >
            <div className="card p-5">
              <ThroughputChart points={data.weekly} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            {data.leadTime && (
              <Section title="Lead time" description="From a card being created to it being finished. Cards completed inside the window only.">
                <div className="card p-5">
                  <div className="flex items-end gap-8">
                    <div>
                      <p className="eyebrow">Median</p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums">
                        {data.leadTime.median.toFixed(1)}
                        <span className="ml-1 text-base text-muted">days</span>
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow">85th percentile</p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums">
                        {data.leadTime.p85.toFixed(1)}
                        <span className="ml-1 text-base text-muted">days</span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-xs text-muted">
                    <IconClock size={13} className="mt-0.5 shrink-0" />
                    Plan against the 85th. The median flatters every team: it quietly ignores the few cards that sat for a month.
                  </p>
                </div>
              </Section>
            )}

            {data.lanes.length > 0 && (
              <Section title="Where work sits" description="The busiest lanes across every board.">
                <div className="card divide-y divide-line-soft">
                  {data.lanes.map((l) => (
                    <div key={`${l.board}-${l.list}`} className="flex items-center gap-4 px-5 py-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{l.list}</span>
                      <span className="hidden max-w-40 truncate text-xs text-muted sm:block">{l.board}</span>
                      <span className="w-8 text-right font-mono text-sm tabular-nums text-muted">{l.count}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {data.aging.length > 0 && (
            <Section
              title="Oldest open cards"
              description="Work that has been sitting longest without being finished. Usually the most useful list on this page."
            >
              <div className="card divide-y divide-line-soft">
                {data.aging.map((a) => (
                  <Link
                    key={a.id}
                    href={`/dashboard/b/${a.boardId}?card=${a.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition hover:bg-panel-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
                    <span className="hidden shrink-0 text-xs text-muted sm:block">
                      {a.board} · {a.list}
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right font-mono text-xs tabular-nums ${
                        a.ageDays > 30 ? "text-danger" : a.ageDays > 14 ? "text-warning" : "text-muted"
                      }`}
                    >
                      {a.ageDays}d
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data.overdue > 0 && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <IconWarning size={13} className="text-warning" />
              Ages run from when a card was created, not from its last edit. A card somebody touched yesterday but never
              finished still counts as old, which is the point.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string
  value: number
  hint: string
  tone?: "neutral" | "good" | "bad"
}) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-tight tabular-nums ${
          tone === "bad" ? "text-danger" : tone === "good" ? "text-success" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted">{hint}</p>
    </div>
  )
}
