"use client"
import type { SuiteProduct } from "@/lib/axxes/suite"
import { cx } from "@/components/ui"
import { IconCheck, IconExternal } from "@/components/icons"
import { AllAppsSwitcher } from "@/components/all-apps-switcher"
export function ProductSwitcher({ collapsed = false, tenantId }: { collapsed?: boolean; tenantId?: string }) {
  return <AllAppsSwitcher compact={collapsed} tenantId={tenantId} />
}

/** A row in the app hub: monogram, name, what it does, and what it shares. */
export function SuiteCard({
  product,
  shares,
  href,
}: {
  product: SuiteProduct
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
