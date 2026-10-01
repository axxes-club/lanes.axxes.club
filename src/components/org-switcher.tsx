"use client"

import { ContextMenu } from "./lanes/context-menu"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { switchOrganization } from "@/lib/actions/org"
import { cx } from "@/components/ui"
import type { Membership } from "@/lib/context"

// Inline rather than lucide-react: this app does not depend on it, and adding
// an icon library for two glyphs is not a trade worth making.
function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronsUpDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4 6l4-4 4 4M4 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Switching organization.
 *
 * Only rendered when there is a real choice. A person in one organization does
 * not need to be told which organization they are in, and a switcher they
 * cannot use is just furniture.
 *
 * The switch is a full navigation rather than a client-side push: the
 * organization decides what data the page can see, and every server component
 * has to see the new one.
 */
export function OrgSwitcher({
  current,
  memberships,
  collapsed = false,
}: {
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
    // switchOrganization reports a refusal as { error } rather than throwing (v2).
    startTransition(async () => {
      try {
        const result = await switchOrganization(tenantId)
        if (result?.error) { setError(result.error); return }
        router.push('/dashboard')
        router.refresh()
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not switch workspace.') }
    })
  }
  const actions = [
    ...(memberships.length > 1 ? [{ label: 'Switch workspace', children: memberships.map((m) => ({ label: m.name, checked: m.tenantId === current.tenantId, disabled: pending, onSelect: () => choose(m.tenantId) })) }] : []),
    { label: 'People', onSelect: () => router.push('/dashboard/people') },
    { label: 'AXXES apps', onSelect: () => router.push('/dashboard/apps') },
  ]
  return <div className="relative" onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }) }}>
    <button type="button" aria-label={`${current.name} workspace options`} aria-haspopup="menu" disabled={pending} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom }) }} onKeyDown={(e) => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom }) } }} className={cx('flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-left hover:bg-panel-2', collapsed && 'lg:justify-center lg:border-0 lg:p-0')}>
      {collapsed ? <span className="grid size-8 place-items-center rounded-lg bg-panel-3 text-xs font-bold">{current.name.slice(0, 2).toUpperCase()}</span> : <><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{current.name}</span><span className="block text-[10px] text-muted">{pending ? 'Switching…' : 'Your workspace'}</span></span><ChevronsUpDown className="h-3.5 w-3.5" /></>}
    </button>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {menu && <ContextMenu {...menu} items={actions} onClose={() => setMenu(null)} />}
  </div>
}
