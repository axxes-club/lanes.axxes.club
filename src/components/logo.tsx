import { product } from "@/product.config"
import { cx } from "@/components/ui"

export function Logo({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <span
        className={cx(
          "grid place-items-center rounded-lg bg-accent font-mono font-bold text-accent-fg",
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
