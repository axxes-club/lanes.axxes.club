import { and,eq,isNull } from 'drizzle-orm';
import { db,schema } from '../src/lib/db';
import { resolveToken,tokenAllows } from '../src/lib/lanes/api-tokens';
import { isWorkspaceManager } from '../src/lib/lanes/roles';
import { planCentralOrganization } from '../src/lib/lanes/central-organization';
async function main(){
 const args=process.argv.slice(2),id=args[args.indexOf('--tenant-id')+1];
 if(!args.includes('--tenant-id')||!id)throw new Error('Usage: --tenant-id <uuid> [--apply]');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw new Error('Invalid tenant UUID.');
 const [tenant]=await db.select().from(schema.tenants).where(eq(schema.tenants.id,id)).limit(1);
 if(!tenant)throw new Error('Tenant does not exist. No writes performed.');
 const boards=await db.select({id:schema.projects.id,name:schema.projects.name}).from(schema.projects).where(and(eq(schema.projects.tenantId,id),isNull(schema.projects.deletedAt)));
 const plan=planCentralOrganization(tenant,boards);console.log(JSON.stringify({tenant:{id:tenant.id,name:tenant.name,slug:tenant.slug},boards,plan,apply:args.includes('--apply')},null,2));
 if(!args.includes('--apply'))return;
 const raw=process.env.LANES_API_TOKEN;if(!raw)throw new Error('LANES_API_TOKEN is required for apply.');
 const token=await resolveToken(raw);if(!token||token.tenantId!==id||!tokenAllows(token,'read')||!tokenAllows(token,'write'))throw new Error('Token must belong to the selected tenant and permit read/write. No writes performed.');
 const [membership]=await db.select().from(schema.tenantMemberships).where(and(eq(schema.tenantMemberships.userId,token.userId),eq(schema.tenantMemberships.tenantId,id))).limit(1);
 if(!membership||!isWorkspaceManager(membership.role??'member'))throw new Error('Use an existing tenant member with organization management permission. No writes performed.');
 await db.update(schema.tenants).set({name:'AXXES'}).where(eq(schema.tenants.id,id));console.log('Updated display name; tenant ID, slug and membership retained.');
 for(const name of plan.missingBoards){const response=await fetch('https://lanes.axxes.app/api/v1/boards',{method:'POST',headers:{Authorization:`Bearer ${raw}`,'Content-Type':'application/json'},body:JSON.stringify({name,template:'kanban'}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Board ${name} could not be created (${response.status}). Rerun dry-run to inspect partial progress before applying again.`);console.log(`Created ${name}.`);}
}
main().then(()=>process.exit(0)).catch(error=>{const message=error instanceof Error?error.message:'';const safe=/^(Usage:|Invalid tenant UUID|Tenant does not exist|Duplicate board name|LANES_API_TOKEN is required|Token must belong|Use an existing tenant member|Board AXXES\.)/.test(message)?message:'Central AXXES setup failed. Existing data is retained. Run dry-run and verify tenant/token configuration before retrying.';console.error(safe);process.exit(1);});
