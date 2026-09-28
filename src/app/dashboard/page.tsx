import Link from "next/link"
import { requireContext } from "@/lib/context"
import { listBoards } from "@/lib/lanes/data"
import { createBoard } from "@/lib/lanes/actions"
import { PageHeader } from "@/components/ui"

const COLORS = ["#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#facc15", "#34d399"]

export default async function BoardsPage() {
  const ctx = await requireContext()
  const boards = await listBoards(ctx.tenant.id)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Boards" description={`Every board in ${ctx.tenant.name}. Also available as Projects in the AXXES Suite.`} />

      <form action={createBoard} className="card mb-8 grid gap-3 p-5 sm:grid-cols-[2fr_1.2fr_auto_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">New board</span>
          <input name="name" required maxLength={100} placeholder="Website relaunch" className="input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">Start from</span>
          <select name="template" className="input" defaultValue="kanban">
            <option value="kanban">Kanban — To do · In progress · Done</option>
            <option value="sprint">Sprint — Backlog → Review → Done</option>
            <option value="pipeline">Pipeline — Leads → Won</option>
          </select>
        </label>
        <fieldset className="flex gap-1.5 pb-1.5" aria-label="Color">
          {COLORS.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
              <span className="block size-6 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-panel peer-checked:ring-text" style={{ background: c }} />
            </label>
          ))}
        </fieldset>
        <button className="btn-primary">Create board</button>
      </form>

      {boards.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="font-medium">No boards yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Create one above. Pick a template and you&apos;ll have lanes ready to go.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => {
            const total = b.open + b.done
            return (
              <Link key={b.id} href={`/dashboard/b/${b.id}`} className="card overflow-hidden transition hover:border-accent/50">
                <div className="h-2" style={{ background: b.color ?? "var(--accent)" }} />
                <div className="p-5">
                  <p className="font-medium">{b.name}</p>
                  <p className="mt-1 text-sm text-muted">{b.open} open · {b.done} done</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded bg-line">
                    <div className="h-full bg-accent" style={{ width: `${total ? (b.done / total) * 100 : 0}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
