"use client"

import { useActionState, useState } from "react"
import { cx } from "@/components/ui"
import { IconArrowRight, IconKey } from "@/components/icons"
import { createWorkspaceAction, joinWithCodeAction } from "@/lib/lanes/onboarding-actions"

type Kind = { value: string; label: string; blurb: string }

/**
 * Create a workspace, or join an existing one.
 *
 * Two tabs rather than two pages: somebody who already has an invite code
 * should not have to read about workspace types, and somebody who does not
 * should not be shown a field they cannot use.
 */
export function OnboardingForm({ kinds, userName }: { kinds: Kind[]; userName: string }) {
  const [tab, setTab] = useState<"create" | "join">("create")
  const [create, createAction, creating] = useActionState(createWorkspaceAction, {})
  const [join, joinAction, joining] = useActionState(joinWithCodeAction, {})
  const [name, setName] = useState(userName ? `${userName.split(" ")[0]}'s workspace` : "")
  const [kind, setKind] = useState(kinds[0]?.value ?? "business")

  const pending = tab === "create" ? creating : joining
  const error = tab === "create" ? create.error : join.error

  return (
    <div className="mt-8">
      <div className="flex gap-1 rounded-lg border border-line bg-panel-2 p-1" role="tablist" aria-label="How to continue">
        {([['create', 'Create a workspace'], ['join', 'I have an invite code']] as const).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cx(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === value ? "bg-panel text-text shadow-sm" : "text-muted hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "create" ? (
        <form action={createAction} className="mt-5 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Workspace name</span>
            <input
              className="input"
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Studio"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-muted">What kind of workspace is it?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {kinds.map((k) => (
                <label key={k.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value={k.value}
                    checked={kind === k.value}
                    onChange={() => setKind(k.value)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-lg border border-line bg-panel-2 p-3 transition peer-checked:border-accent peer-checked:bg-accent-soft">
                    <span className="block text-sm font-medium">{k.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{k.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="btn-primary btn-lg w-full" disabled={pending || !name.trim()}>
            {creating ? "Setting things up…" : <>Create workspace <IconArrowRight size={15} /></>}
          </button>
          <p className="text-center text-[11px] text-faint">You will get a sample board so it is never empty.</p>
        </form>
      ) : (
        <form action={joinAction} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Invite code</span>
            <input
              className="input font-mono uppercase tracking-widest"
              name="code"
              required
              maxLength={32}
              placeholder="AXXES-2026"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <button className="btn-primary btn-lg w-full" disabled={joining}>
            <IconKey size={15} /> {joining ? "Checking…" : "Join workspace"}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-faint">
            Codes come from an AXXES administrator. If you were invited by email, the code is in the message.
          </p>
        </form>
      )}
    </div>
  )
}
