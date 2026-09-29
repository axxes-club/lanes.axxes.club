"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cx } from "@/components/ui"
import { IconCheck, IconClose, IconPlay, IconTarget } from "@/components/icons"
import {
  castVoteAction, closeRoundAction, readRoundAction, revealRoundAction, startRoundAction,
} from "@/lib/lanes/poker-actions"
import { DECK_LABELS, DECKS, type DeckName } from "@/lib/lanes/decks"

/**
 * Planning poker.
 *
 * The one rule that makes estimation honest: nobody sees a vote until every
 * participant has cast theirs, or the facilitator reveals. Without it the
 * first hand raised anchors the room and the whole session is theatre. The
 * rule is enforced in `readRound`, so this component cannot leak it by
 * accident — it is never sent a vote it is not allowed to see.
 */
export function PokerPanel({
  boardId,
  cardId,
  cardTitle,
  canFacilitate,
  onClose,
}: {
  boardId: string
  cardId: string | null
  cardTitle: string | null
  canFacilitate: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [round, setRound] = useState<Awaited<ReturnType<typeof readRoundAction>> | null>(null)
  const [deck, setDeck] = useState<DeckName>("fibonacci")
  const [error, setError] = useState<string | null>(null)

  async function refresh(id: string) {
    const r = await readRoundAction(id).catch(() => null)
    setRound(r)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label="Planning poker" className="w-full max-w-lg animate-pop-in rounded-2xl border border-line bg-panel p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Planning poker</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{cardTitle ?? "Estimate a card"}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost btn-icon-sm" aria-label="Close">
            <IconClose size={15} />
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        {!round ? (
          <div className="mt-6">
            <p className="text-sm text-muted">
              Everybody votes at the same time and nobody sees the others until everyone has answered.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-xs text-muted">Deck</span>
              <select value={deck} onChange={(e) => setDeck(e.target.value as DeckName)} className="input">
                {(Object.keys(DECKS) as DeckName[]).map((d) => (
                  <option key={d} value={d}>
                    {DECK_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !canFacilitate}
              className="btn-primary btn-lg mt-5 w-full"
              onClick={() =>
                start(async () => {
                  setError(null)
                  const r = await startRoundAction(boardId, cardId, deck)
                  if (r.error) return setError(r.error)
                  // The created round is not returned to the client, so the
                  // panel re-reads the open rounds rather than guessing an id.
                  router.refresh()
                  onClose()
                })
              }
            >
              <IconPlay size={15} />
              {canFacilitate ? "Start a round" : "Only a scrum master can start a round"}
            </button>
          </div>
        ) : (
          <PokerRound
            round={round}
            pending={pending}
            canFacilitate={canFacilitate}
            onVote={(card) =>
              start(async () => {
                const r = await castVoteAction(round.round.id, card)
                if (r.error) return setError(r.error)
                await refresh(round.round.id)
              })
            }
            onReveal={() =>
              start(async () => {
                const r = await revealRoundAction(boardId, round.round.id)
                if (r.error) return setError(r.error)
                await refresh(round.round.id)
              })
            }
            onClose2={(consensus) =>
              start(async () => {
                const r = await closeRoundAction(boardId, round.round.id, consensus)
                if (r.error) return setError(r.error)
                onClose()
                router.refresh()
              })
            }
          />
        )}
      </div>
    </div>
  )
}

function PokerRound({
  round,
  pending,
  canFacilitate,
  onVote,
  onReveal,
  onClose2,
}: {
  round: NonNullable<Awaited<ReturnType<typeof readRoundAction>>>
  pending: boolean
  canFacilitate: boolean
  onVote: (card: string) => void
  onReveal: () => void
  onClose2: (consensus: number | null) => void
}) {
  // `cards` lives on the round; `votes` and `revealed` live on the response.
  // `votes` is empty until everybody has answered or the facilitator
  // reveals — the server withholds them, so there is nothing to hide here.
  const { cards } = round.round
  const { revealed, waitingOn, totalVoters, myVote, votes } = round
  const tallies = new Map<string, number>()
  for (const v of votes) tallies.set(v.card, (tallies.get(v.card) ?? 0) + 1)

  return (
    <div className="mt-6">
      {!revealed ? (
        <>
          <p className="text-sm text-muted">
            {waitingOn === 0
              ? "Everybody has voted. Reveal when you are ready."
              : `Waiting on ${waitingOn} of ${totalVoters} to vote.`}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {cards.map((c: string) => (
              <button
                key={c}
                type="button"
                disabled={pending}
                onClick={() => onVote(c)}
                className={cx(
                  "btn-lg border font-mono",
                  myVote === c
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line bg-panel-2 text-text hover:border-line-strong",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {canFacilitate && (
            <button type="button" disabled={pending || waitingOn > 0} onClick={onReveal} className="btn-outline btn-lg mt-5 w-full">
              Reveal
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            {votes.length} {votes.length === 1 ? "vote" : "votes"} revealed.
          </p>
          <ul className="mt-4 space-y-1.5">
            {[...tallies.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([card, n]) => (
                <li key={card} className="flex items-center gap-3">
                  <span className="w-8 font-mono text-sm">{card}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-3">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(n / votes.length) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-xs text-muted">{n}</span>
                </li>
              ))}
          </ul>
          {canFacilitate && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onClose2(Number([...tallies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0))}
                className="btn-primary"
              >
                <IconCheck size={15} /> Accept the top card
              </button>
              <button type="button" disabled={pending} onClick={() => onClose2(null)} className="btn-ghost">
                Close without estimating
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
