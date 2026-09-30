// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),replace:vi.fn(),push:vi.fn()})}))
vi.mock('@/components/lanes/card-panel',()=>({CardPanel:()=>null}))
vi.mock('@/components/lanes/poker-panel',()=>({PokerPanel:()=>null}))
vi.mock('@/lib/lanes/actions',()=>Object.fromEntries(['archiveCard','archiveBoard','createCard','createList','deleteCard','deleteList','duplicateCard','moveCard','renameBoard','reorderLists','toggleCardLabel','toggleCardMember','updateCard','updateList'].map(name=>[name,vi.fn(async()=>undefined)])))
vi.mock('@/lib/lanes/bulk-actions',()=>({bulkUpdateCards:vi.fn(async()=>({updated:1}))}))
import { Board } from '@/components/lanes/board'
import type { BoardT,CardT } from '@/lib/lanes/types'
afterEach(cleanup)
const card=(id:string,title:string):CardT=>({id,key:'LN-'+id,title,listId:'lane',description:null,position:0,priority:'medium',dueDate:null,completedAt:null,coverColor:null,labelIds:[],memberIds:[],checklistDone:0,checklistTotal:0,comments:0})
const board:BoardT={id:'board',name:'Board',description:null,color:null,keyPrefix:'LN',cards:[card('one','Visible'),card('two','Hidden')],lists:[{id:'lane',name:'To do',position:0,wipLimit:null,isDoneList:false,color:null}],people:[],labels:[]}
it('selects only visible results and prunes removed cards after refresh',()=>{const {rerender}=render(<Board board={board} me="me" can={{'card.move':true}}/>);fireEvent.change(screen.getByLabelText('Filter cards'),{target:{value:'Visible'}});fireEvent.click(screen.getByLabelText('Select all visible cards'));expect(screen.getByText('1 selected')).toBeTruthy();expect((screen.getByLabelText('Select LN-one') as HTMLInputElement).checked).toBe(true);rerender(<Board board={{...board,cards:[card('two','Hidden')]}} me="me" can={{'card.move':true}}/>);expect(screen.queryByText('1 selected')).toBeNull()})
it('clears selection when changing boards',()=>{const {rerender}=render(<Board board={board} me="me" can={{'card.move':true}}/>);fireEvent.click(screen.getByLabelText('Select LN-one'));expect(screen.getByText('1 selected')).toBeTruthy();rerender(<Board board={{...board,id:'other'}} me="me" can={{'card.move':true}}/>);expect(screen.queryByText('1 selected')).toBeNull()})
