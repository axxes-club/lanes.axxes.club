import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Logo } from "@/components/logo"
import { membershipsFor, WORKSPACE_KINDS_EXPORTED } from "@/lib/lanes/onboarding"
import { OnboardingForm } from "./onboarding-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Set up your workspace" }

/**
 * Onboarding.
 *
 * The first decision the page makes is not the user's — it is the server's.
 * If the person is already a member of a workspace (a colleague invited them
 * before they finished signing up, or the members portal added them),
 * onboarding steps aside and sends them to their boards. Asking somebody who
 * already has a workspace to create a second one is how you end up with
 * eleven orphaned orgs named "Acme 2".
 */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-up")

  const existing = await membershipsFor(session.user.id)
  if (existing.length > 0) redirect("/dashboard")

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo size="lg" />
          <h1 className="mt-10 text-3xl font-semibold tracking-tight text-balance">One last thing</h1>
          <p className="mt-2 text-sm text-muted">
            A workspace holds your boards, your people and your permissions. Every AXXES app shares it.
          </p>
          <OnboardingForm kinds={WORKSPACE_KINDS_EXPORTED} userName={session.user.name} />
        </div>
      </div>

      <div className="hidden border-l border-line bg-panel/40 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-sm">
          <p className="eyebrow">What happens next</p>
          <ol className="mt-6 space-y-5 text-sm">
            {[
              "You get a workspace and a sample board, so it is never empty.",
              "You are its owner. Rename it, invite people, change anything.",
              "The same account already works across every other AXXES app.",
            ].map((line, i) => (
              <li key={line} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-[11px] font-bold text-accent">
                  {i + 1}
                </span>
                <span className="text-muted">{line}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-xs leading-relaxed text-faint">
            Nothing here is a trial that expires. Delete the workspace from settings whenever you like and it takes the
            boards with it.
          </p>
        </div>
      </div>
    </main>
  )
}
