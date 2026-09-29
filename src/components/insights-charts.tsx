"use client"

import { useId, useState } from "react"
import { cx } from "@/components/ui"
import type { ThroughputPoint } from "@/lib/lanes/types"

/**
 * Throughput, as a bar chart.
 *
 * Hand-rolled SVG rather than a charting library. A delivery chart is a dozen
 * bars; shipping a library to draw twelve bars would be several hundred
 * kilobytes for something that has to sit inside a board people already find
 * slow, and it would bring its own colour scale to fight with the design
 * tokens.
 *
 * It is an SVG with a real accessible name and a <title> per bar, so a
 * screen reader gets "Week of 6 Jan, 12 completed" rather than "image".
 * Hovering reveals the exact number, because a bar chart that only shows
 * proportions is a bar chart nobody can quote from.
 */
export function ThroughputChart({ points }: { points: ThroughputPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const id = useId()

  const max = Math.max(1, ...points.map((p) => Math.max(p.created, p.completed)))
  const gap = 8
  const barW = 26
  const H = 180

  if (points.length === 0) return null

  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: H }}>
        {points.map((p, i) => {
          const createdH = (p.created / max) * H
          const doneH = (p.completed / max) * H
          const active = hover === i
          return (
            <div
              key={p.week}
              className="flex shrink-0 flex-col items-center justify-end"
              style={{ width: barW * 2 + gap }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex h-4 items-end text-[10px] font-medium tabular-nums">
                {active && (
                  <span className="mb-1 text-muted">
                    {p.completed}/{p.created}
                  </span>
                )}
              </div>
              <div className="flex items-end gap-1" style={{ height: H }}>
                <Bar
                  value={p.created}
                  height={createdH}
                  fill="var(--line-strong)"
                  label={`Week of ${p.label}: ${p.created} created`}
                  opacity={active ? 1 : 0.75}
                  id={`${id}-c-${i}`}
                />
                <Bar
                  value={p.completed}
                  height={doneH}
                  fill="var(--accent)"
                  label={`Week of ${p.label}: ${p.completed} completed`}
                  opacity={active ? 1 : 0.9}
                  id={`${id}-d-${i}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-[10px] text-faint">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: "var(--line-strong)" }} aria-hidden /> Created
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: "var(--accent)" }} aria-hidden /> Completed
          </span>
        </span>
        <span>
          {points[0].label} → {points[points.length - 1].label}
        </span>
      </div>
    </div>
  )
}

function Bar({
  height,
  fill,
  label,
  opacity,
  id,
}: {
  value: number
  height: number
  fill: string
  label: string
  opacity: number
  id: string
}) {
  // A zero-height bar still gets a 2px stub, otherwise "we shipped nothing
  // this week" renders as an absence rather than a fact.
  const h = Math.max(2, height)
  return (
    <svg
      width={26}
      height={Math.max(2, height)}
      className="overflow-visible"
      role="img"
      aria-label={label}
      style={{ opacity }}
    >
      <title id={id}>{label}</title>
      <rect
        x={0}
        y={Math.max(0, height - h)}
        width={26}
        height={h}
        rx={4}
        fill={fill}
        className="transition-all duration-300"
      />
    </svg>
  )
}

/**
 * A sparkline. Used in dense rows — a board card, a person's workload — where
 * a full chart would not fit and the number matters more than the shape.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const W = 100
  const H = 28
  const step = W / (values.length - 1)
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`)
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cx("w-full", className)}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Trend: ${values.join(", ")}`}
    >
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
