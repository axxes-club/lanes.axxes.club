"use client"

import { useState, useTransition } from "react"
import { IconCheck, IconCopy } from "@/components/icons"

/**
 * Copy-to-clipboard for a code block.
 *
 * The button says "Copied" for two seconds and then goes back, and the
 * failure path says so rather than silently doing nothing — a copy button
 * that silently fails is worse than no copy button, because it looks like it
 * worked.
 */
export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  const [, start] = useTransition()
  const [failed, setFailed] = useState(false)

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          try {
            await navigator.clipboard.writeText(value)
            setDone(true)
            setFailed(false)
            setTimeout(() => setDone(false), 2000)
          } catch {
            setFailed(true)
            setTimeout(() => setFailed(false), 3000)
          }
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-panel-3 hover:text-text"
      aria-label={done ? "Copied" : "Copy to clipboard"}
    >
      {done ? (
        <>
          <IconCheck size={12} className="text-success" /> Copied
        </>
      ) : failed ? (
        "Press ⌘C"
      ) : (
        <>
          <IconCopy size={12} /> Copy
        </>
      )}
    </button>
  )
}
