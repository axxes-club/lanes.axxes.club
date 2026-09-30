'use server'
import { and, asc, eq, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema as s } from '@/lib/db'
import { requireBoard } from './access'
import { requireBoardPermission } from './board-access'
import { workspacePeople } from './data'
import { badRequest, forbidden } from './errors'
import { savedViewInputSchema, viewStateSchema, viewModeSchema, type SavedViewInput, type SavedView } from './view-validation'
export async function listSavedViews(boardId:string):Promise<SavedView[]>{
 const {ctx}=await requireBoard(boardId,'board.read');const rows=await db.select().from(s.savedViews).where(and(eq(s.savedViews.boardId,boardId),or(eq(s.savedViews.userId,ctx.userId),eq(s.savedViews.isShared,true)))).orderBy(asc(s.savedViews.position),asc(s.savedViews.createdAt))
 return rows.flatMap(r=>{const state=viewStateSchema.safeParse(r.state);const view=viewModeSchema.safeParse(r.view);return state.success&&view.success?[{id:r.id,name:r.name,userId:r.userId,isShared:r.isShared,state:state.data,view:view.data}]:[]})
}
async function validateReferences(boardId:string,tenantId:string,input:ReturnType<typeof savedViewInputSchema.parse>){const [labels,people]=await Promise.all([db.select({id:s.projectLabels.id}).from(s.projectLabels).where(eq(s.projectLabels.projectId,boardId)),workspacePeople(tenantId)]);if(input.state.labelIds.some(id=>!labels.some(l=>l.id===id))||input.state.memberIds.some(id=>!people.some(p=>p.id===id)))throw badRequest('Some filters are no longer available. Update the view and try again.')}
export async function saveView(boardId:string,input:SavedViewInput):Promise<void>{
 const clean=savedViewInputSchema.parse(input);const {ctx}=await requireBoard(boardId,clean.isShared?'board.update':'board.read');await validateReferences(boardId,ctx.tenant.id,clean)
 await db.insert(s.savedViews).values({boardId,userId:ctx.userId,...clean});revalidatePath(`/dashboard/b/${boardId}`)
}
export async function updateView(boardId:string,viewId:string,patch:SavedViewInput):Promise<void>{
 const clean=savedViewInputSchema.parse(patch);const {ctx}=await requireBoard(boardId,'board.read');const [row]=await db.select().from(s.savedViews).where(and(eq(s.savedViews.id,viewId),eq(s.savedViews.boardId,boardId))).limit(1)
 if(!row)throw badRequest('View not found.');if(row.isShared||clean.isShared)await requireBoardPermission(boardId,'board.update');if(!row.isShared&&row.userId!==ctx.userId)throw forbidden('Only the creator can edit this personal view.')
 await validateReferences(boardId,ctx.tenant.id,clean)
 const changed = await db.update(s.savedViews).set({...clean,updatedAt:new Date()}).where(and(eq(s.savedViews.id,viewId),eq(s.savedViews.boardId,boardId),eq(s.savedViews.isShared,row.isShared),eq(s.savedViews.userId,row.userId))).returning()
 if (!changed.length) throw badRequest("This view changed. Refresh and try again.")
 revalidatePath(`/dashboard/b/${boardId}`)
}
export async function deleteView(boardId:string,viewId:string):Promise<void>{
 const {ctx}=await requireBoard(boardId,'board.read');const [row]=await db.select().from(s.savedViews).where(and(eq(s.savedViews.id,viewId),eq(s.savedViews.boardId,boardId))).limit(1)
 if(!row)throw badRequest('View not found.');if(row.isShared)await requireBoardPermission(boardId,'board.update');else if(row.userId!==ctx.userId)throw forbidden('Only the creator can delete this personal view.')
 const changed = await db.delete(s.savedViews).where(and(eq(s.savedViews.id,viewId),eq(s.savedViews.boardId,boardId),eq(s.savedViews.isShared,row.isShared),eq(s.savedViews.userId,row.userId))).returning();if(!changed.length)throw badRequest("This view changed. Refresh and try again.");revalidatePath(`/dashboard/b/${boardId}`)
}
