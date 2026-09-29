"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx, Kbd } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import {
  IconArrowRight, IconBoard, IconCard, IconClose, IconCommand, IconGrid, IconInbox,
  IconPlus, IconSearch, IconSettings, IconSun, IconUser,
} from "@/components/icons"
import { SUITE } from "@/lib/axxes/suite"
import { paletteBoards, searchAction } from "@/lib/lanes/commands"
import { applyTheme } from "@/components/theme-toggle"
import type { SearchHit } from "@/lib/lanes/search"

/**
 * The command palette.
 *
 * The most important screen in the product. Linear built a company on the
 * idea that one keystroke should reach everything, and it is the clearest
 * single reason to pick Lanes over a tool that makes you hunt through menus.
 *
 * What makes it feel fast rather than merely exist:
 *
 *   - It opens on ⌘K from anywhere, including inside a text field, because
 *     someone who reached for the palette did not mean to be typing there.
 *   - The input keeps focus and its selection across every result change,
 *     so the characters survive the round trip to the server.
 *   - Results are debounced and out-of-order responses are discarded, so a
 *     slow response cannot overwrite a newer one.
 *   - The list is a real listbox, so arrow keys, Home/End and screen readers
 *     work without any of it being special-cased.
 *   - The default view before anything is typed is a dashboard: starred
 *     boards, what is assigned to you, and the shortcuts. An empty box is a
 *     wasted keystroke.
 */

type Group = "starred" | "recent" | "results" | "actions" | "apps"

type Item = {
  id: string
  group: Group
  label: string
  hint?: string | null
  Icon?: typeof IconBoard
  color?: string | null
  image?: string | null
  href?: string
  onSelect?: () => void
  shortcut?: string[]
  trailing?: React.ReactNode
}

const GROUP_TITLES: Record<Group, string> = {
  starred: "Starred",
  recent: "Your work",
  results: "Results",
  actions: "Actions",
  apps: "AXXES apps",
}

