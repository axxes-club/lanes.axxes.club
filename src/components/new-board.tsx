"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx } from "@/components/ui"
import { IconArrowRight, IconCheck, IconClose, IconPlus, IconSearch } from "@/components/icons"
import { TEMPLATES, type Template } from "@/lib/lanes/templates"
import { createBoard } from "@/lib/lanes/actions"

/**
 * The create-board dialog.
 *
 * Two decisions worth stating:
 *
 * 1. It is a dialog rather than a form on the page. Someone opening Lanes to
 *    look at a board should not have a template picker in their way, and a
 *    permanent form is the first thing people scroll past.
 *
 * 2. It is searchable, because "which of these nine templates did I want" is
 *    the actual question. Nine cards is enough that scrolling stops being
 *    free, and typing "sprint" or "bug" gets there immediately.
 */
export function NewBoardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const needle = query.trim().toLowerCase()
  const visible = TEMPLATES.filter(
    (t) =>
      !needle ||
      t.name.toLowerCase().includes(needle) ||
      t.bestFor.toLowerCase().includes(needle) ||
      t.summary.toLowerCase().includes(needle),
  )

  function choose(t: Template) {
    setError(null)
    start(async () => {
      const form = new FormData()
      form.set("name", `${t.name} board`)
      form.set("template", t.key)
      form.set("color", t.accent)
      try {
        await createBoard(form)
        onClose()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the board.")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="New board" className="flex max-h-[78vh] w-full max-w-3xl animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-lg">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <IconSearch size={18} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates — sprint, bug, content, events…"
            aria-label="Search templates"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          <button type="button" onClick={onClose} className="btn-ghost btn-icon-sm" aria-label="Close">
            <IconClose size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              No template matches “{query}”.{" "}
              <button type="button" onClick={() => setQuery("blank")} className="text-accent hover:underline">
                Start from blank
              </button>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={pending}
                  onClick={() => choose(t)}
                  className="group flex flex-col rounded-xl border border-line bg-panel-2 p-4 text-left transition hover:border-line-strong hover:bg-panel-3 disabled:opacity-50"
                >
                  <span className="mb-3 h-1.5 w-10 rounded-full" style={{ background: t.accent }} aria-hidden />
                  <span className="font-semibold tracking-tight">{t.name}</span>
                  <span className="mt-1 text-xs text-muted text-pretty">{t.summary}</span>
                  <span className="mt-3 flex-1" />
                  <span className="mt-3 flex items-center gap-1 text-xs text-faint transition group-hover:text-accent">
                    Use this <IconArrowRight size={12} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="border-t border-line bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <IconCheck size={12} /> You can change every lane after.
          </span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  )
}

/** A one-line inline creator, for the board list header. */
export function QuickCreate() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary btn-md">
        <IconPlus size={15} /> New board
      </button>
    )
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const clean = name.trim()
        if (!clean) return
        start(async () => {
          const form = new FormData()
          form.set("name", clean)
          form.set("template", "kanban")
          form.set("color", "#5b8cff")
          await createBoard(form)
          setName("")
          setOpen(false)
          router.refresh()
        })
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Board name"
        aria-label="Board name"
        className="input h-9 w-56"
      />
      <button className="btn-primary btn-md" disabled={pending || !name.trim()}>
        {pending ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-icon" aria-label="Cancel">
        <IconClose size={15} />
      </button>
    </form>
  )
}

/** Watches the URL for ?new=1, so the palette can open the dialog. */
export function NewBoardTrigger() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const check = () => setOpen(new URLSearchParams(window.location.search).get("new") === "1")
    check()
    window.addEventListener("popstate", check)
    return () => window.removeEventListener("popstate", check)
  }, [])

  return <NewBoardDialog open={open} onClose={() => setOpen(false)} />
}

/**
 * A button that creates a board from a specific template.
 *
 * Used by the template gallery. It reuses createBoard rather than adding a
 * second creation path, so "duplicate this template" and "new board" cannot
 * drift apart — which is how a board ends up with one set of lanes in one
 * place and a different set in another.
 */
export function NewBoardLauncher({
  templateKey,
  accent,
  name,
  children,
  className = "",
}: {
  templateKey: string
  accent: string
  name: string
  children: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const form = new FormData()
          form.set("name", name)
          form.set("template", templateKey)
          form.set("color", accent)
          await createBoard(form)
          router.refresh()
        })
      }}
    >
      <button type="submit" disabled={pending} className="w-full text-left disabled:opacity-60">
        {pending ? "Creating…" : children}
      </button>
    </form>
  )
}
