import { Empty } from "@/components/ui"
import { IconInfo, IconPuzzle, IconWebhook } from "@/components/icons"
import type { CustomField, Integration, Webhook, AuditRow } from "@/lib/lanes/settings-data"

/**
 * The four panels that close the "finished table, no screen" gap.
 *
 * Each one is honest about being read-only where the write path does not
 * exist yet, rather than rendering a form that silently does nothing. A
 * settings screen full of controls that 404 on submit is worse than a panel
 * that says what is not built.
 */

const PROVIDERS: Record<string, { label: string; blurb: string }> = {
  github: { label: "GitHub", blurb: "Pull requests, reviews and check runs on a card." },
  gitlab: { label: "GitLab", blurb: "Merge requests and pipelines." },
  figma: { label: "Figma", blurb: "Design files attached to a card." },
}

export function IntegrationsPanel({ integrations, canManage }: { integrations: Integration[]; canManage: boolean }) {
  return (
    <section className="space-y-4">
      {integrations.length === 0 ? (
        <>
          <Empty
            icon={<IconPuzzle size={20} />}
            title="Nothing connected yet"
            body="GitHub, GitLab and Figma attach their work to a card, so a pull request and a task are one thing rather than two linked things somebody has to keep in sync."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <div key={key} className="card p-5 opacity-60">
                <p className="font-semibold tracking-tight">{p.label}</p>
                <p className="mt-1.5 text-sm text-muted text-pretty">{p.blurb}</p>
                <span className="mt-3 inline-block rounded bg-panel-3 px-2 py-0.5 text-[10px] text-faint">Not connected</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card divide-y divide-line-soft overflow-hidden">
          {integrations.map((i) => (
            <div key={i.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="truncate text-xs text-muted">
                  {i.provider} · {i.lastSyncedAt ? `synced ${i.lastSyncedAt.toLocaleDateString()}` : "never synced"}
                  {i.lastError ? ` · ${i.lastError}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${i.enabled ? "bg-success-soft text-success" : "bg-panel-3 text-muted"}`}>
                {i.enabled ? "On" : "Off"}
              </span>
            </div>
          ))}
        </div>
      )}

      <ReadOnlyNotice
        can={canManage}
        what="Connecting a provider"
        why="Credentials are stored encrypted and never returned by a read, so the wiring is deliberately not half-built. A connector that cannot be tested is worse than no connector."
      />
    </section>
  )
}

export function WebhooksPanel({ webhooks, canManage }: { webhooks: Webhook[]; canManage: boolean }) {
  return (
    <section className="space-y-4">
      {webhooks.length === 0 ? (
        <Empty
          icon={<IconWebhook size={20} />}
          title="No webhooks on this board"
          body="A webhook is a signed HTTP POST when something happens. The delivery contract is documented at /docs/webhooks, including how to verify the signature."
        />
      ) : (
        <div className="card divide-y divide-line-soft overflow-hidden">
          {webhooks.map((w) => (
            <div key={w.id} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-2">{w.url}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${w.enabled ? "bg-success-soft text-success" : "bg-panel-3 text-muted"}`}>
                  {w.enabled ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {w.events.length === 0 ? (
                  <span className="text-faint">No events selected</span>
                ) : (
                  w.events.map((e) => (
                    <span key={e} className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10px]">{e}</span>
                  ))
                )}
              </p>
              {w.lastError && <p className="mt-1.5 text-xs text-danger">Last error: {w.lastError}</p>}
              {w.lastDeliveredAt && (
                <p className="mt-1 text-[11px] text-faint">Last delivered {w.lastDeliveredAt.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        The secret is shown once at creation and stored only as a hash, so it is not in this list and cannot be recovered
        from it. Rotate by creating a new webhook.
      </p>

      <ReadOnlyNotice
        can={canManage}
        what="Registering a webhook"
        why="/docs/webhooks says so plainly rather than documenting a call that does not exist yet."
      />
    </section>
  )
}

export function AuditPanel({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <Empty
        icon={<IconInfo size={20} />}
        title="Nothing recorded yet"
        body="Every card change writes an entry. There are none for this board yet, which usually means the board is new or has not moved."
      />
    )
  }

  return (
    <div className="card divide-y divide-line-soft overflow-hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex items-baseline gap-4 px-5 py-2.5 text-sm">
          <span className="w-40 shrink-0 font-mono text-[11px] text-faint">
            {r.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
          <span className="w-32 shrink-0 truncate text-muted">{r.user ?? "system"}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-mono text-[11px] text-accent">{r.action}</span>
            {r.cardTitle && <span className="ml-2 text-muted">{r.cardTitle}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

function ReadOnlyNotice({ can, what, why }: { can: boolean; what: string; why: string }) {
  if (can) {
    return (
      <p className="rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning-soft">
        <span className="font-medium text-warning">Editing {what.toLowerCase()} is not built yet.</span>{" "}
        <span className="text-text-2">{why}</span>
      </p>
    )
  }
  return null
}
