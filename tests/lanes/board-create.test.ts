import { beforeEach, expect, it, vi } from 'vitest'
const mock=vi.hoisted(()=>({context:vi.fn(),insert:vi.fn(),values:vi.fn()}))
vi.mock('@/lib/context',()=>({requireContext:mock.context}))
vi.mock('next/navigation',()=>({redirect:()=>{throw new Error('redirect')}}))
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
vi.mock('@/lib/lanes/access',()=>({requireBoard:vi.fn(),requireCard:vi.fn()}))
vi.mock('@/lib/lanes/activity',()=>({recordActivity:vi.fn()}))
vi.mock('@/lib/lanes/data',()=>({keyPrefix:()=> 'TEAM'}))
vi.mock('@/lib/db',async()=>({schema:await import('../../src/lib/db/schema'),db:{insert:mock.insert}}))
import {createBoard} from '@/lib/lanes/actions'
beforeEach(()=>{mock.values.mockClear();mock.insert.mockClear();mock.context.mockResolvedValue({userId:'u',role:'member',tenant:{id:'t'}});const q={values:mock.values,returning:async()=>[{id:'b'}]};mock.values.mockReturnValue(q);mock.insert.mockReturnValue(q)})
it('blocks workspace viewers from creating boards',async()=>{mock.context.mockResolvedValue({userId:'u',role:'viewer',tenant:{id:'t'}});const form=new FormData();form.set('name','Board');await expect(createBoard(form)).rejects.toThrow('create boards');expect(mock.insert).not.toHaveBeenCalled()})
it('gives the creator a board owner role',async()=>{const form=new FormData();form.set('name','Board');await expect(createBoard(form)).rejects.toThrow('redirect');expect(mock.values).toHaveBeenCalledWith({boardId:'b',userId:'u',role:'owner'})})
