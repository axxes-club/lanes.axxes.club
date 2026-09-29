"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { cx } from "@/components/ui"
import { IconArrowRight, IconCheck } from "@/components/icons"

/**
 * Sign-up, with the password rules shown before submission.
 *
 * Two decisions that matter more than they look:
 *
 * 1. The rules are visible from the first keystroke, not revealed as an
 *    error after submitting. A password field that fails silently teaches
 *    people to use `password123`.
 *
 * 2. The submit button is disabled until the form is valid, and says why.
 *    A disabled button with no explanation is the most common cause of a
 *    support ticket in any sign-up form.
 */
const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "A number", test: (v: string) => /\d/.test(v) },
  { label: "Not just your email", test: (v: string, e: string) => v.toLowerCase() !== e.toLowerCase() },
]

export function SignUpForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const checks = RULES.map((r) => ({ label: r.label, ok: r.test(password, email) }))
  const valid = email.includes("@") && checks.every((c) => c.ok)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) return
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(undefined)
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password,
    })
    if (error) {
      setPending(false)
      return setError(error.message ?? "Could not create the account")
    }
    // Straight to onboarding: a new account has no workspace yet, and
    // sending it to a board list it cannot see is a dead end.
    router.replace("/onboarding")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Your name</span>
        <input className="input" name="name" placeholder="Ada Lovelace" autoComplete="name" required />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Work email</span>
        <input
          className="input"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
        <input
          className="input"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {/* Shown as soon as the field has content: the rules are not a
          punishment to be discovered after submitting. */}
      {password.length > 0 && (
        <ul className="space-y-1" aria-live="polite">
          {checks.map((c) => (
            <li key={c.label} className={cx("flex items-center gap-2 text-xs", c.ok ? "text-success" : "text-muted")}>
              <IconCheck size={12} className={c.ok ? "" : "opacity-25"} />
              {c.label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!valid || pending}
        title={!valid && email.includes("@") ? "The password needs to meet all three rules" : undefined}
        className="btn-primary btn-lg w-full"
      >
        {pending ? "Creating your account…" : <>Create workspace <IconArrowRight size={15} /></>}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-faint">
        By continuing you agree to the AXXES terms. We will never sell your data, and we do not run ads.
      </p>
    </form>
  )
}
