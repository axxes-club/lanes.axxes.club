"use client"

import { ContextMenu } from "./lanes/context-menu"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { switchOrganization } from "@/lib/actions/org"
import type { Membership } from "@/lib/context"

export function OrgSwitcher({ current, memberships, collapsed = false }: {
  current: Membership
  memberships: Membership[]
  collapsed?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [error, setError] = useState('')
  function choose(tenantId: string) {
    if (tenantId === current.tenantId) return
    setError('')
    startTransition(async () => { try { const result = await switchOrganization(tenantId); if (result.error) { setError(result.error); return } router.push('/dashboard'); router.refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Could not switch workspace.') } })
  }
  const actions = [
    ...(memberships.length > 1 ? [{ label: 'Switch workspace', children: memberships.map((m) => ({ label: m.name, checked: m.tenantId === current.tenantId, disabled: pending, onSelect: () => choose(m.tenantId) })) }] : []),
    { label: 'People', onSelect: () => router.push('/dashboard/people') },
    { label: 'AXXES apps', onSelect: () => router.push('/dashboard/apps') },
  ]
  return <div className="org-switcher relative" data-compact={collapsed} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }) }}>
    <button type="button" aria-label={`${current.name} workspace options`} aria-haspopup="menu" disabled={pending} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom }) }} onKeyDown={(e) => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom }) } }} title={current.name} aria-expanded={!!menu} className="org-trigger flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-left text-xs hover:bg-panel-2 disabled:opacity-60">
      <span aria-hidden className="org-monogram hidden size-8 shrink-0 place-items-center rounded-lg bg-panel-2 font-semibold">{current.name.slice(0, 2).toUpperCase()}</span>
      <span className="org-details min-w-0 flex-1"><span className="block truncate font-medium">{current.name}</span><span className="block truncate text-muted">{pending ? 'Switching…' : current.role.replaceAll('_', ' ')}</span></span><span className="org-details" aria-hidden>↕</span>
    </button>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {menu && <ContextMenu {...menu} items={actions} onClose={() => setMenu(null)} />}
  </div>
}
