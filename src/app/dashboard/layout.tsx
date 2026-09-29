import { requireContext } from "@/lib/context"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext()

  return (
    <AppShell
      membership={{
        tenantId: ctx.tenant.id,
        name: ctx.tenant.name,
        slug: ctx.tenant.slug,
        role: ctx.role,
        isPrimary: ctx.memberships.some((m) => m.isPrimary && m.tenantId === ctx.tenant.id),
      }}
      memberships={ctx.memberships}
      user={ctx.user}
    >
      <div id="main">{children}</div>
    </AppShell>
  )
}

