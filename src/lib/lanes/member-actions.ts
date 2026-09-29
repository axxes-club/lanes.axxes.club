"use server"

import { revalidatePath } from "next/cache"
import { requireContext } from "@/lib/context"
import { LanesError } from "./errors"
import { removeMember, setMemberRole } from "./members"

/**
 * Board membership actions.
 *
 * `actorId` is passed in from the client but never trusted for the decision:
 * `setMemberRole` and `removeMember` both re-derive the caller's own role
 * from the session and the board, and use that. Passing the id through is
 * only a way to name the actor in the "you cannot change yourself" rule.
 */

export type ActionResult = { error?: string; hint?: string }

async function run(boardId: string, fn: () => Promise<void>, path: string): Promise<ActionResult> {
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

export async function changeRoleAction(boardId: string, userId: string, role: string): Promise<ActionResult> {
  const ctx = await requireContext()
  return run(boardId, () => setMemberRole(boardId, userId, role, ctx.userId), `/dashboard/b/${boardId}/settings`)
}

export async function removeMemberAction(boardId: string, userId: string): Promise<ActionResult> {
  const ctx = await requireContext()
  return run(boardId, () => removeMember(boardId, userId, ctx.userId), `/dashboard/b/${boardId}/settings`)
}
