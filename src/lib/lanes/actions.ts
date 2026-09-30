"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { listSettingsSchema } from "./settings-validation"
import { requireBoard as boardFor, requireCard as cardFor } from "./access"
import { requireBoardPermission } from "./board-access"
import { recordActivity as log } from "./activity"
import { randomBytes } from "crypto"
import { db, schema as s } from "@/lib/db"
import { requireContext } from "@/lib/context"
import { cardSeq, getCardDetail, keyPrefix } from "./data"
import { template } from "./templates"
import type { CardDetailT, Priority } from "./types"

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"]
const LABEL_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"]

const touch = (projectId: string) => db.update(s.projects).set({ updatedAt: new Date() }).where(eq(s.projects.id, projectId))
const refresh = (boardId: string) => revalidatePath(`/dashboard/b/${boardId}`)

// Renumber positions 0..n in the given order
async function renumber(table: typeof s.projectCards | typeof s.projectLists, ids: string[]) {
  await Promise.all(ids.map((id, i) => db.update(table).set({ position: i }).where(eq(table.id, id))))
}

// ── Boards ───────────────────────────────────────────────────────────────

export async function createBoard(form: FormData) {
  const ctx = await requireContext()
  const name = String(form.get("name") ?? "").trim().slice(0, 100)
  if (!name) throw new Error("Give the board a name")
  const color = String(form.get("color") ?? "") || "#5b8cff"

  // The template registry is the one place that knows what a "sprint board"
  // or a "bug tracker" is made of. Adding a template is a data change, not a
  // deploy, and the old inline lists here are gone so the two cannot drift.
  const chosen = template(String(form.get("template") ?? "kanban")) ?? template("kanban")!
  const displayName = name

  const [project] = await db
    .insert(s.projects)
    .values({
      tenantId: ctx.tenant.id,
      name: displayName,
      slug: `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "board"}-${randomBytes(3).toString("hex")}`,
      color,
      createdById: ctx.userId,
      isTemplate: false,
      settings: {
        keyPrefix: keyPrefix(null, displayName),
        cardColor: chosen.cardColor,
        template: chosen.key,
      },
    })
    .returning()

  await db.insert(s.projectLists).values(
    chosen.lists.map((l, i) => ({
      projectId: project.id,
      name: l.name,
      position: i,
      isDoneList: l.done ?? false,
      wipLimit: l.wip ?? null,
    })),
  )
  if (chosen.labels.length) {
    await db.insert(s.projectLabels).values(
      chosen.labels.map((l) => ({ projectId: project.id, name: l.name, color: l.color })),
    )
  }
  await log(ctx, project.id, "board.created", `created the board from the ${chosen.name} template`)
  redirect(`/dashboard/b/${project.id}`)
}

export async function renameBoard(boardId: string, name: string) {
  const { ctx, project } = await boardFor(boardId, "board.update")
  const clean = name.trim().slice(0, 100)
  if (!clean) return
  await db.update(s.projects).set({ name: clean, updatedAt: new Date() }).where(eq(s.projects.id, project.id))
  await log(ctx, project.id, "board.renamed", `renamed the board to “${clean}”`)
  refresh(boardId)
}

export async function archiveBoard(boardId: string) {
  const { ctx, project } = await boardFor(boardId, "board.delete")
  await db.update(s.projects).set({ archivedAt: new Date(), archivedById: ctx.userId, status: "archived" }).where(eq(s.projects.id, project.id))
  revalidatePath("/dashboard")
  refresh(boardId)
}

// ── Lists ────────────────────────────────────────────────────────────────