const GROUP_ORDER: Group[] = ["starred", "recent", "results", "actions", "apps"]

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [cursor, setCursor] = useState(0)
  const [data, setData] = useState<Awaited<ReturnType<typeof paletteBoards>> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  // The default view: what this person actually works on.
  useEffect(() => {
    let live = true
    start(async () => {
      const result = await paletteBoards().catch(() => null)
      if (live) setData(result)
    })
    return () => {
      live = false
    }
  }, [])

  // Debounced search, with out-of-order responses discarded.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setHits([])
      setCursor(0)
      return
    }
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      const results = await searchAction(q).catch(() => [])
      // A response that arrives after a newer query was sent is stale.
      if (id !== requestId.current) return
      setHits(results)
      setCursor(0)
    }, 90)
    return () => clearTimeout(timer)
  }, [query])

  const go = useCallback(
    (item: Item) => {
      onClose()
      if (item.onSelect) return item.onSelect()
      if (item.href) router.push(item.href)
    },
    [onClose, router],
  )


  const items = useMemo<Item[]>(() => {
    const q = query.trim()
    if (!q) {
      const starred: Item[] = (data?.starred ?? []).map((b) => ({
        id: `star-${b.id}`,
        group: "starred" as const,
        label: b.name,
        Icon: IconBoard,
        color: b.color,
        href: `/dashboard/b/${b.id}`,
      }))
      const work: Item[] = (data?.workload ?? []).slice(0, 5).map((w) => ({
        id: `work-${w.boardId}`,
        group: "recent" as const,
        label: w.board,
        hint: `${w.open} open${w.overdue ? ` · ${w.overdue} overdue` : ""}`,
        Icon: IconCard,
        color: w.color,
        href: `/dashboard/b/${w.boardId}?assignee=me`,
      }))
      return [...starred, ...work, ...actionItems(q), ...appItems(q)]
    }
    const results: Item[] = hits.map((h) => ({
      id: `${h.kind}-${h.id}`,
      group: "results" as const,
      label: h.title,
      hint: h.subtitle,
      Icon: h.kind === "board" ? IconBoard : h.kind === "card" ? IconCard : IconUser,
      color: (h.meta?.color as string) ?? null,
      image: (h.meta?.image as string) ?? null,
      href: h.href,
    }))
    return [...results, ...actionItems(q), ...appItems(q)]
  }, [query, hits, data, go])

  useEffect(() => setCursor((c) => Math.min(c, Math.max(0, items.length - 1))), [items.length])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" })
  }, [cursor])

  const groups = useMemo(() => {
    const out = new Map<Group, Item[]>()
    for (const item of items) {
      const list = out.get(item.group) ?? []
      list.push(item)
      out.set(item.group, list)
    }
    return GROUP_ORDER.filter((g) => out.has(g)).map((g) => ({ group: g, items: out.get(g)! }))
  }, [items])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      return onClose()
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      return setCursor((c) => (c + 1) % Math.max(1, flat.length))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      return setCursor((c) => (c - 1 + flat.length) % Math.max(1, flat.length))
    }
    if (e.key === "Home") {
      e.preventDefault()
      return setCursor(0)
    }
    if (e.key === "End") {
      e.preventDefault()
      return setCursor(flat.length - 1)
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const item = flat[cursor]
      if (item) go(item)
    }
  }


  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="flex max-h-[80vh] w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-lg"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <IconSearch size={18} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards, cards, people — or type a command"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="palette-list"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="btn-ghost btn-icon-sm" aria-label="Clear search">
              <IconClose size={14} />
            </button>
          )}
          <Kbd className="hidden sm:inline-flex">esc</Kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium">No matches for “{query}”</p>
              <p className="mt-1 text-xs text-muted">Try a card key like WEB-42, or part of a board name.</p>
            </div>
          ) : (
            groups.map(({ group, items: list }) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="eyebrow px-3 py-2">{GROUP_TITLES[group]}</p>
                {list.map((item) => {
                  const index = flat.indexOf(item)
                  const active = index === cursor
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={active}
                      data-index={index}
                      onMouseMove={() => setCursor(index)}
                      onClick={() => go(item)}
                      className={cx(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
                        active ? "bg-accent-soft text-text" : "text-text-2",
                      )}
                    >
                      {item.image ? (
                        <Avatar name={item.label} src={item.image} size={22} ring={false} />
                      ) : item.color ? (
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden />
                      ) : item.Icon ? (
                        <item.Icon size={16} className={cx("shrink-0", active ? "text-accent" : "text-faint")} />
                      ) : (
                        <IconArrowRight size={16} className="shrink-0 text-faint" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                      {item.hint && <span className="hidden max-w-[45%] shrink-0 truncate text-xs text-muted sm:block">{item.hint}</span>}
                      {item.shortcut && (
                        <span className="hidden shrink-0 gap-1 sm:flex">
                          {item.shortcut.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                      {item.trailing}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {pending ? "Loading…" : <><IconCommand size={12} /> Lanes</>}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Commands offered on every query, filtered by what was typed. */
function actionItems(q: string): Item[] {
  const all: Item[] = [
    { id: "a-new-board", group: "actions", label: "New board", hint: "Start from a template", Icon: IconPlus, href: "/dashboard?new=1" },
    { id: "a-mine", group: "actions", label: "My cards", hint: "Everything assigned to you", Icon: IconInbox, href: "/dashboard/my-cards" },
    { id: "a-insights", group: "actions", label: "Insights", hint: "Throughput, cycle time, WIP", Icon: IconGrid, href: "/dashboard/insights" },
    { id: "a-people", group: "actions", label: "People", hint: "Who is in this workspace", Icon: IconUser, href: "/dashboard/people" },
    { id: "a-apps", group: "actions", label: "AXXES apps", hint: "Everything in the suite", Icon: IconGrid, href: "/dashboard/apps" },
    { id: "a-settings", group: "actions", label: "Settings", Icon: IconSettings, href: "/dashboard/settings" },
    { id: "a-docs", group: "actions", label: "Developer docs", Icon: IconArrowRight, href: "/docs" },
    {
      // Theme is an action rather than a settings page: it is the one setting
      // people change constantly, and three clicks deep is silly.
      id: "a-theme",
      group: "actions",
      label: "Toggle light / dark",
      Icon: IconSun,
      onSelect: () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"),
    },
  ]
  if (!q) return all
  const needle = q.toLowerCase()
  return all.filter((i) => i.label.toLowerCase().includes(needle) || (i.hint ?? "").toLowerCase().includes(needle))
}

function appItems(q: string): Item[] {
  const items: Item[] = SUITE.filter((p) => !p.self).map((p) => ({
    id: `app-${p.key}`,
    group: "apps" as const,
    label: p.name,
    hint: p.blurb,
    href: p.href,
    trailing: (
      <span
        className="grid size-5 shrink-0 place-items-center rounded text-[9px] font-bold"
        style={{ background: `${p.accent}22`, color: p.accent }}
      >
        {p.glyph}
      </span>
    ),
  }))
  if (!q) return items
  const needle = q.toLowerCase()
  return items.filter((i) => i.label.toLowerCase().includes(needle) || (i.hint ?? "").toLowerCase().includes(needle))
}

/** The global shortcut that opens the palette from anywhere. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘K, and Ctrl+K on Windows and Linux where there is no ⌘.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      // `/` opens search from anywhere that is not already a text field,
      // which is the muscle memory from every search box ever shipped.
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return { open, setOpen }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

