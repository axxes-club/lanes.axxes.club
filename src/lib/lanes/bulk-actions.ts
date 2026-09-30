'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireBoard } from './access'
import { bulkRequestSchema, bulkPermission, type BulkOperation } from './bulk-validation'
import { bulkStatement } from './bulk-sql'
import { badRequest } from './errors'
export async function bulkUpdateCards(boardId:string,cardIds:string[],operation:BulkOperation):Promise<{updated:number}>{
 const clean=bulkRequestSchema.parse({cardIds,operation});const {ctx,project}=await requireBoard(boardId,bulkPermission(clean.operation))
 const version=Number((project.settings as Record<string,unknown>|null)?._lanesBulkVersion??0)
 const result=await db.execute(bulkStatement(boardId,ctx.tenant.id,ctx.userId,clean.cardIds,clean.operation,version))
 const updated=Number(result.rows[0]?.updated??0)
 if(updated!==clean.cardIds.length)throw badRequest('Some selected cards, people, or columns are unavailable, or the board changed. Refresh and try again. No cards were changed.')
 revalidatePath(`/dashboard/b/${boardId}`);revalidatePath('/dashboard');return {updated}
}
