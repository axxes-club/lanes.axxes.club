"use client"

import { useCallback, useEffect, useState } from "react"
import type { BoardT, CardDetailT, Priority } from "@/lib/lanes/types"
import {
  addChecklist,
  addChecklistItem,
  addComment,
  deleteChecklistItem,
  deleteComment,
  loadCard,
  moveCard,
  toggleCardLabel,
  toggleCardMember,
  toggleChecklistItem,
  updateCard,
} from "@/lib/lanes/actions"

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"]
const since = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function CardPanel({ cardId, board, me, onClose, onChanged }: { cardId: string; board: BoardT; me: string; onClose: () => void; onChanged: () => void }) {
  const [card, setCard] = useState<CardDetailT | null>(null)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [comment, setComment] = useState("")
  const [newItem, setNewItem] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<"comments" | "activity">("comments")

  const reload = useCallback(async () => {
    const c = await loadCard(cardId)
    setCard(c)
    if (c) {
      setTitle(c.title)
      setDesc(c.description ?? "")
    }
  }, [cardId])

  useEffect(() => {
    reload()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [reload, onClose])

  // Every mutation: save, then re-read the card and refresh the board behind it
  const act = async (fn: () => Promise<unknown>) => {
    await fn()
    await reload()
    onChanged()
  }

  if (!card) {
    return (
      <Shell onClose={onClose}>
        <p className="p-8 text-sm text-muted">Loading…</p>
      </Shell>
    )
  }

  const list = board.lists.find((l) => l.id === card.listId)

  return (
    <Shell onClose={onClose}>
      <div className="flex items-center gap-2 border-b border-line px-6 py-3 text-xs text-muted">
        <span className="font-mono">{card.key}</span>
        <span>in</span>
        <select
          value={card.listId}
          onChange={(e) => act(() => moveCard(card.id, e.target.value, 0))}
          className="rounded-md border border-line bg-panel-2 px-2 py-1 text-text"
          aria-label="Lane"
        >
          {board.lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {list?.isDoneList && <span className="text-emerald-400">✓ Done</span>}
        <button type="button" className="ml-auto rounded px-2 py-1 hover:bg-panel-2 hover:text-text" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="grid flex-1 gap-8 overflow-y-auto p-6 md:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-6">
          <textarea
            value={title}
            rows={2}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== card.title && act(() => updateCard(card.id, { title }))}
            className="w-full resize-none rounded-md bg-transparent text-xl font-semibold leading-snug outline-none focus:bg-panel-2"
            aria-label="Card title"
          />

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Description</h3>
            <textarea
              value={desc}
              rows={5}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => desc !== (card.description ?? "") && act(() => updateCard(card.id, { description: desc }))}
              placeholder="Add more detail…"
              className="input min-h-28"
              aria-label="Description"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Checklists</h3>
              <button type="button" className="text-xs text-accent hover:underline" onClick={() => act(() => addChecklist(card.id, "Checklist"))}>+ Add checklist</button>
            </div>
            {card.checklists.map((cl) => {
              const done = cl.items.filter((i) => i.done).length
              return (
                <div key={cl.id} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{cl.title}</span>
                    <span className="text-xs text-muted">{done}/{cl.items.length}</span>
                  </div>
                  <div className="mb-2 h-1 overflow-hidden rounded bg-line">
                    <div className="h-full bg-accent transition-all" style={{ width: `${cl.items.length ? (done / cl.items.length) * 100 : 0}%` }} />
                  </div>
                  <ul className="space-y-1">
                    {cl.items.map((it) => (
                      <li key={it.id} className="group flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={it.done} onChange={() => act(() => toggleChecklistItem(card.id, it.id))} className="size-4 accent-[var(--accent)]" aria-label={it.text} />
                        <span className={`flex-1 ${it.done ? "text-muted line-through" : ""}`}>{it.text}</span>
                        <button type="button" className="text-xs text-muted opacity-0 hover:text-danger group-hover:opacity-100" onClick={() => act(() => deleteChecklistItem(card.id, it.id))} aria-label={`Delete ${it.text}`}>✕</button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="mt-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const text = newItem[cl.id]?.trim()
                      if (!text) return
                      setNewItem({ ...newItem, [cl.id]: "" })
                      act(() => addChecklistItem(card.id, cl.id, text))
                    }}
                  >
                    <input value={newItem[cl.id] ?? ""} onChange={(e) => setNewItem({ ...newItem, [cl.id]: e.target.value })} placeholder="Add an item and press Enter" className="input h-8" aria-label={`New item in ${cl.title}`} />
                  </form>
                </div>
              )
            })}
          </section>

          <section>
            <div className="mb-3 flex gap-4 text-xs font-medium uppercase tracking-wider">
              <button type="button" className={tab === "comments" ? "text-text" : "text-muted"} onClick={() => setTab("comments")}>Comments ({card.commentsList.length})</button>
              <button type="button" className={tab === "activity" ? "text-text" : "text-muted"} onClick={() => setTab("activity")}>Activity</button>
            </div>
            {tab === "comments" ? (
              <div className="space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!comment.trim()) return
                    const text = comment
                    setComment("")
                    act(() => addComment(card.id, text))
                  }}
                >
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Write a comment…" className="input" aria-label="New comment"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement).requestSubmit() }} />
                  <button className="btn-primary mt-2 h-8 px-3" disabled={!comment.trim()}>Comment</button>
                </form>
                {[...card.commentsList].reverse().map((c) => (
                  <div key={c.id} className="rounded-lg bg-panel-2 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                      <span className="font-medium text-text">{c.author?.name ?? "Someone"}</span>
                      <span>{since(c.createdAt)}</span>
                      {c.mine && <button type="button" className="ml-auto hover:text-danger" onClick={() => act(() => deleteComment(card.id, c.id))}>Delete</button>}
                    </div>
                    <p className="whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {card.activity.map((a) => (
                  <li key={a.id} className="text-muted"><span className="text-text">{a.author ?? "Someone"}</span> {a.description} · <span className="text-xs">{since(a.createdAt)}</span></li>
                ))}
                {card.activity.length === 0 && <li className="text-muted">No activity yet.</li>}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 text-sm">
          <Side label="Assignees">
            <div className="flex flex-wrap gap-1.5">
              {board.people.map((p) => {
                const on = card.memberIds.includes(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => act(() => toggleCardMember(card.id, p.id))}
                    className={`rounded-full px-2.5 py-1 text-xs ring-1 ${on ? "bg-accent text-accent-ink ring-accent" : "text-muted ring-line hover:text-text"}`}>
                    {p.id === me ? "Me" : p.name.split(" ")[0]}
                  </button>
                )
              })}
            </div>
          </Side>
          <Side label="Labels">
            <div className="flex flex-wrap gap-1.5">
              {board.labels.map((l) => {
                const on = card.labelIds.includes(l.id)
                return (
                  <button key={l.id} type="button" onClick={() => act(() => toggleCardLabel(card.id, l.id))}
                    className={`rounded px-2 py-1 text-xs font-semibold ${on ? "text-white" : "text-muted opacity-60 ring-1 ring-line"}`} style={on ? { background: l.color } : undefined}>
                    {l.name}
                  </button>
                )
              })}
            </div>
          </Side>
          <Side label="Priority">
            <select value={card.priority} onChange={(e) => act(() => updateCard(card.id, { priority: e.target.value as Priority }))} className="input h-9" aria-label="Priority">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Side>
          <Side label="Due date">
            <input
              type="date"
              value={card.dueDate ? card.dueDate.slice(0, 10) : ""}
              onChange={(e) => act(() => updateCard(card.id, { dueDate: e.target.value ? `${e.target.value}T17:00:00` : null }))}
              className="input h-9"
              aria-label="Due date"
            />
          </Side>
          {card.completedAt && <p className="text-xs text-emerald-400">Completed {since(card.completedAt)}</p>}
        </aside>
      </div>
    </Shell>
  )
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-label="Card details">
      <div className="flex h-full w-full max-w-3xl flex-col border-l border-line bg-bg shadow-2xl">{children}</div>
    </div>
  )
}

function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  )
}
