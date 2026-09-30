import { beforeAll, afterAll, expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
const state=vi.hoisted(()=>({pg:null as any,denied:false}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
vi.mock('@/lib/db',async()=>({schema:await import('../../src/lib/db/schema'),db:{execute:async(statement:any)=>{const q=new PgDialect().sqlToQuery(statement);return state.pg.query(q.sql,q.params)},select:()=>{const chain:any={from:()=>chain,where:async()=>{const r=await state.pg.query('select custom_fields as values from project_cards where archived_at is null and deleted_at is null');return r.rows}};return chain}}}))
vi.mock('@/lib/lanes/access',()=>({requireBoard:async(id:string)=>{if(state.denied)throw new Error('Forbidden');const r=await state.pg.query('select id, settings from projects where id=$1',[id]);if(!r.rows[0])throw new Error('Board not found');return {ctx:{userId:'u',tenant:{id:'00000000-0000-4000-8000-000000000001'}},project:r.rows[0]}},requireCard:async(id:string)=>{const r=await state.pg.query('select * from project_cards where id=$1',[id]);const p=await state.pg.query('select id,settings from projects where id=$1',[r.rows[0].project_id]);return {ctx:{userId:'u',tenant:{id:'00000000-0000-4000-8000-000000000001'}},project:p.rows[0],card:{...r.rows[0],customFields:r.rows[0].custom_fields}}}}))
vi.mock('@/lib/lanes/settings-data',()=>({listCustomFields:async(id:string)=>{const r=await state.pg.query('select id,key,name,type,options,required,show_on_card as "showOnCard",position from custom_fields where board_id=$1 and deleted_at is null order by position',[id]);return r.rows}}))
vi.mock('@/lib/lanes/data',()=>({workspacePeople:async()=>[{id:'u'}]}))
import { createField, deleteField, saveCardFields, reorderFields, updateField } from '@/lib/lanes/field-actions'
const board='00000000-0000-4000-8000-000000000002',card='00000000-0000-4000-8000-000000000003'
beforeAll(async()=>{state.pg=new PGlite();await state.pg.exec(`create type custom_field_type as enum ('text','number','select','multi_select','date','checkbox','url','user');
create table projects(id uuid primary key,settings jsonb default '{}',deleted_at timestamptz,updated_at timestamptz);
create table custom_fields(id uuid primary key,board_id uuid,key text,name text,type custom_field_type,options jsonb,required boolean,show_on_card boolean,position integer,created_at timestamptz,deleted_at timestamptz,unique(board_id,key));
create table project_cards(id uuid primary key,project_id uuid,custom_fields jsonb,deleted_at timestamptz,archived_at timestamptz,updated_at timestamptz);
create table project_activity(id uuid,project_id uuid,tenant_id uuid,user_id text,card_id uuid,type text,description text,created_at timestamptz);
insert into projects(id,settings) values('${board}','{"unrelated":true}');insert into project_cards(id,project_id,custom_fields)values('${card}','${board}','{"seq":42,"unrelated":true}');`);})
afterAll(async()=>{await state.pg?.close()})
it('persists fields and values while preserving sequence and unrelated JSON',async()=>{
 await createField(board,{key:'budget',name:'Budget',type:'number'})
 await saveCardFields(card,{budget:12.5})
 const {rows}=await state.pg.query('select custom_fields from project_cards where id=$1',[card])
 expect(rows[0].custom_fields).toEqual({seq:42,unrelated:true,budget:12.5})
 const project=await state.pg.query('select settings from projects');expect(project.rows[0].settings.unrelated).toBe(true)
})
it('rejects deletion/recreation and reserves existing internal metadata keys',async()=>{
 const r=await state.pg.query('select id from custom_fields where key=$1',['budget']);await deleteField(board,r.rows[0].id)
 await expect(createField(board,{key:'budget',name:'New budget',type:'text'})).rejects.toThrow()
 await expect(createField(board,{key:'unrelated',name:'Internal data',type:'text'})).rejects.toThrow()
 const c=await state.pg.query('select custom_fields from project_cards');expect(c.rows[0].custom_fields.budget).toBe(12.5)
})
it('rejects duplicate/foreign reorder IDs and immutable definition patches',async()=>{
 await createField(board,{key:'severity',name:'Severity',type:'select',options:[{value:'a',label:'A'}]})
 const r=await state.pg.query('select id from custom_fields where key=$1',['severity'])
 await expect(reorderFields(board,[r.rows[0].id,r.rows[0].id])).rejects.toThrow()
 await expect(updateField(board,r.rows[0].id,{type:'text'})).rejects.toThrow()
 await saveCardFields(card,{severity:'a'})
})

it('rejects removing a referenced choice and supports definition edits/reorder',async()=>{
 const r=await state.pg.query('select id from custom_fields where key=$1',['severity'])
 await expect(updateField(board,r.rows[0].id,{options:[{value:'b',label:'B'}]})).rejects.toThrow('still used')
 await updateField(board,r.rows[0].id,{name:'Issue severity',showOnCard:true})
 await reorderFields(board,[r.rows[0].id])
 const f=await state.pg.query('select name,position,show_on_card from custom_fields where id=$1',[r.rows[0].id])
 expect(f.rows[0]).toEqual({name:'Issue severity',position:0,show_on_card:true})
})
it('does not write values or activity for unknown fields',async()=>{
 const before=await state.pg.query('select count(*)::int as n from project_activity')
 await expect(saveCardFields(card,{seq:100})).rejects.toThrow('Unknown field')
 const after=await state.pg.query('select count(*)::int as n from project_activity');expect(after.rows).toEqual(before.rows)
})
