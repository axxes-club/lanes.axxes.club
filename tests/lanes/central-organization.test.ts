import { expect,it } from 'vitest';
import { planCentralOrganization } from '../../src/lib/lanes/central-organization';
const tenant={id:'00000000-0000-4000-8000-000000000001',name:'axxes.club',slug:'axxes-club'};
it('retains tenant and reuses exact board names',()=>{expect(planCentralOrganization(tenant,[{id:'existing',name:'AXXES.club'}])).toEqual({tenantId:tenant.id,displayName:'AXXES',missingBoards:['AXXES.work','AXXES.app']});expect(tenant.slug).toBe('axxes-club');});
it('rejects ambiguous board names',()=>{expect(()=>planCentralOrganization(tenant,[{id:'1',name:'AXXES.club'},{id:'2',name:'AXXES.club'}])).toThrow(/duplicate/i);});
