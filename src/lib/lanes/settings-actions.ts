'use server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema as s } from '@/lib/db'
import { requireBoard } from './access'
import { boardSettingsSchema, type BoardSettingsInput } from './settings-validation'
import { recordActivity } from './activity'
export async function updateBoardSettings(boardId: string, input: BoardSettingsInput): Promise<void> {
  const { ctx, project } = await requireBoard(boardId, 'board.settings')
  const { name, description, color, ...settings } = boardSettingsSchema.parse(input)
  await db.update(s.projects).set({ ...(name === undefined ? {} : {name}), ...(description === undefined ? {} : {description}), ...(color === undefined ? {} : {color}), settings: sql`coalesce(${s.projects.settings}, '{}'::jsonb) || ${JSON.stringify(settings)}::jsonb`, updatedAt: new Date() }).where(and(eq(s.projects.id, project.id), eq(s.projects.tenantId, ctx.tenant.id), isNull(s.projects.deletedAt)))
  await recordActivity(ctx, boardId, 'board.settings', 'updated board settings')
  revalidatePath('/dashboard'); revalidatePath(`/dashboard/b/${boardId}`); revalidatePath(`/dashboard/b/${boardId}/settings`)
}
