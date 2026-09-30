import Link from "next/link"
import { notFound } from "next/navigation"
import { requireContext } from "@/lib/context"
import { getBoard } from "@/lib/lanes/data"
import { boardAccess } from "@/lib/lanes/board-access"
import { boardStats, listAudit, listCustomFields, listIntegrations, listWebhooks } from "@/lib/lanes/settings-data"
import { PageHeader } from "@/components/ui"
import { GeneralSettingsPanel } from "@/components/lanes/general-settings-panel"
import { MembersPanel } from "@/components/lanes/members-panel"
import { SettingsTabs } from "@/components/lanes/settings-tabs"
import { FieldsPanel, IntegrationsPanel, WebhooksPanel, AuditPanel } from "@/components/lanes/settings-panels"
import { IconArrowLeft } from "@/components/icons"

export const dynamic = "force-dynamic"
export const metadata = { title: "Board settings" }

/**
 * Board settings.
 *
 * Five panels, one route. A board is a small enough object that five separate
 * URLs is five things to bookmark and a sidebar nobody can hold in their head;
 * a tabbed page with the tab in the query string keeps a deep link working
 * without the navigation costing anything.
 *
 * Everything here reads through `requireBoardPermission`, so a guessed board
 * id returns nothing rather than somebody else's webhook secret.
 */
export default async function BoardSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const ctx = await requireContext()

  const [board, access] = await Promise.all([getBoard(ctx.tenant.id, id), boardAccess(id)])
  if (!board) notFound()

  const [members, stats, fields, hooks, integrations, audit] = await Promise.all([
    import("@/lib/lanes/members").then((m) => m.listBoardMembers(id, ctx.tenant.id)),
    boardStats(id),
    access.permissions("board.read") ? listCustomFields(id) : Promise.resolve([]),
    access.permissions("webhook.manage") ? listWebhooks(id) : Promise.resolve([]),
    access.permissions("integration.manage") ? listIntegrations(id) : Promise.resolve([]),
    access.permissions("audit.read") ? listAudit(id) : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href={`/dashboard/b/${board.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-text">
          <IconArrowLeft size={14} /> Back to {board.name}
        </Link>
        <PageHeader
          eyebrow="Board settings"
          title={board.name}
          description="People, custom fields, integrations, webhooks and the audit trail. Each panel is fetched behind a permission check, so a role without access sees nothing rather than an error."
        />
      </div>

      <SettingsTabs
        boardId={board.id}
        current={tab ?? "people"}
        counts={{ people: members.filter((m) => !m.implicit).length, fields: fields.length, integrations: integrations.length, webhooks: hooks.length, audit: audit.length }}
      />

      {tab === "general" && <GeneralSettingsPanel board={board} canManage={access.permissions("board.settings")} />}
      {(tab ?? "people") === "people" && (
        <MembersPanel
          boardId={board.id}
          members={members}
          viewerId={ctx.userId}
          canManage={access.permissions("board.members")}
          viewerRole={access.role}
          viewerElevated={access.elevated}
          stats={stats}
        />
      )}

      {(tab ?? "people") === "fields" && (
        <FieldsPanel fields={fields} canManage={access.permissions("customField.manage")} />
      )}
      {(tab ?? "people") === "integrations" && (
        <IntegrationsPanel integrations={integrations} canManage={access.permissions("integration.manage")} />
      )}
      {(tab ?? "people") === "webhooks" && (
        <WebhooksPanel webhooks={hooks} canManage={access.permissions("webhook.manage")} />
      )}
      {(tab ?? "people") === "audit" && <AuditPanel rows={audit} />}

      {(tab ?? "people") !== "people" && (
        <p className="text-xs text-muted">
          <Link href={`/dashboard/b/${board.id}/settings`} className="text-accent hover:underline">
            People and roles
          </Link>{" "}
          is the one panel every role can see.
        </p>
      )}
    </div>
  )
}
