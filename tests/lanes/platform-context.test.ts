vi.mock('@/lib/security/admission-server',()=>({admitAction:async()=>{}}));
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({selected:'denied',rows:[{tenantId:'denied',name:'A',slug:'a',role:'member',isPrimary:true},{tenantId:'eligible',name:'B',slug:'b',role:'member',isPrimary:false}],denyAll:false}));
vi.mock('react',async()=>({...await vi.importActual('react'),cache:(fn:unknown)=>fn}));
vi.mock('next/headers',()=>({headers:async()=>new Headers(),cookies:async()=>({get:()=>({value:state.selected})})}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('redirect:'+url);}}));
vi.mock('../../src/lib/auth',()=>({auth:{api:{getSession:async()=>({user:{id:'u',name:'Test',email:'test@example.com'}})}}}));
vi.mock('../../src/lib/platform-access',()=>({platformAccessAllowed:async(_id:string,org?:string)=>!org || !state.denyAll && org==='eligible'}));
vi.mock('../../src/lib/db',()=>({schema:{tenantMemberships:{},tenants:{}},db:{select:()=>({from:()=>({innerJoin:()=>({where:()=>({orderBy:async()=>state.rows})})})})}}));
vi.mock('../../src/components/logo',()=>({Logo:()=>null}));
import {getContext,listMemberships} from '../../src/lib/context';
import NoTenantPage from '../../src/app/no-tenant/page';
beforeEach(()=>{state.denyAll=false;});
it('falls back from a denied selected organization and excludes it from the switcher',async()=>{
 const ctx=await getContext();expect(ctx?.tenant.id).toBe('eligible');expect((await listMemberships('u')).map(m=>m.tenantId)).toEqual(['eligible']);
});
it('an account without eligible organizations gets a stable page instead of a redirect loop',async()=>{
 state.denyAll=true;expect(await getContext()).toBeNull();expect(()=>NoTenantPage()).not.toThrow();
});
