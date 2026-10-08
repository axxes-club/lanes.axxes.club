import {test,expect,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';import {drizzle} from 'drizzle-orm/pglite';
const state=vi.hoisted(()=>({db:null as any}));
vi.mock('@/lib/db',async()=>({schema:await import('../../src/lib/db/schema'),get db(){return state.db;}}));
vi.mock('@/lib/lanes/api-tokens',()=>({resolveToken:async()=>({id:'token',userId:'actor',tenantId:'00000000-0000-4000-8000-000000000001'}),touchToken:async()=>{},tokenAllows:()=>true}));
import {authenticate} from '../../src/lib/lanes/api-auth';
test('removed seats and suspended tenants invalidate otherwise valid bearer credentials',async()=>{
 const db=new PGlite();state.db=drizzle(db);
 await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY,status text,deleted_at timestamptz);CREATE TABLE tenant_memberships(id uuid,user_id text,tenant_id uuid,role text,deleted_at timestamptz);INSERT INTO tenants VALUES('00000000-0000-4000-8000-000000000001','active',NULL);INSERT INTO tenant_memberships VALUES('00000000-0000-4000-8000-000000000002','actor','00000000-0000-4000-8000-000000000001','admin',NULL);`);
 const request=new Request('https://lanes.axxes.app/api/v1/boards',{headers:{authorization:'Bearer unit-token'}});
 try{
  expect(await authenticate(request)).not.toBeNull();
  await db.exec("UPDATE tenant_memberships SET deleted_at=now()");expect(await authenticate(request)).toBeNull();
  await db.exec("UPDATE tenant_memberships SET deleted_at=NULL;UPDATE tenants SET status='suspended'");expect(await authenticate(request)).toBeNull();
  await db.exec("UPDATE tenants SET status='active',deleted_at=now()");expect(await authenticate(request)).toBeNull();
 }finally{await db.close();}
});
