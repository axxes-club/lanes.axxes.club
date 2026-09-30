import {afterAll,beforeAll,expect,it} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {PgDialect} from 'drizzle-orm/pg-core'
import {duplicateCardStatement} from '@/lib/lanes/duplicate-sql'
const pg=new PGlite(),dialect=new PgDialect()
const board='00000000-0000-4000-8000-000000000001',card='00000000-0000-4000-8000-000000000002',lane='00000000-0000-4000-8000-000000000003'
async function copy(version:number){const q=dialect.sqlToQuery(duplicateCardStatement(board,card,'u',board,version));return pg.query(q.sql,q.params)}
beforeAll(async()=>{await pg.exec(`
create table projects(id uuid primary key,settings jsonb,deleted_at timestamptz,updated_at timestamptz);
create table project_lists(id uuid primary key,project_id uuid,is_done_list boolean,deleted_at timestamptz);
create table project_cards(id uuid primary key,project_id uuid,list_id uuid,title text,description text,priority text,due_date timestamptz,cover_color text,position integer,created_by_id text,custom_fields jsonb,completed_at timestamptz,deleted_at timestamptz,created_at timestamptz,updated_at timestamptz);
create table custom_fields(board_id uuid,key text,type text,options jsonb,deleted_at timestamptz);
create table project_activity(id uuid,project_id uuid,tenant_id uuid,user_id text,card_id uuid,type text,description text,created_at timestamptz);
insert into projects values('${board}','{}',null,null);
insert into project_lists values('${lane}','${board}',false,null);
insert into project_cards(id,project_id,list_id,title,priority,position,custom_fields)values('${card}','${board}','${lane}','Source','high',0,'{"seq":42,"budget":12,"severity":"old","internal":true}');
insert into custom_fields values('${board}','severity','select','[{"value":"current"}]',null);
`)})
afterAll(async()=>pg.close())
it('copies valid values and metadata, drops obsolete choices and advances the field version',async()=>{
 expect((await copy(0)).rows).toHaveLength(1)
 const r=await pg.query('select custom_fields from project_cards where id<>$1',[card]);expect(r.rows[0].custom_fields).toEqual({seq:43,budget:12,internal:true})
 expect((await pg.query('select settings from projects')).rows[0].settings).toEqual({_lanesFieldVersion:1})
 expect((await pg.query('select * from project_activity')).rows).toHaveLength(1)
})
it('rejects stale copies atomically without a card or activity',async()=>{
 expect((await copy(0)).rows).toHaveLength(0)
 expect((await pg.query('select * from project_cards')).rows).toHaveLength(2)
 expect((await pg.query('select * from project_activity')).rows).toHaveLength(1)
})
