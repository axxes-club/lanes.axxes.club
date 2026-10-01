'use server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema as s } from '@/lib/db'
import { requireBoard, requireCard } from './access'
import { badRequest } from './errors'
import { workspacePeople } from './data'
import { listCustomFields } from './settings-data'
import { fieldDefinitionSchema, fieldPatchSchema, validateChoiceChange, validateFieldValues, type FieldDefinitionInput } from './field-validation'

const versionOf = (settings: unknown) => Number((settings as Record<string,unknown> | null)?._lanesFieldVersion ?? 0)
function lockBoard(boardId:string,version:number){return sql`select id from projects where id=${boardId}::uuid and deleted_at is null and coalesce(settings->>'_lanesFieldVersion','0')::integer=${version} for update`}
function versionUpdate(boardId:string){return sql`update projects set settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('_lanesFieldVersion',coalesce(settings->>'_lanesFieldVersion','0')::integer+1), updated_at=now() where id=${boardId}::uuid and exists(select 1 from changed)`}
function refresh(boardId:string){revalidatePath(`/dashboard/b/${boardId}`);revalidatePath(`/dashboard/b/${boardId}/settings`)}
function checked(rows:unknown[]){if(!rows.length)throw badRequest('Fields changed while you were editing. Refresh and try again.')}
export async function createField(boardId:string,input:FieldDefinitionInput):Promise<void>{
 const {ctx,project}=await requireBoard(boardId,'customField.manage');await listCustomFields(boardId);const f=fieldDefinitionSchema.parse(input)
 // Existing card metadata must never be reinterpreted as a custom field.
 const result=await db.execute(sql`with locked as materialized (${lockBoard(boardId,versionOf(project.settings))}), changed as (
 insert into custom_fields (id,board_id,key,name,type,options,required,show_on_card,position,created_at)
 select gen_random_uuid(), ${boardId}::uuid, ${f.key}, ${f.name}, ${f.type}::custom_field_type, ${JSON.stringify(f.options)}::jsonb, ${f.required}, ${f.showOnCard}, coalesce((select max(position)+1 from custom_fields where board_id=${boardId}::uuid),0), now()
 from locked where not exists(select 1 from project_cards where project_id=${boardId}::uuid and custom_fields ? ${f.key}) on conflict (board_id,key) do nothing returning id
 ), versioned as (${versionUpdate(boardId)}), activity as (
 insert into project_activity(id,project_id,tenant_id,user_id,type,description,created_at) select gen_random_uuid(),${boardId}::uuid,${ctx.tenant.id}::uuid,${ctx.userId},'field.created',${`created field ${f.name}`},now() from changed
 ) select id from changed`);if(!result.rows.length)throw badRequest('This field key is reserved, already used, or the board changed. Choose another key or refresh.');refresh(boardId)
}
export async function updateField(boardId:string,fieldId:string,patch:unknown):Promise<void>{
 const {ctx,project}=await requireBoard(boardId,'customField.manage');const clean=fieldPatchSchema.parse(patch)
 const definitions=await listCustomFields(boardId);const field=definitions.find(f=>f.id===fieldId);if(!field)throw badRequest('Field not found.')
 const next=fieldDefinitionSchema.parse({key:field.key,name:clean.name??field.name,type:field.type,options:clean.options??field.options,required:clean.required??field.required,showOnCard:clean.showOnCard??field.showOnCard})
 const cards=await db.select({values:s.projectCards.customFields}).from(s.projectCards).where(and(eq(s.projectCards.projectId,boardId),isNull(s.projectCards.deletedAt),isNull(s.projectCards.archivedAt)))
 if(clean.options)validateChoiceChange(field,clean.options,cards.map(c=>c.values??{}))
 const result=await db.execute(sql`with locked as materialized (${lockBoard(boardId,versionOf(project.settings))}), changed as (
 update custom_fields set name=${next.name},options=${JSON.stringify(next.options)}::jsonb,required=${next.required},show_on_card=${next.showOnCard}
 where id=${fieldId}::uuid and board_id=${boardId}::uuid and deleted_at is null and exists(select 1 from locked) returning id
 ), versioned as (${versionUpdate(boardId)}), activity as (insert into project_activity(id,project_id,tenant_id,user_id,type,description,created_at) select gen_random_uuid(),${boardId}::uuid,${ctx.tenant.id}::uuid,${ctx.userId},'field.updated',${`updated field ${field.name}`},now() from changed) select id from changed`);checked(result.rows);refresh(boardId)
}
export async function deleteField(boardId:string,fieldId:string):Promise<void>{
 const {ctx,project}=await requireBoard(boardId,'customField.manage')
 const result=await db.execute(sql`with locked as materialized (${lockBoard(boardId,versionOf(project.settings))}), changed as (update custom_fields set deleted_at=now() where id=${fieldId}::uuid and board_id=${boardId}::uuid and deleted_at is null and exists(select 1 from locked) returning id), versioned as (${versionUpdate(boardId)}), activity as (insert into project_activity(id,project_id,tenant_id,user_id,type,description,created_at) select gen_random_uuid(),${boardId}::uuid,${ctx.tenant.id}::uuid,${ctx.userId},'field.deleted','removed a custom field',now() from changed) select id from changed`);checked(result.rows);refresh(boardId)
}
export async function reorderFields(boardId:string,fieldIds:string[]):Promise<void>{
 const {project}=await requireBoard(boardId,'customField.manage');const fields=await listCustomFields(boardId)
 if(fieldIds.length!==fields.length||new Set(fieldIds).size!==fields.length||fieldIds.some(id=>!fields.some(f=>f.id===id)))throw badRequest('Choose each board field exactly once.')
 const result=await db.execute(sql`with locked as materialized (${lockBoard(boardId,versionOf(project.settings))}), changed as (update custom_fields f set position=r.position-1 from jsonb_to_recordset(${JSON.stringify(fieldIds.map((id,i)=>({id,position:i+1})))}::jsonb) as r(id uuid,position integer) where f.id=r.id and f.board_id=${boardId}::uuid and f.deleted_at is null and exists(select 1 from locked) returning f.id), versioned as (${versionUpdate(boardId)}) select id from changed`);if(fields.length)checked(result.rows);refresh(boardId)
}
export async function saveCardFields(cardId:string,values:Record<string,unknown>):Promise<void>{
 const {ctx,card,project}=await requireCard(cardId,'card.update');const fields=await listCustomFields(project.id);const people=await workspacePeople(ctx.tenant.id)
 // Validate required fields against the current card but merge only submitted keys.
 const current=Object.fromEntries(fields.filter(f=>Object.hasOwn(card.customFields??{},f.key)).map(f=>[f.key,(card.customFields??{})[f.key]]))
 const validated=validateFieldValues(fields,{...current,...values},people.map(p=>p.id));const patch=Object.fromEntries(Object.keys(values).map(key=>[key,validated[key]]))
 const result=await db.execute(sql`with locked as materialized (${lockBoard(project.id,versionOf(project.settings))}), changed as (
 update project_cards set custom_fields=coalesce(custom_fields,'{}'::jsonb)||${JSON.stringify(patch)}::jsonb,updated_at=now() where id=${cardId}::uuid and project_id=${project.id}::uuid and deleted_at is null and exists(select 1 from locked) returning id
 ), versioned as (${versionUpdate(project.id)}), activity as (insert into project_activity(id,project_id,tenant_id,user_id,card_id,type,description,created_at) select gen_random_uuid(),${project.id}::uuid,${ctx.tenant.id}::uuid,${ctx.userId},id,'card.fields','updated custom fields',now() from changed) select id from changed`);checked(result.rows);refresh(project.id)
}
