import Link from "next/link"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { requireContext } from "@/lib/context"
import { db, schema as s } from "@/lib/db"
import { cardSeq, keyPrefix } from "@/lib/lanes/data"
import { PageHeader } from "@/components/ui"

export default async function MyCardsPage() {
  const ctx = await requireContext()
  const rows = await db
    .select({ card: s.projectCards, project: s.projects, list: s.projectLists })
    .from(s.projectCardMembers)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.projectCardMembers.cardId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(
      and(
        eq(s.projectCardMembers.userId, ctx.userId),
        eq(s.projects.tenantId, ctx.tenant.id),
        isNull(s.projectCards.deletedAt),
        isNull(s.projectCards.archivedAt),
        isNull(s.projects.deletedAt),
        sql`not coalesce(${s.projectLists.isDoneList}, false)`
      )
    )
    .orderBy(sql`${s.projectCards.dueDate} asc nulls last`, asc(s.projectCards.createdAt))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My cards" description="Open cards assigned to you across every board, soonest due first." />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Nothing assigned to you. Enjoy it.</p>
      ) : (
        <div className="card divide-y divide-line/60">
          {rows.map(({ card, project, list }) => {
            const overdue = card.dueDate && card.dueDate.getTime() < Date.now()
            return (
              <Link key={card.id} href={`/dashboard/b/${project.id}`} className="flex items-center gap-4 p-4 text-sm hover:bg-panel-2">
                <span className="w-20 shrink-0 font-mono text-xs text-muted">{keyPrefix(project.settings, project.name)}-{cardSeq(card.customFields)}</span>
                <span className="min-w-0 flex-1 truncate">{card.title}</span>
                <span className="hidden text-xs text-muted sm:inline">{project.name} · {list.name}</span>
                <span className={`w-20 text-right text-xs ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
                  {card.dueDate ? card.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
