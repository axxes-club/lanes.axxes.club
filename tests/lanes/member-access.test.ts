import { beforeEach, expect, it, vi } from 'vitest'
const mock=vi.hoisted(()=>({require:vi.fn(),rows:[] as unknown[][],write:vi.fn()}))
vi.mock('@/lib/lanes/access',()=>({requireBoard:mock.require}))
vi.mock('@/lib/db',async()=>{const schema=await import('../../src/lib/db/schema');return {schema,db:{select:()=>{const row=mock.rows.shift()??[];const q:any={from:()=>q,where:()=>q,limit:async()=>row,then:(resolve:any)=>Promise.resolve(row).then(resolve)};return q},insert:mock.write,delete:mock.write}}})
import { setMemberRole, removeMember } from '@/lib/lanes/members'
beforeEach(()=>{mock.write.mockClear();mock.require.mockReset();mock.rows=[];mock.require.mockResolvedValue({ctx:{userId:'actor',tenant:{id:'tenant'}}})})
it('rejects self changes even when client supplies another actor',async()=>{await expect(setMemberRole('board','actor','developer','spoofed')).rejects.toThrow('own role');await expect(removeMember('board','actor','spoofed')).rejects.toThrow('yourself');expect(mock.write).not.toHaveBeenCalled()})
it('rejects non-workspace users before creating a board role',async()=>{mock.rows=[[]];await expect(setMemberRole('board','foreign','owner','actor')).rejects.toThrow('active member');expect(mock.write).not.toHaveBeenCalled()})
it('preserves the last owner on demotion and removal',async()=>{mock.rows=[[{id:'membership'}],[{userId:'owner',role:'owner'}]];await expect(setMemberRole('board','owner','developer','actor')).rejects.toThrow('without an owner');mock.rows=[[{userId:'owner',role:'owner'}]];await expect(removeMember('board','owner','actor')).rejects.toThrow('without an owner');expect(mock.write).not.toHaveBeenCalled()})
it('rejects role changes after permission revocation',async()=>{mock.require.mockRejectedValue(new Error('Forbidden'));await expect(setMemberRole('board','member','owner','actor')).rejects.toThrow('Forbidden');expect(mock.write).not.toHaveBeenCalled()})
