import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import type { BulkOperation } from './bulk-validation'
export function bulkStatement(boardId:string,tenantId:string,actorId:string,ids:string[],operation:BulkOperation,version:number):SQL {
 const eligibility=operation.type==='move'?sql`exists(select 1 from project_lists where id=${operation.listId}::uuid and project_id=${boardId}::uuid and deleted_at is null)`:operation.type==='assignee-add'||operation.type==='assignee-remove'?sql`exists(select 1 from tenant_memberships where tenant_id=${tenantId}::uuid and user_id=${operation.userId} and deleted_at is null)`:sql`true`
 let change:SQL
 if(operation.type==='move')change=sql`update project_cards c set list_id=${operation.listId}::uuid, position=coalesce((select max(position)+1 from project_cards where list_id=${operation.listId}::uuid and deleted_at is null and archived_at is null),0)+t.ordinal-1, completed_at=case when l.is_done_list then coalesce(c.completed_at,now()) else null end, completed_by_id=case when l.is_done_list then coalesce(c.completed_by_id,${actorId}) else null end,updated_at=now() from targets t,project_lists l where c.id=t.id and l.id=${operation.listId}::uuid and exists(select 1 from valid) returning c.id`
 else if(operation.type==='priority')change=sql`update project_cards set priority=${operation.value}::card_priority,updated_at=now() where id in(select id from targets) and exists(select 1 from valid) returning id`
 else if(operation.type==='due-date')change=sql`update project_cards set due_date=${operation.value?operation.value+'T17:00:00Z':null}::timestamptz,updated_at=now() where id in(select id from targets) and exists(select 1 from valid) returning id`
 else if(operation.type==='archive')change=sql`update project_cards set archived_at=now(),updated_at=now() where id in(select id from targets) and exists(select 1 from valid) returning id`
 else if(operation.type==='assignee-add')change=sql`insert into project_card_members(id,card_id,user_id,created_at) select gen_random_uuid(),t.id,${operation.userId},now() from targets t where exists(select 1 from valid) and not exists(select 1 from project_card_members m where m.card_id=t.id and m.user_id=${operation.userId}) returning card_id as id`
 else change=sql`delete from project_card_members where card_id in(select id from targets) and user_id=${operation.userId} and exists(select 1 from valid) returning card_id as id`
 return sql`with locked as materialized (
 select id from projects where id=${boardId}::uuid and tenant_id=${tenantId}::uuid and deleted_at is null and coalesce(settings->>'_lanesBulkVersion','0')::integer=${version} for update
 ), requested as (select value::uuid as id, ordinality::integer as ordinal from jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb) with ordinality), targets as materialized (
 select c.id,r.ordinal from project_cards c join requested r on r.id=c.id where c.project_id=${boardId}::uuid and c.deleted_at is null and c.archived_at is null and exists(select 1 from locked) for update of c
 ), valid as materialized(select 1 where (select count(*) from targets)=${ids.length} and ${eligibility}), changed as (${change}), activity as (
 insert into project_activity(id,project_id,tenant_id,user_id,card_id,type,description,created_at) select gen_random_uuid(),${boardId}::uuid,${tenantId}::uuid,${actorId},id,${'card.bulk.'+operation.type},${'bulk '+operation.type},now() from targets where exists(select 1 from valid)
 ), versioned as (
 update projects set settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object('_lanesBulkVersion',${version+1}::integer),updated_at=now() where id=${boardId}::uuid and exists(select 1 from valid)
 ) select count(*)::integer as updated from targets where exists(select 1 from valid)`
}
