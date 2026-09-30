// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}))
const actions=vi.hoisted(()=>({change:vi.fn(async()=>({})),remove:vi.fn(async()=>({}))}))
vi.mock('@/lib/lanes/member-actions',()=>({changeRoleAction:actions.change,removeMemberAction:actions.remove}))
import { MembersPanel } from '@/components/lanes/members-panel'
afterEach(cleanup)
const props={boardId:'board',viewerId:'me',canManage:true,viewerRole:'owner',viewerElevated:false,members:[{userId:'me',name:'Me',email:'me@example.com',image:null,role:'owner',implicit:false},{userId:'other',name:'Other',email:'other@example.com',image:null,role:'developer',implicit:false},{userId:'new',name:'Available',email:'available@example.com',image:null,role:'viewer',implicit:true}]} as const
it('filters members by name or email and shows own actual role',()=>{render(<MembersPanel {...props} members={[...props.members]}/>);expect(screen.getByText('Your role: Board owner')).toBeTruthy();fireEvent.change(screen.getByLabelText('Search board members'),{target:{value:'other@example'}});expect(screen.queryByText('Me')).toBeNull();expect(screen.getByText('Other')).toBeTruthy()})
it('adds an available workspace member with selected role',async()=>{render(<MembersPanel {...props} members={[...props.members]}/>);fireEvent.change(screen.getByLabelText('Workspace member'),{target:{value:'new'}});fireEvent.change(screen.getByLabelText('New member role'),{target:{value:'designer'}});fireEvent.click(screen.getByRole('button',{name:'Add member'}));expect(actions.change).toHaveBeenCalledWith('board','new','designer')})
