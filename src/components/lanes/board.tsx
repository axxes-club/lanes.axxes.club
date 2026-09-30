"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
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
import { ListView } from "./list-view"
import { ShortcutsSheet } from "@/components/shortcuts-sheet"
import { PokerPanel } from "./poker-panel"
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
  starred = false,
  onStarChange,
}: {
  board: BoardT
  me: string
  can: Record<string, boolean>
  focusCard?: string | null
  /** The board's star, so `s` can toggle it from the keyboard. */
  starred?: boolean
  onStarChange?: (next: boolean) => void
}) {
  const chromeStar = starred
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
  const [pokerCard, setPokerCard] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  // The card the keyboard is pointing at. Kept separate from `openCard` so
  // arrow keys can move a selection without opening anything — you scan down
  // a list, then press enter.
  const [selected, setSelected] = useState<string | null>(null)
  // The view lives in the URL so a filtered board is a bookmark, and so the
  // back button moves between views rather than leaving the board.
  const [view, setView] = useState<"board" | "list">("board")

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("view")
    if (initial === "list" || initial === "board") setView(initial)
  }, [])

  const switchView = useCallback(
    (next: "board" | "list") => {
      setView(next)
      const url = new URL(window.location.href)
      if (next === "list") url.searchParams.set("view", "list")
      else url.searchParams.delete("view")
      router.replace(url.toString(), { scroll: false })
    },
    [router],
  )
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

  /**
   * The order J and K walk.
   *
   * Lane by lane, left to right, top to bottom within each — the order a
   * person reads a board, not the order it happens to be in the database.
   * Filters are respected, so walking a filtered board does not land on
   * something the person cannot currently see.
   */
  const walkable = useMemo(
    () => lists.flatMap((l) => cardsIn(l.id).filter(visible)).map((c) => c.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, cards, q, label, person, due],
  )

  const step = (direction: 1 | -1) => {
    if (!walkable.length) return
    const at = selected ? walkable.indexOf(selected) : -1
    const next = at === -1 ? (direction === 1 ? 0 : walkable.length - 1) : at + direction
    setSelected(walkable[Math.max(0, Math.min(walkable.length - 1, next))] ?? null)
  }

  // Scroll the selection into view: keyboard navigation that moves a
  // highlight off-screen is worse than no navigation.
  useEffect(() => {
    if (!selected) return
    document.querySelector<HTMLElement>(`[data-card-id="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selected])

  const run = (fn: () => Promise<unknown>) => start(async () => {
    await fn()
    router.refresh()
  })

  /**
   * The board's keyboard layer.
   *
   * Two guards, both of which matter more than the shortcuts themselves:
   * a keystroke in a text field is text, and a keystroke with a modifier
   * held belongs to the browser or to the palette. Without those, typing a
   * description containing "n" would create cards.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      if (openCard || pokerCard) return

      const clearFilters = () => {
        if (!filtering) return false
        setQ(""); setLabel(""); setPerson(""); setDue("all")
        return true
      }

      switch (e.key) {
        case "j": case "J": e.preventDefault(); step(1); break
        case "k": case "K": e.preventDefault(); step(-1); break
        case "Enter":
          if (selected) { e.preventDefault(); setOpenCard(selected) }
          break
        case "Escape":
          // Esc clears a filter before it does anything else, so you can
          // get out of a filtered view without reaching for the mouse.
          if (selected) setSelected(null)
          else if (!clearFilters()) setSelected(null)
          break
        case "?":
          e.preventDefault(); setSheet(true); break
        case "v": case "V":
          e.preventDefault(); switchView(view === "board" ? "list" : "board"); break
        case "s": case "S":
          e.preventDefault(); onStarChange?.(!chromeStar); break
        case "x": case "X":
          if (clearFilters()) e.preventDefault(); break
        case "n": case "N": {
          e.preventDefault()
          const list = lists[0]
          if (list && may("card.create")) {
            const title = window.prompt(`New card in ${list.name}`)
            if (title?.trim()) run(() => createCard(board.id, list.id, title.trim()))
          }
          break
        }
        case "l": case "L": {
          e.preventDefault()
          if (may("card.create")) {
            const name = window.prompt("Lane name")
            if (name?.trim()) run(() => createList(board.id, name.trim()))
          }
          break
        }
        case "e": case "E": {
          e.preventDefault()
          if (may("board.update")) {
            const next = window.prompt("Board name", board.name)
            if (next?.trim() && next.trim() !== board.name) run(() => renameBoard(board.id, next.trim()))
          }
          break
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
        ...(may("poker.facilitate") || may("poker.read")
          ? [{ label: "Estimate with poker", onSelect: () => setPokerCard(card.id) } as MenuItem]
          : []),
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
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel-2 p-0.5" role="group" aria-label="View">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => switchView(v)}
                aria-pressed={view === v}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
                  view === v ? "bg-panel-3 text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
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

      {view === "list" ? (
        <ListView board={board} me={me} visible={visible} canEdit={may("card.create")} />
      ) : (
      /* Lanes */
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
                selected={selected}
                onSelect={(id) => { setSelected(id); setOpenCard(id) }}
              />
            ))}
          </SortableContext>
          {may("card.create") && <AddLane onAdd={(n) => run(() => createList(board.id, n))} />}
        </div>
        <DragOverlay>{dragging && <CardTile card={dragging} labelsById={labelsById} peopleById={peopleById} overlay />}</DragOverlay>
      </DndContext>
      )}

      {sheet && <ShortcutsSheet open onClose={() => setSheet(false)} />}

      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
      {openCard && (
        <CardPanel
          cardId={openCard}
          board={board}
          me={me}
          can={can}
          onClose={() => {
            setOpenCard(null)
            // Return the highlight where the panel was, so a person who
            // pressed escape to go back lands on the card they were reading.
            setSelected(openCard)
            // Pull server truth so the tile shows what was just edited
            router.refresh()
          }}
          onNavigate={(direction) => {
            const at = walkable.indexOf(openCard)
            const next = walkable[at + direction]
            if (next) {
              setOpenCard(next)
              setSelected(next)
            }
          }}
          onChanged={() => router.refresh()}
        />
      )}
      {pokerCard && (
        <PokerPanel
          boardId={board.id}
          cardId={pokerCard}
          cardTitle={cards.find((c) => c.id === pokerCard)?.title ?? null}
          canFacilitate={may("poker.facilitate")}
          onClose={() => setPokerCard(null)}
        />
      )}
    </div>
  )
}

function Lane({
  list, cards, visible, labelsById, peopleById, onOpen, onCardMenu, onListMenu, onAdd, canAdd, canSort,
  selected, onSelect,
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
  /** The card the keyboard is pointing at. */
  selected: string | null
  /** Enter on a highlighted card. */
  onSelect: (id: string) => void
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
            <SortableCard
              key={card.id}
              card={card}
              hidden={!visible(card)}
              labelsById={labelsById}
              peopleById={peopleById}
              onOpen={onOpen}
              onMenu={onCardMenu}
              selected={selected}
              onSelect={onSelect}
            />
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
  /** The card the keyboard is pointing at, highlighted with a ring. */
  selected: string | null
  /** Enter, or a click: open it. */
  onSelect: (id: string) => void
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
      onClick={() => {
        rest.onSelect(card.id)
      }}
      onKeyDown={(e) => { if (e.key === "Enter") rest.onOpen(card.id) }}
      onContextMenu={(e) => { e.preventDefault(); rest.onMenu(card, e.clientX, e.clientY) }}
      data-card-id={card.id}
      className={`select-none rounded-lg ${isDragging ? "opacity-30" : ""} ${
        rest.selected === card.id ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : ""
      }`}
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

/** True when focus is in a field, so a letter key means text, not a command. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
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
