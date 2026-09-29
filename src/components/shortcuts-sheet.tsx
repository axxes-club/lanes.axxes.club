"use client"

import { useEffect } from "react"
import { cx, Kbd } from "@/components/ui"
import { SHORTCUTS, SHORTCUT_GROUPS } from "@/lib/lanes/shortcuts"

/**
 * The shortcuts sheet, on `?`.
 *
 * Rendered from the same array the board implements, so it cannot list a key
 * that does nothing or omit one that does. A help overlay that has drifted
 * from the product is worse than none, because people trust it and then
 * conclude the software is broken.
 */
export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-2xl animate-pop-in rounded-2xl border border-line bg-panel p-6 shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Keyboard</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Shortcuts</h2>
          </div>
          <Kbd>esc</Kbd>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => {
            const rows = SHORTCUTS.filter((s) => s.group === group)
            if (!rows.length) return null
            return (
              <section key={group}>
                <h3 className="eyebrow mb-2">{group}</h3>
                <ul className="space-y-1.5">
                  {rows.map((s) => (
                    <li key={s.keys.join("+")} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted">{s.description}</span>
                      <span className="flex shrink-0 gap-1">
                        {s.keys.map((k) => (
                          <Kbd key={k} className="min-w-6 justify-center">
                            {k}
                          </Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
          Bare keys only. If you are typing in a field the keystroke is text, and if you hold a modifier it belongs to the
          browser or to ⌘K.
        </p>
      </div>
    </div>
  )
}
