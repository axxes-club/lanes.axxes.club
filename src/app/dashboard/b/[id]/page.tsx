import { notFound } from "next/navigation"
import { requireContext } from "@/lib/context"
import { getBoard } from "@/lib/lanes/data"
import { Board } from "@/components/lanes/board"

export const dynamic = "force-dynamic"

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext()
  const board = await getBoard(ctx.tenant.id, (await params).id)
  if (!board) notFound()
  return <Board board={board} me={ctx.userId} />
}
