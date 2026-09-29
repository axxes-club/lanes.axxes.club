"use client"

import { Fragment, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx } from "@/components/ui"
import { Avatar } from "@/components/avatar"
import { IconCheck, IconInfo, IconTrash, IconUsers } from "@/components/icons"
import { changeRoleAction, removeMemberAction } from "@/lib/lanes/member-actions"
import { BOARD_ROLES, BOARD_ROLE_LABEL, type BoardRole } from "@/lib/lanes/roles"
import { can as canRole, ROLE_SUMMARY, type Permission } from "@/lib/lanes/permissions"
import type { BoardMember } from "@/lib/lanes/members"

/**
 * The members panel.
 *
 * Design decisions that are load-bearing, not decoration:
 *
 * 1. Every role carries its one-line meaning. `ROLE_SUMMARY` is shown on the
 *    option, not in a help page nobody opens, because "product_owner" tells a
 *    stakeholder nothing and "Writes and grooms the backlog, sets priority,
 *    commits the sprint" tells them whether to pick it.
 *
 * 2. Self-editing is disabled in the UI *and* refused on the server. The UI
 *    is for clarity; the server is the rule. A client that skips the check
 *    gets the same answer the browser would have shown.
 *
 * 3. The permission matrix is rendered as a grid under the list. A role that
 *    grants "comment but not change" is a genuinely odd grant, and the only
 *    way anyone finds that out is by being shown it.
 */
