import 'server-only'
import { db, schema as s } from '@/lib/db'
export async function recordActivity(ctx: { tenant: { id: string }; userId: string }, projectId: string, type: string, description: string, cardId?: string | null, listId?: string | null) {
  await db.insert(s.projectActivity).values({ projectId, tenantId: ctx.tenant.id, cardId: cardId ?? null, listId: listId ?? null, type, description, userId: ctx.userId })
}
