"use client"

import { useEffect, useRef, useState } from "react"
import { SUITE } from "@/lib/axxes/suite"
import { cx } from "@/components/ui"
import { IconCheck, IconChevronDown, IconExternal, IconGrid } from "@/components/icons"

/**
 * The AXXES product switcher.
 *
 * The suite is the product. Lanes is not a tool a company buys and then
 * connects to their other tools — it is one of several products that share an
 * account, a workspace and a database. So the sibling apps belong in the
 * chrome, not on a marketing page.
 *
 * Sign-in is automatic across *.axxes.club on the shared session cookie, so
 * every entry here is a real link rather than a "log in again" step. Sibling
 * apps open in a new tab, because the mental model is "check on something and
 * come back", and losing your board's scroll position to do that would be the
 * wrong trade.
 */
export function ProductSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (collapsed) {
    // Collapsed: a compact column of monograms. Hovering a square shows the
    // name in a native tooltip, which needs no positioning logic at all.
    return (
      <div className="hidden flex-col items-center gap-1.5 lg:flex" aria-label="AXXES apps">
        {SUITE.map((p) => (
          <a
            key={p.key}
            href={p.href}
            target={p.self ? undefined : "_blank"}
            rel={p.self ? undefined : "noreferrer"}
            title={p.name}
            className={cx(
              "grid size-8 place-items-center rounded-lg text-[10px] font-bold transition",
              p.self ? "bg-accent-soft text-accent ring-1 ring-accent-line" : "text-muted hover:bg-panel-3",
            )}
            style={p.self ? undefined : { color: p.accent }}
            aria-current={p.self ? "page" : undefined}
          >
            {p.glyph}
          </a>
        ))}
      </div>
    )
  }

  const others = SUITE.filter((p) => !p.self)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-panel-3 hover:text-text"
      >
        <IconGrid size={16} className="shrink-0" />
        <span className="flex-1 text-left">All apps</span>
        <IconChevronDown size={14} className={cx("shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-30 mb-1 w-72 animate-pop-in overflow-hidden rounded-xl border border-line bg-panel shadow-lg">
          <div className="border-b border-line px-3 py-2">
            <p className="eyebrow">AXXES suite</p>
            <p className="mt-1 text-xs text-muted">One account, one workspace, shared records.</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {others.map((p) => (
              <a
                key={p.key}
                role="menuitem"
                href={p.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-panel-3"
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold"
                  style={{ background: `${p.accent}1f`, color: p.accent }}
                  aria-hidden
                >
                  {p.glyph}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm text-text">
                    {p.name}
                    <IconExternal size={11} className="text-faint" />
                  </span>
                  <span className="block truncate text-xs text-muted">{p.blurb}</span>
                </span>
              </a>
            ))}
          </div>
          <div className="border-t border-line p-1">
            <a
              role="menuitem"
              href="/dashboard/apps"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-panel-3 hover:text-text"
            >
              <IconGrid size={14} />
              See what connects to what
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/** A row in the app hub: monogram, name, what it does, and what it shares. */
export function SuiteCard({
  product,
  shares,
  href,
}: {
  product: (typeof SUITE)[number]
  shares: string[]
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold"
          style={{ background: `${product.accent}1f`, color: product.accent }}
          aria-hidden
        >
          {product.glyph}
        </span>
        {product.self ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
            <IconCheck size={11} /> You are here
          </span>
        ) : (
          <IconExternal size={14} className="mt-1 text-faint" />
        )}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{product.name}</h3>
      <p className="mt-1 text-sm text-muted text-pretty">{product.blurb}</p>
      {shares.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shares.map((s) => (
            <span key={s} className="rounded-md bg-panel-3 px-1.5 py-0.5 text-[10px] text-muted">
              {s}
            </span>
          ))}
        </div>
      )}
    </>
  )

  const className = "card card-hover block p-5"
  return product.self || !href ? (
    <div className={cx(className, "cursor-default")}>{inner}</div>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  )
}
