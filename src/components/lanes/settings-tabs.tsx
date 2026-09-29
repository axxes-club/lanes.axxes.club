"use client"

import Link from "next/link"
import { cx } from "@/components/ui"
import { IconKey, IconLayers, IconPuzzle, IconShield, IconUsers, IconWebhook } from "@/components/icons"

/**
 * Tabs that are links.
 *
 * Each tab is a real URL (`?tab=webhooks`) rather than a piece of client
 * state, so a panel can be linked to from a notification, a webhook failure
 * email or a colleague's message. A settings page that can only be reached by
 * clicking is a settings page people describe in prose instead.
 */
const TABS = [
  { key: "people", label: "People", Icon: IconUsers },
  { key: "fields", label: "Custom fields", Icon: IconLayers },
  { key: "integrations", label: "Integrations", Icon: IconPuzzle },
  { key: "webhooks", label: "Webhooks", Icon: IconWebhook },
  { key: "audit", label: "Audit", Icon: IconShield },
] as const

export function SettingsTabs({
  boardId,
  current,
  counts,
}: {
  boardId: string
  current: string
  counts: Record<string, number>
}) {
  return (
    <div className="-mb-2 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Board settings">
      {TABS.map(({ key, label, Icon }) => {
        const active = current === key
        const n = counts[key] ?? 0
        return (
          <Link
            key={key}
            href={key === "people" ? `/dashboard/b/${boardId}/settings` : `/dashboard/b/${boardId}/settings?tab=${key}`}
            role="tab"
            aria-selected={active}
            className={cx(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition",
              active
                ? "border-accent text-text"
                : "border-transparent text-muted hover:border-line-strong hover:text-text",
            )}
          >
            <Icon size={14} />
            {label}
            {n > 0 && <span className="rounded-full bg-panel-3 px-1.5 text-[10px] tabular-nums text-muted">{n}</span>}
          </Link>
        )
      })}
    </div>
  )
}
