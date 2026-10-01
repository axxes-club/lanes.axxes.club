import type { Metadata } from "next"
import { BrandScope } from "@/components/brand"
import { getCustomerBrand } from "@/lib/white-label"
import { requireContext } from "@/lib/context"
import { AppShell } from "@/components/app-shell"

async function AppLayout({ children }: { children: React.ReactNode }) {
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


/** White-label customers see their own brand; everyone else, standard AXXES. */
export default async function BrandedLayout(props: Parameters<typeof AppLayout>[0]) {
  const ctx = await requireContext()
  const brand = await getCustomerBrand(ctx.tenant.id)
  return <BrandScope brand={brand}>{await AppLayout(props)}</BrandScope>
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await requireContext()
  const brand = await getCustomerBrand(ctx.tenant.id)
  return brand?.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}
}
