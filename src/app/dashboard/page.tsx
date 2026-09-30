import Link from "next/link"
import { requireContext } from "@/lib/context"
import { boardAccess, ALL_PERMISSIONS } from "@/lib/lanes/board-access"
import { listBoards } from "@/lib/lanes/data"
import { starredBoards } from "@/lib/lanes/search"
import { workspaceInsights } from "@/lib/lanes/insights"
import { PageHeader, Empty, Meter } from "@/components/ui"
import { NewBoardTrigger } from "@/components/new-board"
import { TemplateGallery } from "@/components/template-gallery"
import { BoardCard } from "@/components/board-card"
import { IconBoard, IconChart, IconInbox, IconStar } from "@/components/icons"

export const dynamic = "force-dynamic"

export default async function BoardsPage() {
  const ctx = await requireContext()
  const [boards, starred, insights] = await Promise.all([
    listBoards(ctx.tenant.id),
    starredBoards(ctx.tenant.id, ctx.userId),
    workspaceInsights(ctx.tenant.id, 8),
  ])

  const capabilities = new Map(await Promise.all(boards.map(async (b) => { const access = await boardAccess(b.id); return [b.id, Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, access.permissions(p)]))] as const })))
  const starredIds = new Set(starred.map((b) => b.id))
  const pinned = boards.filter((b) => starredIds.has(b.id))
  const rest = boards.filter((b) => !starredIds.has(b.id))

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="Boards"
        description="Everything this workspace is delivering. Boards also appear as Projects across the AXXES suite."
        action={<NewBoardTrigger />}
      />

      {/* The three numbers someone actually opens this page for. */}
      {boards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="Open cards"
            value={insights.cardsOpen}
            hint={insights.overdue > 0 ? `${insights.overdue} overdue` : "Nothing overdue"}
            tone={insights.overdue > 0 ? "bad" : "good"}
            href="/dashboard/my-cards"
            Icon={IconInbox}
          />
          <SummaryTile
            label="Shipped · 30 days"
            value={insights.cardsDone30}
            hint="Across every board"
            tone="good"
            href="/dashboard/insights"
            Icon={IconChart}
          />
          <SummaryTile
            label="Boards"
            value={insights.boards}
            hint={`${insights.people} ${insights.people === 1 ? "person" : "people"} in the workspace`}
            tone="good"
            href="/dashboard/people"
            Icon={IconBoard}
          />
        </div>
      )}

      {boards.length === 0 ? (
        <Empty
          icon={<IconBoard size={20} />}
          title="No boards yet"
          body="Pick a template and you will have lanes, labels and a board your team can use today."
          action={<NewBoardTrigger buttonOnly label="Pick a template" />}
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3 flex items-center gap-1.5">
                <IconStar size={12} /> Starred
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pinned.map((b) => (
                  <BoardCard key={b.id} board={b} permissions={capabilities.get(b.id)} starred />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="eyebrow mb-3">{pinned.length > 0 ? "All boards" : "Your boards"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((b) => (
                <BoardCard key={b.id} board={b} permissions={capabilities.get(b.id)} />
              ))}
            </div>
          </section>

          <TemplateGallery />
        </>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  hint,
  href,
  tone,
  Icon,
}: {
  label: string
  value: number
  hint: string
  href: string
  tone: "good" | "bad"
  Icon: typeof IconChart
}) {
  return (
    <Link href={href} className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <Icon size={16} className={tone === "bad" ? "text-danger" : "text-faint"} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={`mt-1.5 text-xs ${tone === "bad" ? "text-danger" : "text-muted"}`}>{hint}</p>
    </Link>
  )
}

