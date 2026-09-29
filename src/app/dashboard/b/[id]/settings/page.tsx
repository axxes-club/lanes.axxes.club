import { notFound } from "next/navigation"
import Link from "next/link"
import { requireContext } from "@/lib/context"
import { getBoard } from "@/lib/lanes/data"
import { boardAccess } from "@/lib/lanes/board-access"
import { listBoardMembers } from "@/lib/lanes/members"
import { PageHeader } from "@/components/ui"
import { MembersPanel } from "@/components/lanes/members-panel"
import { IconArrowLeft, IconUsers } from "@/components/icons"

export const dynamic = "force-dynamic"
export const metadata = { title: "Board members" }

/**
 * Board members.
 *
 * This is where `board_member_roles` finally gets rows, which means the role
 * matrix in `permissions.ts` runs against real data for the first time. Two
 * of its rules are deliberately surprising and both are shown here as plain
 * English rather than left to be discovered:
 *
 *   - a stakeholder can comment but cannot change a card
 *   - only a product owner or scrum master can commit a card to a sprint
 */
export default async function BoardSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireContext()
  const [board, access] = await Promise.all([getBoard(ctx.tenant.id, id), boardAccess(id)])
  if (!board) notFound()

  const members = await listBoardMembers(id, ctx.tenant.id)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href={`/dashboard/b/${board.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text"
        >
          <IconArrowLeft size={14} /> Back to {board.name}
        </Link>
        <PageHeader
          eyebrow="Board settings"
          title="People and roles"
          description="Roles are per board. The same person can be the product owner on one board and a read-only stakeholder on another."
        />
      </div>

      <MembersPanel
        boardId={board.id}
        members={members}
        viewerId={ctx.userId}
        canManage={access.permissions("board.members")}
        viewerRole={access.role}
        viewerElevated={access.elevated}
      />
    </div>
  )
}
