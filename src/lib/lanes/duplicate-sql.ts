import { sql } from 'drizzle-orm'
// Lock/version gate is shared with definition and value writes. The entire copy
// either commits with its activity/version bump or leaves no partial card.
export function duplicateCardStatement(boardId:string, cardId:string, userId:string, tenantId:string, version:number) {
 return sql`with locked as materialized (
 select id from projects where id=${boardId}::uuid and deleted_at is null
 and coalesce(settings->>'_lanesFieldVersion','0')::integer=${version} for update
 ), changed as (
 insert into project_cards(id,project_id,list_id,title,description,priority,due_date,cover_color,position,created_by_id,custom_fields,completed_at,created_at,updated_at)
 select gen_random_uuid(),c.project_id,c.list_id,left(c.title||' (copy)',300),c.description,c.priority,c.due_date,c.cover_color,
 coalesce((select max(position)+1 from project_cards where list_id=c.list_id and deleted_at is null),0),${userId},
 coalesce((select jsonb_object_agg(e.key,e.value) from jsonb_each(coalesce(c.custom_fields,'{}'::jsonb)) e
 where e.key<>'seq' and not exists(select 1 from custom_fields f where f.board_id=c.project_id and f.key=e.key and (f.deleted_at is not null or
 (f.type='select' and e.value<>'null'::jsonb and not exists(select 1 from jsonb_array_elements(f.options) o where o->>'value'=e.value#>>'{}')) or
 (f.type='multi_select' and e.value<>'null'::jsonb and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(e.value)='array' then e.value else '[]'::jsonb end) v where not exists(select 1 from jsonb_array_elements(f.options) o where o->>'value'=v#>>'{}')))))),'{}'::jsonb)
 ||jsonb_build_object('seq',coalesce((select max((custom_fields->>'seq')::integer)+1 from project_cards where project_id=c.project_id),1)),
 case when l.is_done_list then now() else null end,now(),now()
 from project_cards c join project_lists l on l.id=c.list_id and l.project_id=c.project_id
 where c.id=${cardId}::uuid and c.project_id=${boardId}::uuid and c.deleted_at is null and l.deleted_at is null and exists(select 1 from locked)
 returning id
 ), versioned as (
 update projects set settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('_lanesFieldVersion',${version+1}::integer),updated_at=now()
 where id=${boardId}::uuid and exists(select 1 from changed)
 ), activity as (
 insert into project_activity(id,project_id,tenant_id,user_id,card_id,type,description,created_at)
 select gen_random_uuid(),${boardId}::uuid,${tenantId}::uuid,${userId},id,'card.created','duplicated a card',now() from changed
 ) select id from changed`
}
