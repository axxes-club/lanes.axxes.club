import Link from "next/link"
import { asc, and, eq, isNull, sql } from "drizzle-orm"
import { db, schema as s } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { PageHeader, Empty } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import { workloadFor } from "@/lib/lanes/search"
import { IconUsers, IconWarning } from "@/components/icons"

export const dynamic = "force-dynamic"
export const metadata = { title: "People" }

/**
 * Who is in the workspace, and what they are carrying.
 *
 * The workload column is the reason this page exists rather than a settings
 * screen. A lead needs to answer "who is overloaded and who has room" before
 * they assign the next piece of work, and making them open a board per person
 * to count is how that question goes unanswered.
 */
export default async function PeoplePage() {
  const ctx = await requireContext()

  const people = await db
    .select({
      id: s.user.id,
      name: s.user.name,
      email: s.user.email,
      image: s.user.image,
      role: s.tenantMemberships.role,
      joinedAt: s.tenantMemberships.joinedAt,
    })
    .from(s.tenantMemberships)
    .innerJoin(s.user, eq(s.user.id, s.tenantMemberships.userId))
    .where(and(eq(s.tenantMemberships.tenantId, ctx.tenant.id), isNull(s.tenantMemberships.deletedAt)))
    .orderBy(asc(s.user.name))

  const load = await workloadFor(ctx.tenant.id, ctx.userId)
  const loadByBoard = new Map(load.map((l) => [l.boardId, l]))

  // Open and overdue per person, across the workspace.
  const counts = await db
    .select({
      userId: s.projectCardMembers.userId,
      open: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false))`.mapWith(Number),
      overdue: sql<number>`count(*) filter (where not coalesce(${s.projectLists.isDoneList}, false) and ${s.projectCards.dueDate} < now())`.mapWith(Number),
    })
    .from(s.projectCardMembers)
    .innerJoin(s.projectCards, eq(s.projectCards.id, s.projectCardMembers.cardId))
    .innerJoin(s.projects, eq(s.projects.id, s.projectCards.projectId))
    .innerJoin(s.projectLists, eq(s.projectLists.id, s.projectCards.listId))
    .where(and(eq(s.projects.tenantId, ctx.tenant.id), isNull(s.projectCards.deletedAt), isNull(s.projectCards.archivedAt)))
    .groupBy(s.projectCardMembers.userId)

  const countByUser = new Map(counts.map((c) => [c.userId, c]))
  const maxOpen = Math.max(1, ...counts.map((c) => c.open))

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="People"
        description="Everyone in this workspace, and what they are carrying right now."
      />

      {people.length === 0 ? (
        <Empty icon={<IconUsers size={20} />} title="Nobody here yet" body="Invite people from workspace settings in the members portal." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-5 py-3 font-medium text-muted">Person</th>
                <th scope="col" className="hidden px-5 py-3 font-medium text-muted sm:table-cell">Workspace role</th>
                <th scope="col" className="px-5 py-3 font-medium text-muted">Open cards</th>
                <th scope="col" className="px-5 py-3 text-right font-medium text-muted">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {people.map((p) => {
                const c = countByUser.get(p.id)
                const open = c?.open ?? 0
                const overdue = c?.overdue ?? 0
                const share = Math.round((open / maxOpen) * 100)
                const mine = loadByBoard.size > 0 && load.some((l) => l.boardId)

                return (
                  <tr key={p.id} className="transition hover:bg-panel-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={p.image} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {p.name}
                            {p.id === ctx.userId && <span className="ml-2 text-xs text-faint">you</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <span className="capitalize text-muted">{p.role.replace("_", " ")}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-3">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${share}%`, background: open > maxOpen * 0.75 ? "var(--warning)" : "var(--accent)" }}
                          />
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted">{open}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-danger">
                          <IconWarning size={11} />
                          {overdue}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-faint">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        Roles here are <span className="text-text-2">workspace</span> roles, set in the members portal. Each board also
        carries its own roles &mdash; the same person can be the product owner on one board and read-only on another.{" "}
        <Link href="/docs/permissions" className="text-accent hover:underline">
          How that works
        </Link>
        .
      </p>
    </div>
  )
}
