import { Logo } from "@/components/logo"
import { redirect } from "next/navigation"

/**
 * Reachable only when somebody is signed in but in no workspace — which
 * means an account that has not been onboarded. Sending them to the members
 * portal to finish something they never started is the wrong door.
 */
export default function NoTenantPage() {
  redirect("/onboarding")
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm text-center">
        <Logo size="lg" />
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">One last thing</h1>
        <p className="mt-2 text-sm text-muted">Taking you to set up a workspace…</p>
      </div>
    </main>
  )
}
