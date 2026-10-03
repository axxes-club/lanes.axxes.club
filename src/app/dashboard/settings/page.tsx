import Link from "next/link"
import { requireContext } from "@/lib/context"
import { PageHeader } from "@/components/ui"

export const dynamic = "force-dynamic"
export const metadata = { title: "Account settings" }

export default async function SettingsPage() {
  const ctx = await requireContext()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="Account settings"
        description="Your AXXES account and current workspace."
      />
      <section className="card p-6" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-lg font-semibold">Account</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div><dt className="text-muted">Name</dt><dd className="mt-1">{ctx.user.name || ctx.user.email}</dd></div>
          <div><dt className="text-muted">Email</dt><dd className="mt-1 break-all">{ctx.user.email}</dd></div>
        </dl>
      </section>
      <section className="card p-6" aria-labelledby="workspace-heading">
        <h2 id="workspace-heading" className="text-lg font-semibold">Workspace</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div><dt className="text-muted">Name</dt><dd className="mt-1">{ctx.tenant.name}</dd></div>
          <div><dt className="text-muted">Your role</dt><dd className="mt-1 capitalize">{ctx.role.replaceAll("_", " ")}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-muted">Workspace roles are managed in the members portal. Board settings are available from each board.</p>
        <Link href="/dashboard/people" className="mt-4 inline-block text-sm text-accent hover:underline">View workspace people</Link>
      </section>
    </div>
  )
}
