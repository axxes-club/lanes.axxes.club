import { expect, it } from 'vitest'
import { boardSettingsSchema, listSettingsSchema, completionFor } from '@/lib/lanes/settings-validation'
it('rejects blank names, unknown keys, malformed colors and WIP', () => {
 for(const input of [{name:''},{name:'   '},{color:'red'},{name:'OK',admin:true}]) expect(boardSettingsSchema.safeParse(input).success).toBe(false)
 for(const limit of [0,-1,1.5,100,NaN]) expect(listSettingsSchema.safeParse({wipLimit:limit}).success).toBe(false)
 expect(listSettingsSchema.parse({wipLimit:null})).toEqual({wipLimit:null})
})
it('normalizes valid settings without filling unspecified keys', () => {
 expect(boardSettingsSchema.parse({name:'  Team  ',color:'#5b8cff',enableComments:false})).toEqual({name:'Team',color:'#5b8cff',enableComments:false})
})
it('preserves completion dates on done transitions and clears on reopening', () => {
 const before='2026-09-20T12:00:00Z', now='2026-09-30T12:00:00Z'
 expect(completionFor(true,before,now)).toBe(before)
 expect(completionFor(true,null,now)).toBe(now)
 expect(completionFor(false,before,now)).toBe(null)
})
it('hides disabled presentation metadata without changing stored values', async () => {
 const { cardPresentation }=await import('@/lib/lanes/settings-validation')
 const card={dueDate:'2026-10-01',labelIds:['a'],memberIds:['u'],checklistDone:1,checklistTotal:2,comments:3,coverColor:null}
 expect(cardPresentation(card,{enableDueDates:false,enableLabels:false,enableMembers:false,enableChecklists:false,enableComments:false,cardColor:'#5b8cff'})).toEqual({dueDate:null,labelIds:[],memberIds:[],checklistDone:0,checklistTotal:0,comments:0,coverColor:'#5b8cff'})
 expect(card.comments).toBe(3)
 expect(cardPresentation({...card,coverColor:'#ef4444'},{cardColor:'#5b8cff'}).coverColor).toBe('#ef4444')
})
