"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Board } from "./board"
import { BoardToolbar } from "./board-toolbar"
import { setStar } from "@/lib/lanes/commands"
import type { BoardT } from "@/lib/lanes/types"
import type { BoardChrome } from "@/lib/lanes/board-view"

/**
 * The board's client shell.
 *
 * Exists for one reason: the star is read by three things — the toolbar
 * button, the `s` keyboard shortcut and the boards home — and a state that
 * lives in two of them will eventually show a filled star that is not
 * starred. One owner, one handler, three callers.
 *
 * The update is optimistic: a star that waits for a round trip feels like a
 * button that sometimes works, which is worse than not offering it.
 */
export function BoardClient({
  board,
  me,
  can,
  focusCard,
  chrome,
}: {
  board: BoardT
  me: string
  can: Record<string, boolean>
  focusCard: string | null
  chrome: BoardChrome
}) {
  const router = useRouter()
  const [starred, setStarred] = useState(chrome.starred)
  const [, start] = useTransition()

  const changeStar = useCallback(
    (next: boolean) => {
      setStarred(next)
      start(async () => {
        await setStar(board.id, next)
        router.refresh()
      })
    },
    [board.id, router],
  )

  return (
    <>
      <BoardToolbar
        boardId={board.id}
        boardName={board.name}
        chrome={{ ...chrome, starred }}
        onStarChange={changeStar}
      />
      <div className="min-h-0 flex-1">
        <Board board={board} me={me} can={can} focusCard={focusCard} starred={starred} onStarChange={changeStar} />
      </div>
    </>
  )
}