export async function createList(boardId: string, name: string) {
  const { ctx, project } = await boardFor(boardId, "board.update")
  const clean = name.trim().slice(0, 80)
  if (!clean) return
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${s.projectLists.position}), -1)`.mapWith(Number) }).from(s.projectLists).where(eq(s.projectLists.projectId, project.id))
  const [list] = await db.insert(s.projectLists).values({ projectId: project.id, name: clean, position: max + 1 }).returning()
  await log(ctx, project.id, "list.created", `added the lane “${clean}”`, null, list.id)
  await touch(project.id)
  refresh(boardId)
}

export async function updateList(boardId: string, listId: string, patch: { name?: string; wipLimit?: number | null; isDoneList?: boolean; color?: string | null }) {
  const { ctx, project } = await boardFor(boardId, "board.update")
  const clean = listSettingsSchema.parse(patch)
  const result = await db.execute(sql`
    with changed as (
      update project_lists set name = coalesce(${clean.name ?? null}, name),
        wip_limit = case when ${clean.wipLimit !== undefined} then ${clean.wipLimit ?? null}::integer else wip_limit end,
        color = case when ${clean.color !== undefined} then ${clean.color ?? null}::text else color end,
        is_done_list = coalesce(${clean.isDoneList ?? null}::boolean, is_done_list), updated_at = now()
      where id = ${listId}::uuid and project_id = ${project.id}::uuid and deleted_at is null returning id, is_done_list
    ), completed as (
      update project_cards c set completed_at = case when l.is_done_list then coalesce(c.completed_at, now()) else null end,
        completed_by_id = case when l.is_done_list then coalesce(c.completed_by_id, ${ctx.userId}) else null end, updated_at = now()
      from changed l where c.list_id = l.id and c.project_id = ${project.id}::uuid and c.deleted_at is null and c.archived_at is null and ${clean.isDoneList !== undefined} returning c.id
    ), activity as (
      insert into project_activity (id, project_id, tenant_id, user_id, list_id, type, description, created_at)
      select gen_random_uuid(), ${project.id}::uuid, ${ctx.tenant.id}::uuid, ${ctx.userId}, id, 'list.updated', 'updated column settings', now() from changed
    ) select id from changed`)
  if (!result.rows.length) throw new Error("Lane not found")
  refresh(boardId)
}

export async function deleteList(boardId: string, listId: string) {
  const { ctx, project } = await boardFor(boardId, "board.update")
  const now = new Date()
  await db.update(s.projectCards).set({ deletedAt: now }).where(and(eq(s.projectCards.listId, listId), eq(s.projectCards.projectId, project.id)))
  await db.update(s.projectLists).set({ deletedAt: now }).where(and(eq(s.projectLists.id, listId), eq(s.projectLists.projectId, project.id)))
  await log(ctx, project.id, "list.deleted", "deleted a lane", null, listId)
  refresh(boardId)
}

export async function reorderLists(boardId: string, orderedIds: string[]) {
  const { project } = await boardFor(boardId, "board.update")
  const valid = await db.select({ id: s.projectLists.id }).from(s.projectLists).where(eq(s.projectLists.projectId, project.id))
  const ok = new Set(valid.map((v) => v.id))
  await renumber(s.projectLists, orderedIds.filter((id) => ok.has(id)))
  refresh(boardId)
}

// ── Cards ────────────────────────────────────────────────────────────────

export async function createCard(boardId: string, listId: string, title: string) {
  const { ctx, project } = await boardFor(boardId, "card.create")
  const clean = title.trim().slice(0, 300)
  if (!clean) return
  const [list] = await db.select().from(s.projectLists).where(and(eq(s.projectLists.id, listId), eq(s.projectLists.projectId, project.id), isNull(s.projectLists.deletedAt)))
  if (!list) throw new Error("Lane not found")
  const [{ seq }] = await db
    .select({ seq: sql<number>`coalesce(max((${s.projectCards.customFields}->>'seq')::int), 0)`.mapWith(Number) })
    .from(s.projectCards)
    .where(eq(s.projectCards.projectId, project.id))
  const [{ pos }] = await db.select({ pos: sql<number>`coalesce(max(${s.projectCards.position}), -1)`.mapWith(Number) }).from(s.projectCards).where(and(eq(s.projectCards.listId, listId), isNull(s.projectCards.deletedAt)))
  const [card] = await db
    .insert(s.projectCards)
    .values({
      projectId: project.id,
      listId,
      title: clean,
      position: pos + 1,
      createdById: ctx.userId,
      customFields: { seq: seq + 1 },
      completedAt: list.isDoneList ? new Date() : null,
    })
    .returning()
  await log(ctx, project.id, "card.created", `created ${keyPrefix(project.settings, project.name)}-${seq + 1} in ${list.name}`, card.id, listId)
  await touch(project.id)
  refresh(boardId)
  return card.id
}

export async function moveCard(cardId: string, toListId: string, toIndex: number) {
  const { ctx, card, project } = await cardFor(cardId, "card.move")
  const [target] = await db.select().from(s.projectLists).where(and(eq(s.projectLists.id, toListId), eq(s.projectLists.projectId, project.id), isNull(s.projectLists.deletedAt)))
  if (!target) throw new Error("Lane not found")

  const siblings = await db
    .select({ id: s.projectCards.id })
    .from(s.projectCards)
    .where(and(eq(s.projectCards.listId, toListId), isNull(s.projectCards.deletedAt), isNull(s.projectCards.archivedAt)))
    .orderBy(asc(s.projectCards.position))
  const ids = siblings.map((x) => x.id).filter((id) => id !== cardId)
  ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, cardId)

  const moved = card.listId !== toListId
  await db
    .update(s.projectCards)
    .set({
      listId: toListId,
      updatedAt: new Date(),
      ...(moved ? { completedAt: target.isDoneList ? new Date() : null, completedById: target.isDoneList ? ctx.userId : null } : {}),
    })
    .where(eq(s.projectCards.id, cardId))
  await renumber(s.projectCards, ids)
  if (moved) {
    await log(ctx, project.id, "card.moved", `moved ${keyPrefix(project.settings, project.name)}-${cardSeq(card.customFields)} to ${target.name}`, cardId, toListId)
    await touch(project.id)
  }
  refresh(project.id)
}

export async function updateCard(
  cardId: string,
  patch: { title?: string; description?: string | null; priority?: Priority; dueDate?: string | null; coverColor?: string | null }
) {
  const { ctx, card, project } = await cardFor(cardId, Object.keys(patch).every((key) => key === "priority") ? "card.priority" : "card.update")
  if (patch.priority !== undefined) await requireBoardPermission(project.id, "card.priority")
  const changes: Partial<typeof s.projectCards.$inferInsert> = { updatedAt: new Date() }
  const notes: string[] = []
  if (patch.title !== undefined && patch.title.trim()) { changes.title = patch.title.trim().slice(0, 300); notes.push("renamed it") }
  if (patch.description !== undefined) { changes.description = patch.description?.slice(0, 20000) || null; notes.push("updated the description") }
  if (patch.priority && PRIORITIES.includes(patch.priority)) { changes.priority = patch.priority; notes.push(`set priority to ${patch.priority}`) }
  if (patch.dueDate !== undefined) { changes.dueDate = patch.dueDate ? new Date(patch.dueDate) : null; notes.push(patch.dueDate ? "set a due date" : "cleared the due date") }
  if (patch.coverColor !== undefined) changes.coverColor = patch.coverColor
  await db.update(s.projectCards).set(changes).where(eq(s.projectCards.id, card.id))
  if (notes.length) await log(ctx, project.id, "card.updated", notes.join(", "), card.id)
  refresh(project.id)
}

export async function deleteCard(cardId: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.delete")
  await db.update(s.projectCards).set({ deletedAt: new Date() }).where(eq(s.projectCards.id, card.id))
  await log(ctx, project.id, "card.deleted", `deleted ${keyPrefix(project.settings, project.name)}-${cardSeq(card.customFields)}`, null, card.listId)
  refresh(project.id)
}

export async function archiveCard(cardId: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.delete")
  await db.update(s.projectCards).set({ archivedAt: new Date() }).where(eq(s.projectCards.id, card.id))
  await log(ctx, project.id, "card.archived", "archived the card", card.id)
  refresh(project.id)
}

export async function duplicateCard(cardId: string) {
  const { card, project } = await cardFor(cardId, "card.create")
  const newId = await createCard(project.id, card.listId, `${card.title} (copy)`)
  if (newId) await db.update(s.projectCards).set({ description: card.description, priority: card.priority, dueDate: card.dueDate }).where(eq(s.projectCards.id, newId))
  refresh(project.id)
}

export async function toggleCardLabel(cardId: string, labelId: string) {
  const { project, card } = await cardFor(cardId, "card.update")
  const [label] = await db.select().from(s.projectLabels).where(and(eq(s.projectLabels.id, labelId), eq(s.projectLabels.projectId, project.id)))
  if (!label) return
  const removed = await db.delete(s.projectCardLabels).where(and(eq(s.projectCardLabels.cardId, card.id), eq(s.projectCardLabels.labelId, labelId))).returning()
  if (!removed.length) await db.insert(s.projectCardLabels).values({ cardId: card.id, labelId })
  refresh(project.id)
}

export async function createLabel(boardId: string, name: string, color: string) {
  const { project } = await boardFor(boardId, "board.update")
  const clean = name.trim().slice(0, 40)
  if (!clean) return
  await db.insert(s.projectLabels).values({ projectId: project.id, name: clean, color: /^#[0-9a-f]{6}$/i.test(color) ? color : LABEL_COLORS[3] })
  refresh(boardId)
}

export async function toggleCardMember(cardId: string, userId: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.assign")
  const [member] = await db
    .select({ id: s.tenantMemberships.id })
    .from(s.tenantMemberships)
    .where(and(eq(s.tenantMemberships.tenantId, ctx.tenant.id), eq(s.tenantMemberships.userId, userId), isNull(s.tenantMemberships.deletedAt)))
  if (!member) return
  const removed = await db.delete(s.projectCardMembers).where(and(eq(s.projectCardMembers.cardId, card.id), eq(s.projectCardMembers.userId, userId))).returning()
  if (!removed.length) await db.insert(s.projectCardMembers).values({ cardId: card.id, userId })
  await log(ctx, project.id, removed.length ? "member.removed" : "member.added", removed.length ? "unassigned someone" : "assigned someone", card.id)
  refresh(project.id)
}

// ── Checklists & comments ────────────────────────────────────────────────

export async function addChecklist(cardId: string, title: string) {
  const { card, project } = await cardFor(cardId, "card.update")
  await db.insert(s.projectChecklists).values({ cardId: card.id, title: title.trim().slice(0, 100) || "Checklist" })
  refresh(project.id)
}

export async function addChecklistItem(cardId: string, checklistId: string, text: string) {
  const { card, project } = await cardFor(cardId, "card.update")
  const [cl] = await db.select().from(s.projectChecklists).where(and(eq(s.projectChecklists.id, checklistId), eq(s.projectChecklists.cardId, card.id)))
  if (!cl || !text.trim()) return
  const [{ pos }] = await db.select({ pos: sql<number>`coalesce(max(${s.projectChecklistItems.position}), -1)`.mapWith(Number) }).from(s.projectChecklistItems).where(eq(s.projectChecklistItems.checklistId, cl.id))
  await db.insert(s.projectChecklistItems).values({ checklistId: cl.id, text: text.trim().slice(0, 300), position: pos + 1 })
  refresh(project.id)
}

export async function toggleChecklistItem(cardId: string, itemId: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.update")
  const [item] = await db
    .select({ item: s.projectChecklistItems })
    .from(s.projectChecklistItems)
    .innerJoin(s.projectChecklists, eq(s.projectChecklists.id, s.projectChecklistItems.checklistId))
    .where(and(eq(s.projectChecklistItems.id, itemId), eq(s.projectChecklists.cardId, card.id)))
  if (!item) return
  const done = !item.item.isCompleted
  await db
    .update(s.projectChecklistItems)
    .set({ isCompleted: done, completedAt: done ? new Date() : null, completedById: done ? ctx.userId : null, updatedAt: new Date() })
    .where(eq(s.projectChecklistItems.id, itemId))
  refresh(project.id)
}

export async function deleteChecklistItem(cardId: string, itemId: string) {
  const { card, project } = await cardFor(cardId, "card.update")
  const lists = await db.select({ id: s.projectChecklists.id }).from(s.projectChecklists).where(eq(s.projectChecklists.cardId, card.id))
  const ids = new Set(lists.map((l) => l.id))
  const [item] = await db.select().from(s.projectChecklistItems).where(eq(s.projectChecklistItems.id, itemId))
  if (item && ids.has(item.checklistId)) await db.delete(s.projectChecklistItems).where(eq(s.projectChecklistItems.id, itemId))
  refresh(project.id)
}

export async function addComment(cardId: string, content: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.comment")
  const clean = content.trim().slice(0, 5000)
  if (!clean) return
  await db.insert(s.projectCardComments).values({ cardId: card.id, tenantId: ctx.tenant.id, content: clean, userId: ctx.userId })
  await log(ctx, project.id, "comment.added", "commented", card.id)
  refresh(project.id)
}

export async function deleteComment(cardId: string, commentId: string) {
  const { ctx, card, project } = await cardFor(cardId, "card.comment")
  await db
    .update(s.projectCardComments)
    .set({ deletedAt: new Date() })
    .where(and(eq(s.projectCardComments.id, commentId), eq(s.projectCardComments.cardId, card.id), eq(s.projectCardComments.userId, ctx.userId)))
  refresh(project.id)
}

// Card detail for the side panel (read)
export async function loadCard(cardId: string): Promise<CardDetailT | null> {
  const ctx = await requireContext()
  return getCardDetail(ctx.tenant.id, cardId, ctx.userId)
}
