"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { BoardT, CardT, ListT, PersonT } from "@/lib/lanes/types"
import {
  archiveCard,
  createCard,
  createList,
  deleteCard,
  deleteList,
  duplicateCard,
  moveCard,
  renameBoard,
  reorderLists,
  toggleCardMember,
  updateCard,
  updateList,
} from "@/lib/lanes/actions"
import { CardPanel } from "./card-panel"
import { ContextMenu, type MenuItem } from "./context-menu"

type Due = "all" | "overdue" | "week" | "none"

// Prefer whatever is under the pointer, so a card lands in the lane you release it over
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length ? hits : rectIntersection(args)
}
const PRIORITY_COLOR: Record<string, string> = { urgent: "#ef4444", high: "#f59e0b", medium: "transparent", low: "transparent" }

/**
 * The board.
 *
 * `can` is a map of resolved permissions handed down from the server. It
 * decides what the controls *look* like; the server actions decide what is
 * actually allowed. A crafted request that skips the UI gets refused by the
 * action, which is the only half of the rule that matters.
 *
 * `focusCard` opens a card directly. It exists because links into Lanes come
 * from outside — search, insights, an AXXES app, a Slack message — and a
 * deep link that lands on the board without opening the card is a dead end.
 */
export function Board({
  board,
  me,
  can,
  focusCard = null,
}: {
  board: BoardT
  me: string
  can: Record<string, boolean>
  focusCard?: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [lists, setLists] = useState(board.lists)
  const [cards, setCards] = useState(board.cards)
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [dragging, setDragging] = useState<CardT | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  // Track which deep link has been honoured, so a re-render does not keep
  // re-opening the same card and trapping the panel shut.
  const [openedFocus, setOpenedFocus] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [label, setLabel] = useState<string>("")
  const [person, setPerson] = useState<string>("")
  const [due, setDue] = useState<Due>("all")
  const [name, setName] = useState(board.name)

  // Server truth replaces local state after every refresh
  const [synced, setSynced] = useState(board)
  if (synced !== board) {
    setSynced(board)
    setLists(board.lists)
    setCards(board.cards)
    setName(board.name)
  }

  useEffect(() => {
    if (!focusCard || focusCard === openedFocus) return
    if (!cards.some((c) => c.id === focusCard)) return
    setOpenCard(focusCard)
    setOpenedFocus(focusCard)
  }, [focusCard, openedFocus, cards])

  const labelsById = useMemo(() => new Map(board.labels.map((l) => [l.id, l])), [board.labels])
  const peopleById = useMemo(() => new Map(board.people.map((p) => [p.id, p])), [board.people])
  const filtering = !!(q || label || person || due !== "all")

  // One helper rather than a dozen `can["..."]` lookups in the JSX: it reads
  // better and it is the single place a future permission change lands.
  const may = (permission: string) => can[permission] !== false
  const readOnly = !may("card.update")

  const visible = (c: CardT) => {
    if (q && !`${c.key} ${c.title} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false
    if (label && !c.labelIds.includes(label)) return false
    if (person && !(person === "me" ? c.memberIds.includes(me) : c.memberIds.includes(person))) return false
    if (due === "none" && c.dueDate) return false
    if (due === "overdue" && !(c.dueDate && !c.completedAt && Date.parse(c.dueDate) < Date.now())) return false
    if (due === "week" && !(c.dueDate && Date.parse(c.dueDate) < Date.now() + 7 * 86_400_000)) return false
    return true
  }
  const cardsIn = (listId: string) => cards.filter((c) => c.listId === listId).sort((a, b) => a.position - b.position)

  const run = (fn: () => Promise<unknown>) => start(async () => {
    await fn()
    router.refresh()
  })

  // ── Drag and drop ──
  // Sensors are only attached when the person may actually move something.
  // A read-only stakeholder still gets a keyboard-navigable board; they just
  // cannot pick anything up, and a drag ghost they cannot drop is worse than
  // no drag at all.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const draggable = may("card.move")
  const listOf = (id: string) => (lists.some((l) => l.id === id) ? id : cards.find((c) => c.id === id)?.listId)

  const onDragStart = (e: DragStartEvent) => setDragging(cards.find((c) => c.id === e.active.id) ?? null)

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over || active.data.current?.type !== "card") return
    const from = listOf(String(active.id)), to = listOf(String(over.id))
    if (!from || !to || from === to) return
    setCards((prev) => {
      const target = prev.filter((c) => c.listId === to).sort((a, b) => a.position - b.position)
      const overIndex = target.findIndex((c) => c.id === over.id)
      const pos = overIndex >= 0 ? target[overIndex].position - 0.5 : (target.at(-1)?.position ?? 0) + 1
      return prev.map((c) => (c.id === active.id ? { ...c, listId: to, position: pos } : c))
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    if (active.data.current?.type === "list") {
      if (active.id === over.id) return
      const ids = lists.map((l) => l.id)
      const next = arrayMove(lists, ids.indexOf(String(active.id)), ids.indexOf(listOf(String(over.id)) ?? String(over.id)))
      setLists(next.map((l, i) => ({ ...l, position: i })))
      return run(() => reorderLists(board.id, next.map((l) => l.id)))
    }
    const to = listOf(String(over.id))
    if (!to) return
    const column = cards.filter((c) => c.listId === to).sort((a, b) => a.position - b.position)
    const fromIndex = column.findIndex((c) => c.id === active.id)
    const overIndex = column.findIndex((c) => c.id === over.id)
    const ordered = fromIndex >= 0 && overIndex >= 0 ? arrayMove(column, fromIndex, overIndex) : column
    const index = ordered.findIndex((c) => c.id === active.id)
    setCards((prev) => prev.map((c) => {
      const i = ordered.findIndex((o) => o.id === c.id)
      return i >= 0 ? { ...c, listId: to, position: i } : c
    }))
    run(() => moveCard(String(active.id), to, Math.max(0, index)))
  }

  // Optimistic: remove from the board immediately; the server confirms on refresh
  const dropCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id))

  // ── Menus ──
  const cardMenu = (card: CardT, x: number, y: number) =>
    setMenu({
      x,
      y,
      items: [
        { label: "Open card", shortcut: "↵", onSelect: () => setOpenCard(card.id) },
        { label: card.memberIds.includes(me) ? "Leave card" : "Assign to me", onSelect: () => run(() => toggleCardMember(card.id, me)) },
        {
          label: "Move to",
          children: lists.map((l) => ({
            label: l.name,
            disabled: l.id === card.listId,
            onSelect: () => {
              setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, listId: l.id, position: cardsIn(l.id).length, completedAt: l.isDoneList ? new Date().toISOString() : null } : c)))
              run(() => moveCard(card.id, l.id, cardsIn(l.id).length))
            },
          })),
        },
        {
          label: "Priority",
          children: (["urgent", "high", "medium", "low"] as const).map((p) => ({ label: p[0].toUpperCase() + p.slice(1), checked: card.priority === p, onSelect: () => run(() => updateCard(card.id, { priority: p })) })),
        },
        { label: "Copy link", onSelect: () => navigator.clipboard.writeText(`${location.origin}/dashboard/b/${board.id}?card=${card.id}`) },
        { label: "Duplicate", onSelect: () => run(() => duplicateCard(card.id)) },
        { separator: true },
        { label: "Archive", onSelect: () => { dropCard(card.id); run(() => archiveCard(card.id)) } },
        { label: "Delete", danger: true, onSelect: () => { if (confirm(`Delete ${card.key}?`)) { dropCard(card.id); run(() => deleteCard(card.id)) } } },
      ],
    })

  const listMenu = (list: ListT, x: number, y: number) =>
    setMenu({
      x,
      y,
      items: [
        { label: "Rename lane", onSelect: () => { const n = prompt("Lane name", list.name); if (n) run(() => updateList(board.id, list.id, { name: n })) } },
        { label: list.wipLimit ? `WIP limit: ${list.wipLimit}` : "Set WIP limit", onSelect: () => { const n = prompt("Max cards in this lane (blank for none)", String(list.wipLimit ?? "")); if (n !== null) run(() => updateList(board.id, list.id, { wipLimit: n ? Number(n) : null })) } },
        { label: "Cards here count as done", checked: list.isDoneList, onSelect: () => run(() => updateList(board.id, list.id, { isDoneList: !list.isDoneList })) },
        { separator: true },
        { label: "Delete lane", danger: true, onSelect: () => confirm(`Delete “${list.name}” and its cards?`) && run(() => deleteList(board.id, list.id)) },
      ],
    })

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:h-[calc(100dvh-6rem)]">
      {readOnly && (
        <p className="no-print mb-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-muted">
          You have read-only access to this board. Ask an owner for a role if you need to change anything.
        </p>
      )}

      {/* Header + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="size-3 rounded-full" style={{ background: board.color ?? "var(--accent)" }} />
        {may("board.update") ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== board.name && run(() => renameBoard(board.id, name))}
            className="min-w-0 max-w-md flex-1 rounded-md bg-transparent px-1 text-2xl font-semibold tracking-tight outline-none focus:bg-panel"
            aria-label="Board name"
          />
        ) : (
          <h1 className="min-w-0 max-w-md flex-1 truncate px-1 text-2xl font-semibold tracking-tight">{board.name}</h1>
        )}
        {pending && <span className="text-xs text-muted">Saving…</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter cards…" className="input h-9 w-44" aria-label="Filter cards" />
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="input h-9 w-auto" aria-label="Filter by label">
            <option value="">All labels</option>
            {board.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={person} onChange={(e) => setPerson(e.target.value)} className="input h-9 w-auto" aria-label="Filter by person">
            <option value="">Everyone</option>
            <option value="me">Assigned to me</option>
            {board.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={due} onChange={(e) => setDue(e.target.value as Due)} className="input h-9 w-auto" aria-label="Filter by due date">
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due this week</option>
            <option value="none">No due date</option>
          </select>
          {filtering && <button type="button" className="btn-ghost h-9" onClick={() => { setQ(""); setLabel(""); setPerson(""); setDue("all") }}>Clear</button>}
        </div>
      </div>

      {/* Lanes */}
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
          <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy} disabled={!draggable}>
            {lists.map((list) => (
              <Lane
                key={list.id}
                list={list}
                cards={cardsIn(list.id)}
                visible={visible}
                labelsById={labelsById}
                peopleById={peopleById}
                onOpen={setOpenCard}
                onCardMenu={cardMenu}
                onListMenu={listMenu}
                onAdd={(title) => run(() => createCard(board.id, list.id, title))}
                canAdd={may("card.create")}
                canSort={draggable}
              />
            ))}
          </SortableContext>
          {may("card.create") && <AddLane onAdd={(n) => run(() => createList(board.id, n))} />}
        </div>
        <DragOverlay>{dragging && <CardTile card={dragging} labelsById={labelsById} peopleById={peopleById} overlay />}</DragOverlay>
      </DndContext>

      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
      {openCard && <CardPanel cardId={openCard} board={board} me={me} onClose={() => setOpenCard(null)} onChanged={() => router.refresh()} />}
    </div>
  )
}

function Lane({
  list, cards, visible, labelsById, peopleById, onOpen, onCardMenu, onListMenu, onAdd, canAdd, canSort,
}: {
  list: ListT
  cards: CardT[]
  visible: (c: CardT) => boolean
  labelsById: Map<string, { name: string; color: string }>
  peopleById: Map<string, PersonT>
  onOpen: (id: string) => void
  onCardMenu: (c: CardT, x: number, y: number) => void
  onListMenu: (l: ListT, x: number, y: number) => void
  onAdd: (title: string) => void
  /** card.create — whether the inline composer shows at all. */
  canAdd: boolean
  /** card.move — whether the lane header is a drag handle. */
  canSort: boolean
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: list.id, data: { type: "list" } })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const shown = cards.filter(visible)
  const over = list.wipLimit != null && cards.length > list.wipLimit

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-panel ${over ? "border-danger/60" : "border-line"} ${isDragging ? "opacity-50" : ""}`}
      aria-label={list.name}
      data-lane={list.name}
      onContextMenu={(e) => { if ((e.target as HTMLElement).closest("[data-card]")) return; e.preventDefault(); onListMenu(list, e.clientX, e.clientY) }}
    >
      <header
        className={`flex items-center gap-2 px-3 pb-2 pt-3 ${canSort ? "cursor-grab active:cursor-grabbing" : ""}`}
        {...attributes}
        {...listeners}
      >
        <h2 className="flex-1 truncate text-sm font-semibold">{list.name}</h2>
        {list.isDoneList && <span title="Cards here count as done">✓</span>}
        <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${over ? "bg-danger/15 text-danger" : "text-muted"}`}>
          {cards.length}{list.wipLimit != null ? `/${list.wipLimit}` : ""}
        </span>
        {canSort && (
          <button
            type="button"
            className="rounded px-1 text-muted hover:text-text"
            aria-label={`${list.name} options`}
            onClick={(e) => onListMenu(list, e.clientX, e.clientY)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ⋯
          </button>
        )}
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} hidden={!visible(card)} labelsById={labelsById} peopleById={peopleById} onOpen={onOpen} onMenu={onCardMenu} />
          ))}
          {cards.length > 0 && shown.length === 0 && <p className="px-1 py-2 text-xs text-muted">No matching cards</p>}
        </div>
      </SortableContext>
      <div className="p-2 pt-0">
        {!canAdd ? null : adding ? (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onAdd(title); setTitle("") } }}>
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) { onAdd(title); setTitle("") } }
                if (e.key === "Escape") setAdding(false)
              }}
              placeholder="What needs doing?"
              className="input resize-none"
              aria-label={`New card in ${list.name}`}
            />
            <div className="mt-2 flex gap-2">
              <button className="btn-primary h-8 px-3">Add card</button>
              <button type="button" className="btn-ghost h-8 px-3" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-panel-2 hover:text-text">+ Add a card</button>
        )}
      </div>
    </section>
  )
}

function SortableCard({ card, hidden, ...rest }: {
  card: CardT
  hidden: boolean
  labelsById: Map<string, { name: string; color: string }>
  peopleById: Map<string, PersonT>
  onOpen: (id: string) => void
  onMenu: (c: CardT, x: number, y: number) => void
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: "card" } })
  if (hidden) return <div ref={setNodeRef} className="hidden" />
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      data-card={card.key}
      onClick={() => rest.onOpen(card.id)}
      onKeyDown={(e) => { if (e.key === "Enter") rest.onOpen(card.id) }}
      onContextMenu={(e) => { e.preventDefault(); rest.onMenu(card, e.clientX, e.clientY) }}
      className={`select-none ${isDragging ? "opacity-30" : ""}`}
    >
      <CardTile card={card} labelsById={rest.labelsById} peopleById={rest.peopleById} />
    </div>
  )
}

function CardTile({ card, labelsById, peopleById, overlay }: { card: CardT; labelsById: Map<string, { name: string; color: string }>; peopleById: Map<string, PersonT>; overlay?: boolean }) {
  const overdue = card.dueDate && !card.completedAt && Date.parse(card.dueDate) < Date.now()
  return (
    <article
      className={`cursor-pointer rounded-lg border border-line bg-panel-2 p-3 text-sm transition hover:border-accent/50 ${overlay ? "rotate-2 shadow-2xl" : ""}`}
      style={{ borderLeft: `3px solid ${PRIORITY_COLOR[card.priority] === "transparent" ? "var(--line)" : PRIORITY_COLOR[card.priority]}` }}
    >
      {card.labelIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labelIds.map((id) => labelsById.get(id)).filter(Boolean).map((l) => (
            <span key={l!.name} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: l!.color }}>{l!.name}</span>
          ))}
        </div>
      )}
      <p className={`leading-snug ${card.completedAt ? "text-muted line-through" : ""}`}>{card.title}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span className="font-mono">{card.key}</span>
        {card.dueDate && (
          <span className={overdue ? "font-semibold text-danger" : ""}>
            ◷ {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {card.checklistTotal > 0 && <span className={card.checklistDone === card.checklistTotal ? "text-emerald-400" : ""}>☑ {card.checklistDone}/{card.checklistTotal}</span>}
        {card.comments > 0 && <span>💬 {card.comments}</span>}
        <span className="ml-auto flex -space-x-1.5">
          {card.memberIds.slice(0, 3).map((id) => {
            const p = peopleById.get(id)
            return p ? (
              <span key={id} title={p.name} className="grid size-5 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-ink ring-2 ring-panel-2">
                {p.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            ) : null
          })}
        </span>
      </div>
    </article>
  )
}

function AddLane({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("")
  return (
    <form
      className="h-fit w-72 shrink-0 rounded-xl border border-dashed border-line p-3"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name); setName("") } }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="+ Add a lane" className="input" aria-label="New lane name" />
    </form>
  )
}
