"use server"

import { revalidatePath } from "next/cache"
import { requireBoard } from "./access"
import { requireContext } from "@/lib/context"
import { searchWorkspace, starredBoards, toggleStar, workloadFor, type SearchHit } from "./search"
import { TEMPLATES } from "./templates"

/**
 * Server actions behind the command palette and the search page.
 *
 * Both surfaces call these rather than reaching into the database themselves,
 * so "⌘K then a letter" and "the search page then a letter" cannot return
 * different results for the same workspace.
 */

export async function searchAction(query: string, kinds?: SearchHit["kind"][]): Promise<SearchHit[]> {
  const ctx = await requireContext()
  return searchWorkspace(ctx.tenant.id, query, { limit: kinds ? 12 : 20, kinds })
}

/**
 * The palette's "recent and starred" list, shown before anything is typed.
 *
 * Starred boards come first and are never trimmed away by a long recent
 * list: the boards somebody starred are the ones they want in reach, and a
 * list that drops them when they have been busy for a week has misunderstood
 * what starring means.
 */
export async function paletteBoards() {
  const ctx = await requireContext()
  const [starred, workload] = await Promise.all([
    starredBoards(ctx.tenant.id, ctx.userId),
    workloadFor(ctx.tenant.id, ctx.userId),
  ])
  return { starred, workload }
}

/** The boards a person touches most, for the palette's initial view. */
export async function recentBoards(limit = 6) {
  const ctx = await requireContext()
  const { listBoards } = await import("./data")
  return (await listBoards(ctx.tenant.id)).slice(0, limit)
}

export async function setStar(boardId: string, starred: boolean) {
  const { ctx } = await requireBoard(boardId, "board.read")
  await toggleStar(boardId, ctx.userId, starred)
  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/b/${boardId}`)
}

export async function isStarredAction(boardId: string) {
  const ctx = await requireContext()
  const rows = await paletteBoards()
  return rows.starred.some((b) => b.id === boardId)
}

/** Template keys, for the create-board dialog in the palette. */
export async function templateKeys() {
  return TEMPLATES.map((t) => ({ key: t.key, name: t.name, accent: t.accent, summary: t.summary }))
}
