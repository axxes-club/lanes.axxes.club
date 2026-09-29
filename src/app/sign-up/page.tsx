import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth, HANDSHAKE_URL } from "@/lib/auth"
import { Logo } from "@/components/logo"
import { product } from "@/product.config"
import { SignUpForm } from "./sign-up-form"
import { IconCheck } from "@/components/icons"

export const metadata = {
  title: "Create a workspace",
  description: `Start free. ${product.tagline}`,
}

/**
 * Sign-up.
 *
 * The form is inline rather than redirecting to the members portal, because
 * the whole point of asking someone to sign up is to not make them go
 * somewhere else first. A person who clicked "Start free" and lands on a
 * different domain has already been given a reason to close the tab.
 *
 * When Handshake is configured it still wins for the SSO round trip — that
 * is the one path that establishes a session across every *.axxes.club app at
 * once, and replacing it would mean two accounts.
 */
export default async function SignUpPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard")
  if (HANDSHAKE_URL) {
    const h = await headers()
    const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`
    redirect(`${HANDSHAKE_URL}/sign-up?redirect=${encodeURIComponent(`${origin}/onboarding`)}`)
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo size="lg" />
          <h1 className="mt-10 text-3xl font-semibold tracking-tight text-balance">Create your workspace</h1>
          <p className="mt-2 text-sm text-muted">
            One account covers every AXXES app. Free for small teams, no credit card.
          </p>
          <SignUpForm />
          <p className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <a href="/sign-in" className="text-accent hover:underline">Sign in</a>
          </p>
        </div>
      </div>

      {/* The pitch, only where there is room for it. */}
      <div className="hidden border-l border-line bg-panel/40 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-sm">
          <p className="eyebrow">What you get</p>
          <ul className="mt-6 space-y-4 text-sm">
            {[
              "Nine board templates, editable from the first card",
              "Boards, sprints, poker and delivery analytics included",
              "A command palette that reaches everything on ⌘K",
              "A documented REST API with per-token rate limits",
              "One sign-in across the whole AXXES suite",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <IconCheck size={15} className="mt-0.5 shrink-0 text-success" />
                <span className="text-muted">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
