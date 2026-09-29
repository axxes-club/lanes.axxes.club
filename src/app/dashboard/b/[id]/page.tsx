import { notFound } from "next/navigation"
import { requireContext } from "@/lib/context"
import { getBoard } from "@/lib/lanes/data"
import { boardChrome } from "@/lib/lanes/board-view"
import { Board } from "@/components/lanes/board"
import { BoardToolbar } from "@/components/lanes/board-toolbar"

export const dynamic = "force-dynamic"

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ card?: string }>
}) {
  const { id } = await params
  const { card: focusCard } = await searchParams
  const ctx = await requireContext()

  const [board, chrome] = await Promise.all([
    getBoard(ctx.tenant.id, id),
    boardChrome(id, ctx.userId),
  ])
  if (!board) notFound()

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-9rem)]">
      <BoardToolbar boardId={board.id} boardName={board.name} chrome={chrome} />
      <div className="min-h-0 flex-1">
        <Board board={board} me={ctx.userId} can={chrome.permissions} focusCard={focusCard ?? null} />
      </div>
    </div>
  )
}
