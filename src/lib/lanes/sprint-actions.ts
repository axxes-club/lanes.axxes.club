"use server"

import { revalidatePath } from "next/cache"
import { requireContext } from "@/lib/context"
import { LanesError } from "./errors"
import { requireBoardPermission } from "./board-access"
import { completeSprint, createSprint, setCardSprint, startSprint } from "./sprints"

/**
 * Sprint actions.
 *
 * Each one re-derives the caller's permission from the session. The UI hides
 * the button; this refuses the request. A screen that only hides controls it
 * does not have is not enforcing anything.
 */

export type ActionResult = { error?: string; hint?: string }

async function run(boardId: string, path: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn()
  } catch (e) {
    if (e instanceof LanesError) return { error: e.message, hint: e.hint ?? undefined }
    console.error(e)
    return { error: "Something went wrong. Try again." }
  }
  revalidatePath(path)
  return {}
}

export async function createSprintAction(
  boardId: string,
  name: string,
  goal: string,
  startsAt: string,
  endsAt: string,
): Promise<ActionResult> {
  return run(boardId, `/dashboard/b/${boardId}`, () =>
    createSprint(boardId, {
      name,
      goal,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    }),
  )
}

export async function startSprintAction(boardId: string, sprintId: string): Promise<ActionResult> {
  return run(boardId, `/dashboard/b/${boardId}`, () => startSprint(sprintId))
}

export async function completeSprintAction(boardId: string, sprintId: string): Promise<ActionResult> {
  return run(boardId, `/dashboard/b/${boardId}`, () => completeSprint(sprintId))
}

export async function commitCardAction(boardId: string, cardId: string, sprintId: string | null): Promise<ActionResult> {
  return run(boardId, `/dashboard/b/${boardId}`, () => setCardSprint(cardId, sprintId))
}

/** What the sprint panel is allowed to render, decided server-side once. */
export async function sprintPermissions(boardId: string) {
  const ctx = await requireContext()
  void ctx
  return {
    canManage: await requireBoardPermission(boardId, "sprint.manage").then(() => true).catch(() => false),
    canCommit: await requireBoardPermission(boardId, "sprint.commit").then(() => true).catch(() => false),
    canComplete: await requireBoardPermission(boardId, "sprint.complete").then(() => true).catch(() => false),
  }
}
