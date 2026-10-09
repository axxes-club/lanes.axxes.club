"use client"

import { useBrand, CustomerLogo, CustomerMark } from "@/components/brand"
import { product } from "@/product.config"
import { cx } from "@/components/ui"

function AxxesLogo({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <span
        className={cx(
          "grid place-items-center rounded-[9px] app-tile font-bold",
          size === "lg" ? "size-10 text-lg" : "size-7 text-sm",
        )}
        aria-hidden
      >
        {product.name[0]}
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cx("block truncate font-semibold tracking-tight", size === "lg" ? "text-xl" : "text-[15px]")}>
          {product.name}
        </span>
        <span className="block font-mono text-[10px] tracking-[0.2em] text-muted uppercase">by AXXES</span>
      </span>
    </div>
  )
}

/** The product logo: a white-label customer's own brand when they have one. */
export function Logo(props: React.ComponentProps<typeof AxxesLogo>) {
  const brand = useBrand()
  const large = (props as { size?: string }).size === "lg"
  return brand ? <CustomerLogo brand={brand} productName={product.name} large={large} /> : <AxxesLogo {...props} />
}
