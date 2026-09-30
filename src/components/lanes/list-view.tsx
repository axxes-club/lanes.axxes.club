"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import { IconArrowDown, IconArrowUp, IconPlus, IconSearch } from "@/components/icons"
import type { BoardT, CardT, ListT, PersonT, Priority } from "@/lib/lanes/types"
import { fieldDisplay } from "@/lib/lanes/field-validation"
import { createCard, updateCard } from "@/lib/lanes/actions"

/**
 * The list view.
 *
 * The board is the right default for moving work and the wrong one for
 * reading it. Scanning forty cards to answer "what is late?" or "what has
 * nobody touched?" is slow on a board and instant in a table, so both exist
 * and the state lives in the URL — a filtered view is then a bookmark and
 * something you can paste into a message.
 *
 * Columns are fixed and sortable rather than user-configurable. Configurable
 * columns is a feature that sounds good and is used twice.
 */

type Sort = { key: "position" | "priority" | "due" | "title" | "lane"; dir: 1 | -1 }

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

const PRIORITY_TONE: Record<Priority, string> = {
  urgent: "text-danger",
  high: "text-warning",
  medium: "text-muted",
  low: "text-faint",
}

export function ListView({
  board,
  me,
  visible,
  canEdit,
  bulkIds = new Set(),
  onToggleBulk,
  sort: controlledSort,
  onSortChange,
  mode = "table",
}: {
  board: BoardT
  me: string
  visible: (c: CardT) => boolean
  sort?: Sort
  onSortChange?: (sort: Sort) => void
  mode?: "list" | "table"
  bulkIds?: Set<string>
  onToggleBulk?: (id: string) => void
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [localSort, setLocalSort] = useState<Sort>({ key: "position", dir: 1 })
  const sort = controlledSort ?? localSort
  const setSort = (update: (previous: Sort) => Sort) => { const next = update(sort); if (onSortChange) onSortChange(next); else setLocalSort(next) }
  const [newLane, setNewLane] = useState<string | null>(null)

  const listsById = useMemo(() => new Map(board.lists.map((l) => [l.id, l])), [board.lists])
  const labelsById = useMemo(() => new Map(board.labels.map((l) => [l.id, l])), [board.labels])
  const peopleById = useMemo(() => new Map(board.people.map((p) => [p.id, p])), [board.people])

  const rows = useMemo(() => {
    const list = board.cards.filter(visible)
    const value = (c: CardT) => {
      switch (sort.key) {
        case "priority": return PRIORITY_ORDER[c.priority]
        case "title": return c.title.toLowerCase()
        case "lane": return (listsById.get(c.listId)?.name ?? "").toLowerCase()
        case "due": return c.dueDate ? Date.parse(c.dueDate) : Number.MAX_SAFE_INTEGER
        default: return c.position
      }
    }
    return [...list].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      if (av === bv) return a.position - b.position
      return av > bv ? sort.dir : -sort.dir
    })
  }, [board.cards, visible, sort, listsById])

  const toggle = (key: Sort["key"]) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))

  const Header = ({ label, sortKey, className }: { label: string; sortKey?: Sort["key"]; className?: string }) => (
    <th className={cx("px-3 py-2 text-left text-[11px] font-medium text-muted", className)}>
      {sortKey ? (
        <button
          type="button"
          onClick={() => toggle(sortKey)}
          className="inline-flex items-center gap-1 transition hover:text-text"
          aria-sort={sort.key === sortKey ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        >
          {label}
          {sort.key === sortKey &&
            (sort.dir === 1 ? <IconArrowUp size={10} /> : <IconArrowDown size={10} />)}
        </button>
      ) : (
        label
      )}
    </th>
  )

  return (
    <div className="min-h-0 flex-1 overflow-auto pb-8">
      <div className="card overflow-hidden">
        <table aria-label={mode === "table" ? "Cards table" : "Cards list"} className={`w-full text-sm ${mode === "table" ? "min-w-[52rem]" : "min-w-[38rem]"}`}>
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-line">
              {onToggleBulk && <Header label="Select" />}
              <Header label="Card" sortKey="title" className="w-[38%]" />
              <Header label="Lane" sortKey="lane" className="w-[16%]" />
              <Header label="Priority" sortKey="priority" className="w-[11%]" />
              {board.settings?.enableDueDates !== false && <Header label="Due" sortKey="due" className="w-[12%]" />}
              {board.settings?.enableMembers !== false && <Header label="Assignee" className="w-[15%]" />}
              {board.settings?.enableChecklists !== false && <Header label="Progress" className="w-[8%]" />}
              {(board.fields ?? []).map((f) => <Header key={f.id} label={f.name} />)}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const list = listsById.get(c.listId)
              const overdue = c.dueDate && !c.completedAt && Date.parse(c.dueDate) < Date.now()
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-line-soft transition hover:bg-panel-2"
                  onClick={() => router.push(`/dashboard/b/${board.id}?card=${c.id}`)}
                >
                  {onToggleBulk && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${c.key}`} checked={bulkIds.has(c.id)} onChange={() => onToggleBulk(c.id)} /></td>}
                  <td className="px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-14 shrink-0 font-mono text-[11px] text-faint">{c.key}</span>
                      <span className="min-w-0">
                        <span className={`block truncate ${c.completedAt ? "text-muted line-through" : "text-text"}`}>
                          {c.title}
                        </span>
                        {c.labelIds.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {c.labelIds.map((id) => labelsById.get(id)).filter(Boolean).map((l) => (
                              <span
                                key={l!.id}
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                                style={{ background: l!.color }}
                              >
                                {l!.name}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{list?.name ?? "—"}</td>
                  <td className={cx("px-3 py-2.5 capitalize", PRIORITY_TONE[c.priority])}>{c.priority}</td>
                  {board.settings?.enableDueDates !== false && <td className={cx("px-3 py-2.5 text-xs", overdue ? "font-medium text-danger" : "text-muted")}>
                    {c.dueDate
                      ? new Date(c.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>}
                  {board.settings?.enableMembers !== false && <td className="px-3 py-2.5">
                    <span className="flex -space-x-1.5">
                      {c.memberIds.slice(0, 3).map((id) => {
                        const p = peopleById.get(id)
                        return p ? <Avatar key={id} name={p.name} src={p.image} size={20} /> : null
                      })}
                      {c.memberIds.length === 0 && <span className="text-xs text-faint">—</span>}
                    </span>
                  </td>}
                  {board.settings?.enableChecklists !== false && <td className="px-3 py-2.5 text-xs tabular-nums text-muted">
                    {c.checklistTotal > 0 ? `${c.checklistDone}/${c.checklistTotal}` : "—"}
                  </td>}
                  {(board.fields ?? []).map((f) => <td key={f.id} className="px-3 py-2.5 text-xs text-muted">{fieldDisplay(f, c.customFields?.[f.key], board.people)}</td>)}
                </tr>
              )
            })}

            {newLane && (
              <tr>
                <td colSpan={6 + (board.fields?.length ?? 0)} className="px-3 py-2">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const title = newLane.trim()
                      if (!title) return setNewLane(null)
                      start(async () => {
                        await createCard(board.id, board.lists[0]?.id ?? "", title)
                        setNewLane(null)
                        router.refresh()
                      })
                    }}
                  >
                    <input
                      autoFocus
                      value={newLane}
                      onChange={(e) => setNewLane(e.target.value)}
                      onBlur={() => !newLane.trim() && setNewLane(null)}
                      placeholder="Card title"
                      className="input h-8"
                      aria-label="New card title"
                    />
                    <button className="btn-primary btn-sm" disabled={pending || !newLane.trim()}>
                      Add to {board.lists[0]?.name ?? "board"}
                    </button>
                  </form>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="card mt-3 grid place-items-center px-6 py-12 text-center">
          <IconSearch size={20} className="mb-3 text-faint" />
          <p className="text-sm font-medium">Nothing matches these filters</p>
          <p className="mt-1 text-sm text-muted">Clear a filter, or press esc.</p>
        </div>
      )}

      {canEdit && !newLane && (
        <button
          type="button"
          onClick={() => setNewLane("")}
          className="btn-ghost btn-md mt-3 w-full border border-dashed border-line"
        >
          <IconPlus size={14} /> Add a card
        </button>
      )}
    </div>
  )
}
