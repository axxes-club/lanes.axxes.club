"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { cx, Meter } from "@/components/ui"
import { IconCard, IconCheck, IconClock, IconStar } from "@/components/icons"
import { setStar } from "@/lib/lanes/commands"

/**
 * A board, in a list.
 *
 * Star is the only control on the card itself, and it is optimistic: the
 * fill changes on click and the server catches up. A star that waits for a
 * round trip feels like a button that sometimes works, which is worse than
 * not offering it.
 *
 * Optimism is reverted if the action fails rather than left lying — see the
 * useOptimistic call below.
 */
export function BoardCard({
  board,
  starred = false,
}: {
  board: { id: string; name: string; description: string | null; color: string | null; updatedAt: Date; open: number; done: number }
  starred?: boolean
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [isStarred, setIsStarred] = useOptimistic(starred)

  const total = board.open + board.done
  const pct = total > 0 ? Math.round((board.done / total) * 100) : 0

  return (
    <div className="group card card-hover relative overflow-hidden">
      <Link href={`/dashboard/b/${board.id}`} className="block p-5 pb-4">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: board.color ?? "var(--accent)" }} aria-hidden />
        <div className="mt-1 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{board.name}</p>
            {board.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{board.description}</p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
                <IconClock size={12} />
                Updated {relative(board.updatedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-3 text-muted">
              <span className="flex items-center gap-1">
                <IconCard size={12} /> {board.open} open
              </span>
              <span className="flex items-center gap-1">
                <IconCheck size={12} /> {board.done} done
              </span>
            </span>
            <span className="font-mono tabular-nums text-muted">{pct}%</span>
          </div>
          <Meter value={board.done} max={total || 1} tone={pct === 100 ? "good" : "accent"} />
        </div>
      </Link>

      <button
        type="button"
        aria-pressed={isStarred}
        aria-label={isStarred ? `Unstar ${board.name}` : `Star ${board.name}`}
        title={isStarred ? "Unstar" : "Star this board"}
        onClick={(e) => {
          e.preventDefault()
          const next = !isStarred
          setIsStarred(next)
          start(async () => {
            await setStar(board.id, next)
            router.refresh()
          })
        }}
        className={cx(
          "absolute right-2.5 top-3 grid size-7 place-items-center rounded-lg transition",
          isStarred
            ? "text-warning hover:bg-panel-3"
            : "text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-panel-3 hover:text-muted",
        )}
      >
        <IconStar size={14} className={isStarred ? "fill-current" : ""} />
      </button>
    </div>
  )
}

function relative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.round(diff / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
