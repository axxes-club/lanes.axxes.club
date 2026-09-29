"use server"

import { revalidatePath } from "next/cache"
import { requireContext } from "@/lib/context"
import { LanesError } from "./errors"
import { castVote, closeRound, readRound, revealRound, roundHistory, startRound } from "./poker"

/**
 * Planning poker actions.
 *
 * Votes are hidden until everybody has answered or the facilitator reveals.
 * That rule lives in `readRound`, not here and not in the component, because
 * the component is not the only thing that will ever read a round — a future
 * websocket delivery or a CLI would otherwise be free to show everyone's vote
 * the moment it landed.
 */

export type ActionResult = { error?: string; hint?: string }

async function guard(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn()
    return {}
  } catch (e) {
    if (e instanceof LanesError) return { error: e.message, hint: e.hint ?? undefined }
    console.error(e)
    return { error: "Something went wrong. Try again." }
  }
}

export async function startRoundAction(boardId: string, cardId: string | null, deck: string) {
  const result = await guard(() => startRound(boardId, { cardId, deck }))
  if (!result.error) revalidatePath(`/dashboard/b/${boardId}`)
  return result
}

/** The current state of a round, for the panel. */
export async function readRoundAction(roundId: string) {
  const ctx = await requireContext()
  return readRound(roundId, ctx.userId)
}

export async function castVoteAction(roundId: string, card: string) {
  const ctx = await requireContext()
  return guard(() => castVote(roundId, ctx.userId, card))
}

export async function revealRoundAction(boardId: string, roundId: string) {
  const result = await guard(() => revealRound(roundId))
  if (!result.error) revalidatePath(`/dashboard/b/${boardId}`)
  return result
}

export async function closeRoundAction(boardId: string, roundId: string, consensus: number | null) {
  const result = await guard(() => closeRound(roundId, consensus))
  if (!result.error) revalidatePath(`/dashboard/b/${boardId}`)
  return result
}

export async function roundHistoryAction(boardId: string) {
  return roundHistory(boardId, 12).catch(() => [])
}
