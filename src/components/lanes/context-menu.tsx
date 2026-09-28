"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

export type MenuItem =
  | { separator: true }
  | { label: string; onSelect?: () => void; children?: MenuItem[]; danger?: boolean; disabled?: boolean; checked?: boolean; shortcut?: string; separator?: false }

// A small desktop-style context menu: opens at the cursor, nudges itself on-screen, supports one level of submenus
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [sub, setSub] = useState<number | null>(null)

  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: Math.min(x, window.innerWidth - r.width - 8), y: Math.min(y, window.innerHeight - r.height - 8) })
  }, [x, y])

  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return
      onClose()
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("keydown", close)
    window.addEventListener("resize", onClose)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("keydown", close)
      window.removeEventListener("resize", onClose)
    }
  }, [onClose])

  return (
    <div ref={ref} role="menu" className="fixed z-50 min-w-52 rounded-lg border border-line bg-panel p-1 text-sm shadow-2xl" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 h-px bg-line" />
        ) : (
          <div key={i} className="relative" onMouseEnter={() => setSub(item.children ? i : null)}>
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.children) return setSub(i)
                item.onSelect?.()
                onClose()
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-panel-2 disabled:opacity-40 ${item.danger ? "text-danger" : ""}`}
            >
              <span className="w-3 text-accent">{item.checked ? "✓" : ""}</span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="text-xs text-muted">{item.shortcut}</span>}
              {item.children && <span className="text-muted">›</span>}
            </button>
            {item.children && sub === i && (
              <div role="menu" className="absolute left-full top-0 ml-1 max-h-72 min-w-44 overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-2xl">
                {item.children.map((c, j) =>
                  c.separator ? (
                    <div key={j} className="my-1 h-px bg-line" />
                  ) : (
                    <button
                      key={j}
                      type="button"
                      role="menuitem"
                      disabled={c.disabled}
                      onClick={() => { c.onSelect?.(); onClose() }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-panel-2 disabled:opacity-40"
                    >
                      <span className="w-3 text-accent">{c.checked ? "✓" : ""}</span>
                      {c.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
