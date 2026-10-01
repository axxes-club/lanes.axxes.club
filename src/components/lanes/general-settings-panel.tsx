'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BOARD_COLORS, boardSettingsSchema, type BoardSettings } from '@/lib/lanes/settings-validation'
import { updateBoardSettings } from '@/lib/lanes/settings-actions'
import type { BoardT } from '@/lib/lanes/types'
const FEATURES = [['enableDueDates','Due dates'],['enableLabels','Labels'],['enableMembers','Assignees'],['enableChecklists','Checklists'],['enableComments','Comments']] as const
export function GeneralSettingsPanel({ board, canManage }: { board: BoardT; canManage: boolean }) {
 const [name,setName]=useState(board.name),[description,setDescription]=useState(board.description??''),[color,setColor]=useState(board.color??''),[settings,setSettings]=useState<BoardSettings>(board.settings??{}),[error,setError]=useState(''),[saved,setSaved]=useState(false),[pending,start]=useTransition()
 const router=useRouter()
 return <form className="card space-y-5 p-5" onSubmit={(e)=>{e.preventDefault();setError('');setSaved(false);start(async()=>{try{await updateBoardSettings(board.id,boardSettingsSchema.parse({name,description:description||null,color:color||null,...settings}));setSaved(true);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Could not save settings.')}})}}>
 <fieldset disabled={!canManage||pending} className="space-y-5"><label className="block text-sm font-medium">Board name<input className="input mt-2 w-full" required maxLength={100} value={name} onChange={(e)=>setName(e.target.value)}/></label>
 <label className="block text-sm font-medium">Description<textarea className="input mt-2 min-h-24 w-full" maxLength={5000} value={description} onChange={(e)=>setDescription(e.target.value)}/></label>
 <div className="grid gap-4 sm:grid-cols-3">{[['Board color',color,(value:string)=>setColor(value)],['Default card color',settings.cardColor??'',(value:string)=>setSettings({...settings,cardColor:value?value as typeof BOARD_COLORS[number]:null})],['Default column color',settings.defaultListColor??'',(value:string)=>setSettings({...settings,defaultListColor:value?value as typeof BOARD_COLORS[number]:null})]].map(([label,value,change])=><label key={label as string} className="text-sm">{label as string}<select className="input mt-2 w-full" value={value as string} onChange={(e)=>(change as (v:string)=>void)(e.target.value)}><option value="">Default</option>{BOARD_COLORS.map((c)=><option key={c} value={c}>{c}</option>)}</select></label>)}</div>
 <div><h2 className="text-sm font-semibold">Card features</h2><p className="mt-1 text-xs text-muted">Choose what your board shows. Existing card data is retained.</p><div className="mt-3 flex flex-wrap gap-5">{FEATURES.map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings[key]!==false} onChange={(e)=>setSettings({...settings,[key]:e.target.checked})}/>{label}</label>)}</div></div>
 {canManage&&<button className="btn-primary" disabled={pending}>{pending?'Saving…':'Save changes'}</button>}</fieldset>{!canManage&&<p className="text-sm text-muted">A board owner can change these settings.</p>}{error&&<p role="alert" className="text-sm text-danger">{error}</p>}{saved&&<p role="status" className="text-sm text-success">Changes saved.</p>}</form>
}
