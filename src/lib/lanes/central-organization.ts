export function planCentralOrganization(tenant:{id:string;name:string;slug:string},boards:{id:string;name:string}[]):{tenantId:string;displayName:'AXXES';missingBoards:string[]} {
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(tenant.id))throw new Error('Select an existing tenant UUID.');
 const names=['AXXES.club','AXXES.work','AXXES.app'];
 for(const name of names)if(boards.filter(b=>b.name===name).length>1)throw new Error(`Duplicate board name ${name}: resolve the ambiguity before applying.`);
 return {tenantId:tenant.id,displayName:'AXXES',missingBoards:names.filter(name=>!boards.some(b=>b.name===name))};
}
