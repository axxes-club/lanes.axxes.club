import { z } from 'zod'
export const viewModeSchema=z.enum(['board','list','table'])
export type ViewMode=z.infer<typeof viewModeSchema>
export const viewStateSchema=z.strictObject({
 text:z.string().max(500).default(''),labelIds:z.array(z.uuid()).max(100).default([]),memberIds:z.array(z.string().min(1).max(200)).max(100).default([]),priorities:z.array(z.enum(['urgent','high','medium','low'])).max(4).default([]),
 due:z.enum(['all','none','week','overdue']).default('all'),sort:z.strictObject({key:z.enum(['position','priority','due','title','lane']),dir:z.union([z.literal(1),z.literal(-1)])}).default({key:'position',dir:1}),
})
export type SavedViewState=z.infer<typeof viewStateSchema>
export const savedViewInputSchema=z.strictObject({name:z.string().trim().min(1).max(100),view:viewModeSchema,state:viewStateSchema,isShared:z.boolean().default(false)})
export type SavedViewInput=z.input<typeof savedViewInputSchema>
export type SavedView={id:string;name:string;view:ViewMode;state:SavedViewState;isShared:boolean;userId:string}
export function reconcileViewState(state:SavedViewState,labelIds:string[],memberIds:string[]){const labels=state.labelIds.filter(id=>labelIds.includes(id));const members=state.memberIds.filter(id=>memberIds.includes(id));return {state:{...state,labelIds:labels,memberIds:members},removed:state.labelIds.length-labels.length+state.memberIds.length-members.length}}