export function MembersPanel({
  boardId,
  members,
  viewerId,
  canManage,
  viewerRole,
  viewerElevated,
  stats,
}: {
  boardId: string
  members: BoardMember[]
  viewerId: string
  canManage: boolean
  viewerRole: string
  viewerElevated: boolean
  /** Shown above the list. Optional: the panel is also used without it. */
  stats?: { cards: number; lists: number; members: number; sprints: number; comments: number; activityThisWeek: number }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null)

  // Explicit rows first — somebody who was deliberately given a role is the
  // reason this screen exists — then the implicit viewers.
  const explicit = members.filter((m) => !m.implicit)
  const implicit = members.filter((m) => m.implicit)

  const act = (fn: () => Promise<{ error?: string; hint?: string }>) =>
    start(async () => {
      setError(null)
      const result = await fn()
      if (result.error) setError({ message: result.error, hint: result.hint })
      router.refresh()
    })

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {([
            ["Cards", stats.cards],
            ["Lanes", stats.lists],
            ["With a role", stats.members],
            ["Sprints", stats.sprints],
            ["Comments", stats.comments],
            ["Actions · 7d", stats.activityThisWeek],
          ] as const).map(([label, value]) => (
            <div key={label} className="card px-4 py-3">
              <p className="eyebrow">{label}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          <p className="font-medium text-danger">{error.message}</p>
          {error.hint && <p className="mt-0.5 text-danger/80">{error.hint}</p>}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="eyebrow">With a role on this board · {explicit.length}</h2>
            {viewerElevated && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <IconInfo size={12} />
                You can manage members because you are a workspace manager, not because of a board role.
              </p>
            )}
          </div>
        </div>

        {explicit.length === 0 ? (
          <div className="card grid place-items-center px-6 py-12 text-center">
            <div className="mb-3 grid size-10 place-items-center rounded-xl border border-dashed border-line text-faint">
              <IconUsers size={18} />
            </div>
            <p className="text-sm font-medium">Nobody has a role on this board yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Everyone in the workspace is currently a viewer here. Give somebody a role to change what they can do.
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-line-soft overflow-hidden">
            {explicit.map((m) => (
              <MemberRow
                key={m.userId}
                member={m}
                boardId={boardId}
                isSelf={m.userId === viewerId}
                canManage={canManage}
                pending={pending}
                onChange={(role) => act(() => changeRoleAction(boardId, m.userId, role))}
                onRemove={() => act(() => removeMemberAction(boardId, m.userId))}
              />
            ))}
          </ul>
        )}
      </section>

      {implicit.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Everyone else in the workspace · {implicit.length}</h2>
          <ul className="card divide-y divide-line-soft overflow-hidden">
            {implicit.map((m) => (
              <MemberRow
                key={m.userId}
                member={m}
                boardId={boardId}
                isSelf={m.userId === viewerId}
                canManage={canManage}
                pending={pending}
                onChange={(role) => act(() => changeRoleAction(boardId, m.userId, role))}
                onRemove={() => act(() => removeMemberAction(boardId, m.userId))}
              />
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            These people can be assigned cards and are treated as viewers on this board until given a role.
          </p>
        </section>
      )}

      <RoleMatrix />
    </div>
  )
}

function MemberRow({
  member,
  isSelf,
  canManage,
  pending,
  onChange,
  onRemove,
}: {
  member: BoardMember
  boardId: string
  isSelf: boolean
  canManage: boolean
  pending: boolean
  onChange: (role: string) => void
  onRemove: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar name={member.name} src={member.image} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {isSelf && <span className="ml-2 text-xs text-faint">you</span>}
        </p>
        <p className="truncate text-xs text-muted">{member.email}</p>
      </div>

      {canManage && !isSelf ? (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            disabled={pending}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Role for ${member.name}`}
            className="input h-9 w-44"
          >
            {BOARD_ROLES.map((r) => (
              <option key={r} value={r}>
                {BOARD_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => (confirming ? onRemove() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            className={cx("btn-icon btn-ghost", confirming && "bg-danger-soft text-danger")}
            aria-label={confirming ? `Confirm removing ${member.name}` : `Remove ${member.name}`}
            title={confirming ? "Click again to confirm" : "Remove from this board"}
          >
            <IconTrash size={15} />
          </button>
        </div>
      ) : (
        <span className="rounded-md bg-panel-3 px-2.5 py-1.5 text-xs text-muted">
          {isSelf ? "Your role" : BOARD_ROLE_LABEL[member.role]}
        </span>
      )}
    </li>
  )
}

/** The subset of the matrix worth showing. The full list is in the docs. */
const SHOWN: { group: string; permissions: Permission[] }[] = [
  { group: "Board", permissions: ["board.update", "board.settings", "board.members", "board.delete"] },
  { group: "Cards", permissions: ["card.create", "card.update", "card.move", "card.assign", "card.priority", "card.comment", "card.verify"] },
  { group: "Sprints", permissions: ["sprint.manage", "sprint.commit", "sprint.complete"] },
  { group: "Planning", permissions: ["backlog.groom", "poker.facilitate"] },
]

function RoleMatrix() {
  return (
    <section>
      <h2 className="eyebrow mb-3">What each role can do</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-40 px-4 py-3 text-left font-medium text-muted">Role</th>
              {BOARD_ROLES.map((r) => (
                <th key={r} scope="col" className="px-2 py-3 text-center text-[11px] font-medium text-muted">
                  {BOARD_ROLE_LABEL[r as BoardRole]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {SHOWN.map((g) => (
              <Fragment key={g.group}>
                <tr className="bg-panel-2">
                  <td colSpan={BOARD_ROLES.length + 1} className="px-4 py-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
                    {g.group}
                  </td>
                </tr>
                {g.permissions.map((p) => (
                  <tr key={p}>
                    <td className="px-4 py-2 font-mono text-xs text-text-2">{p.replace(".", " ")}</td>
                    {BOARD_ROLES.map((r) => (
                      <td key={r} className="px-2 py-2 text-center">
                        {canRole(r as BoardRole, p) ? (
                          <IconCheck size={14} className="mx-auto text-success" aria-label="Allowed" />
                        ) : (
                          <span className="text-faint" aria-label="Not allowed">
                            &middot;
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-muted">
        {BOARD_ROLES.map((r) => (
          <li key={r}>
            <span className="font-medium text-text-2">{BOARD_ROLE_LABEL[r]}:</span> {ROLE_SUMMARY[r]}
          </li>
        ))}
      </ul>
    </section>
  )
}
