import Link from "next/link"
import type { ReactNode } from "react"

/** Join class names, dropping anything falsy. Stops conditional soup in JSX. */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ")
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted text-pretty">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/* ── Badges and pills ─────────────────────────────────────────────────── */

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "info" | "violet"

export const TONES: Record<Tone, string> = {
  neutral: "bg-panel-3 text-muted ring-line",
  accent: "bg-accent-soft text-accent ring-accent-line",
  good: "bg-success-soft text-success ring-success/25",
  warn: "bg-warning-soft text-warning ring-warning/25",
  bad: "bg-danger-soft text-danger ring-danger/25",
  info: "bg-info-soft text-info ring-info/25",
  violet: "bg-violet-soft text-violet ring-violet/25",
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A small coloured dot, for status without spending the weight of a pill. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cx("size-2 shrink-0 rounded-full", className)} style={{ background: color }} />
}

/* ── Stats ─────────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  hint,
  href,
  tone = "neutral",
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  href?: string
  tone?: Tone
  icon?: ReactNode
}) {
  const body = (
    <div className="card card-hover group h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && <span className="text-faint transition group-hover:text-muted">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

/** A horizontal meter. `value` and `max` are counts, not percentages. */
export function Meter({ value, max, tone = "accent" }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const bar: Record<Tone, string> = {
    neutral: "bg-muted",
    accent: "bg-accent",
    good: "bg-success",
    warn: "bg-warning",
    bad: "bg-danger",
    info: "bg-info",
    violet: "bg-violet",
  }
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-panel-3" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx("h-full rounded-full transition-[width] duration-500", bar[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function Empty({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 grid size-11 place-items-center rounded-xl border border-dashed border-line text-faint">
          {icon}
        </div>
      )}
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted text-pretty">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const GOOD = /^(active|published|sent|received|complete|completed|delivered|passed|approved|confirmed|captured|fulfilled|succeeded|paid|done|merged|open)$/
const BAD = /^(failed|cancelled|canceled|rejected|quarantine|discrepancy_found|archived|out_of_stock|deleted|bounced|overdue|blocked)$/
const INFO = /^(in_progress|in_transit|sending|shipped|processing|scheduled|partial|partially_.*|authorized|review|planned)$/

/**
 * A status pill whose colour is derived from the value.
 *
 * The mapping is a list of regexes rather than a lookup table so a new enum
 * value added to the database gets a sensible colour the day it ships,
 * instead of rendering in the fallback colour forever.
 */
export function StatusBadge({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-faint">—</span>
  const v = String(value)
  const tone: Tone = GOOD.test(v)
    ? "good"
    : BAD.test(v)
      ? "bad"
      : INFO.test(v)
        ? "info"
        : v === "draft"
          ? "neutral"
          : "warn"
  return <Badge tone={tone}>{v.replaceAll("_", " ")}</Badge>
}

/* ── Structure ─────────────────────────────────────────────────────────── */

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-line" />
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <hr className="flex-1 border-line" />
      <span className="eyebrow">{label}</span>
      <hr className="flex-1 border-line" />
    </div>
  )
}

/** A keyboard hint, e.g. <Kbd>⌘K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx("kbd", className)}>{children}</kbd>
}

/** Absolute timestamps, formatted once so they never disagree. */
export function timeAgo(iso: string | Date, now = Date.now()): string {
  const t = typeof iso === "string" ? Date.parse(iso) : iso.getTime()
  const diff = Math.round((now - t) / 1000)
  if (diff < 45) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 604_800) return `${Math.round(diff / 86_400)}d ago`
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" })
}

/** Initials for an avatar, handling a single-word name and an empty one. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!words.length) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words.at(-1)![0]).toUpperCase()
}

/**
 * A stable colour for a name, so the same person is the same colour on every
 * board and every screen. HSL keeps the perceived brightness roughly even
 * across hues, which a hex palette would not.
 */
export function colorFor(seed: string, saturation = 62, lightness = 56): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return `hsl(${h} ${saturation}% ${lightness}%)`
}


