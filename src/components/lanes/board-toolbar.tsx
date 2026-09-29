"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cx, Kbd } from "@/components/ui"
import { IconCheck, IconClock, IconPlus, IconStar, IconTarget, IconUsers, IconClose } from "@/components/icons"
import type { BoardChrome } from "@/lib/lanes/board-view"
import { completeSprintAction, createSprintAction, startSprintAction } from "@/lib/lanes/sprint-actions"
import { setStar } from "@/lib/lanes/commands"
import { BOARD_ROLE_LABEL, isBoardRole } from "@/lib/lanes/roles"

/**
 * The board toolbar.
 *
 * Everything a person can do *to the board* rather than *on it* — the sprint
 * clock, the role badge, the members link, the star. Grouping it here keeps
 * the board itself about cards, which is the thing people actually came for.
 *
 * Permissions arrive as resolved booleans from the server. They hide the
 * controls this person may not use; the server actions refuse the rest, so a
 * crafted request gets the same answer a hidden button would have.
 */
export function BoardToolbar({
  boardId,
  boardName,
  chrome,
}: {
  boardId: string
  boardName: string
  chrome: BoardChrome
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const can = (p: string) => chrome.permissions[p] === true
  const role = isBoardRole(chrome.role) ? BOARD_ROLE_LABEL[chrome.role] : chrome.elevated ? "Workspace manager" : "Viewer"

  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (r.error) setError(r.error)
      router.refresh()
    })

  const active = chrome.activeSprint
  const daysLeft = active?.endsAt
    ? Math.max(0, Math.ceil((Date.parse(active.endsAt) - Date.now()) / 86_400_000))
    : null

  return (
    <div className="no-print">
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Sprint clock. The most time-sensitive thing on a board, so it is
            first and it is the only thing that is coloured. */}
        {active ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs font-medium">
            <IconTarget size={12} className="text-accent" />
            {active.name}
            {daysLeft !== null && (
              <span className="text-accent/70">
                · {daysLeft === 0 ? "ends today" : `${daysLeft}d left`}
              </span>
            )}
            {can("sprint.complete") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => completeSprintAction(boardId, active.id))}
                className="ml-1 rounded px-1.5 py-0.5 text-[11px] text-accent transition hover:bg-accent/20"
              >
                Complete
              </button>
            )}
          </span>
        ) : (
          chrome.sprints.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-3 px-3 py-1 text-xs text-muted">
              <IconClock size={12} /> No active sprint
            </span>
          )
        )}

        {can("sprint.manage") &&
          (creating ? (
            <CreateSprint
              boardId={boardId}
              onDone={() => {
                setCreating(false)
                router.refresh()
              }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted transition hover:border-line-strong hover:text-text"
            >
              <IconPlus size={12} /> Sprint
            </button>
          ))}

        {chrome.sprints
          .filter((sp) => sp.status === "planned")
          .slice(0, 2)
          .map((sp) =>
            can("sprint.manage") ? (
              <button
                key={sp.id}
                type="button"
                disabled={pending}
                onClick={() => act(() => startSprintAction(boardId, sp.id))}
                className="rounded-full bg-panel-3 px-2.5 py-1 text-[11px] text-muted transition hover:bg-panel-hi hover:text-text"
                title="Start this sprint"
              >
                Start “{sp.name}”
              </button>
            ) : null,
          )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden rounded-full bg-panel-3 px-2.5 py-1 text-[11px] text-muted sm:inline">
            {role}
            {chrome.elevated && !isBoardRole(chrome.role) && " · elevated"}
          </span>

          {can("board.members") && (
            <Link
              href={`/dashboard/b/${boardId}/settings`}
              className="btn-ghost btn-icon-sm"
              title="People and roles"
              aria-label="People and roles"
            >
              <IconUsers size={15} />
            </Link>
          )}

          <button
            type="button"
            aria-pressed={chrome.starred}
            aria-label={chrome.starred ? `Unstar ${boardName}` : `Star ${boardName}`}
            title={chrome.starred ? "Unstar" : "Star this board"}
            onClick={() => {
              const next = !chrome.starred
              start(async () => {
                await setStar(boardId, next)
                router.refresh()
              })
            }}
            className={cx("btn-icon-sm btn-ghost", chrome.starred && "text-warning")}
          >
            <IconStar size={15} className={chrome.starred ? "fill-current" : ""} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateSprint({
  boardId,
  onDone,
  onCancel,
}: {
  boardId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const inTwoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        start(async () => {
          setError(null)
          const r = await createSprintAction(
            boardId,
            String(f.get("name") ?? ""),
            String(f.get("goal") ?? ""),
            String(f.get("startsAt") ?? ""),
            String(f.get("endsAt") ?? ""),
          )
          if (r.error) setError(r.error)
          else onDone()
        })
      }}
    >
      <input name="name" required autoFocus placeholder="Sprint 4" className="input h-8 w-32" aria-label="Sprint name" />
      <input name="goal" placeholder="Goal (optional)" className="input h-8 min-w-40 flex-1" aria-label="Sprint goal" />
      <input name="startsAt" type="date" defaultValue={today} className="input h-8 w-36" aria-label="Starts" />
      <input name="endsAt" type="date" defaultValue={inTwoWeeks} className="input h-8 w-36" aria-label="Ends" />
      <button disabled={pending} className="btn-primary btn-sm">
        {pending ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={onCancel} className="btn-ghost btn-icon-sm" aria-label="Cancel">
        <IconClose size={14} />
      </button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  )
}
