import {createRoot} from 'react-dom/client'
import {Board} from '../../src/components/lanes/board'
import {GeneralSettingsPanel} from '../../src/components/lanes/general-settings-panel'
import {FieldsPanel} from '../../src/components/lanes/fields-panel'
import '../../src/app/globals.css'
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const fields=[{id:uuid(10),key:'budget',name:'Budget',type:'number',options:[],required:false,showOnCard:true,position:0},{id:uuid(11),key:'severity',name:'Severity',type:'select',options:[{value:'high',label:'High'},{value:'low',label:'Low'}],required:false,showOnCard:true,position:1}]
const card=(n:number,title:string)=>({id:uuid(n),key:'LN-'+n,title,listId:uuid(2),description:null,position:n,priority:'medium' as const,dueDate:null,completedAt:null,coverColor:null,labelIds:[],memberIds:[],checklistDone:0,checklistTotal:0,comments:0,customFields:{budget:100,severity:'high'},fieldBadges:[{name:'Budget',value:'100'}]})
const board={id:uuid(1),name:'Release board',description:null,color:'#5b8cff',keyPrefix:'LN',lists:[{id:uuid(2),name:'To do',position:0,wipLimit:null,isDoneList:false,color:null},{id:uuid(3),name:'Done',position:1,wipLimit:null,isDoneList:true,color:null}],cards:[card(4,'Design review'),card(5,'Ship release')],labels:[],people:[{id:'me',name:'Test user',email:'test@example.com',image:null}],fields,settings:{}}
window.fixture=board
const can=Object.fromEntries(['board.read','board.update','board.settings','board.delete','board.members','card.read','card.create','card.update','card.move','card.delete','card.assign','card.priority','card.comment','card.link'].map(p=>[p,true]))
const section=new URLSearchParams(location.search).get('surface')
createRoot(document.getElementById('root')!).render(<main className="p-4">{section==='settings'?<GeneralSettingsPanel board={board} canManage/>:section==='fields'?<FieldsPanel boardId={board.id} fields={fields} canManage/>:<Board board={board} me="me" can={can}/>}</main>)
