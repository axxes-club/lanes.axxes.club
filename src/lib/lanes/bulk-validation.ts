import { z } from 'zod'
import type { Permission } from './permissions'
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(`${v}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v})
export const bulkOperationSchema=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('move'),listId:z.uuid()}),z.strictObject({type:z.literal('priority'),value:z.enum(['urgent','high','medium','low'])}),
 z.strictObject({type:z.literal('assignee-add'),userId:z.string().min(1).max(200)}),z.strictObject({type:z.literal('assignee-remove'),userId:z.string().min(1).max(200)}),
 z.strictObject({type:z.literal('due-date'),value:date.nullable()}),z.strictObject({type:z.literal('archive')}),
])
export type BulkOperation=z.infer<typeof bulkOperationSchema>
export const bulkRequestSchema=z.strictObject({cardIds:z.array(z.uuid()).min(1).max(100).refine(ids=>new Set(ids).size===ids.length,'Choose each card only once.'),operation:bulkOperationSchema})
export function bulkPermission(operation:BulkOperation):Permission {switch(operation.type){case 'move':return 'card.move';case 'priority':return 'card.priority';case 'assignee-add':case 'assignee-remove':return 'card.assign';case 'archive':return 'card.delete';case 'due-date':return 'card.update'}}
