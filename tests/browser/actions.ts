export const calls:any[]=[]
export const action=async(...args:any[])=>{calls.push(args)}
export const archiveCard=action,archiveBoard=action,createCard=action,createList=action,deleteCard=action,deleteList=action,duplicateCard=action,moveCard=action,renameBoard=action,reorderLists=action,toggleCardLabel=action,toggleCardMember=action,updateCard=action,updateList=action,saveView=action,updateView=action,deleteView=action,bulkUpdateCards=action,saveCardFields=action,createField=action,updateField=action,deleteField=action,reorderFields=action,updateBoardSettings=action,linkRecordAction=action,unlinkRecordAction=action
export const searchLinkableRecords=async()=>[]
export const addChecklist=action,addChecklistItem=action,addComment=action,deleteChecklistItem=action,deleteComment=action,toggleChecklistItem=action
export async function loadCard(id:string){return {...window.fixture.cards[0],id,links:[],checklists:[],commentsList:[],activity:[]}}
export function PokerPanel(){return null}
declare global {interface Window{fixture:any}}
