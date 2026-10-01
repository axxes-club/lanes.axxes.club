import { z } from 'zod'
export const FIELD_TYPES = ['text','number','select','multi_select','date','checkbox','url','user'] as const
export type FieldType = typeof FIELD_TYPES[number]
export type FieldValue = string | number | boolean | string[] | null
export type FieldDefinition = { id: string; key: string; name: string; type: string; options: {value:string;label:string;color?:string}[]; required:boolean;showOnCard:boolean;position:number }
const option = z.strictObject({value:z.string().trim().min(1).max(100),label:z.string().trim().min(1).max(100),color:z.string().regex(/^#[\da-f]{6}$/i).optional()})
export const fieldDefinitionSchema = z.strictObject({
 key:z.string().regex(/^[a-z][a-z0-9_]{0,49}$/).refine((key)=>!['seq','constructor','prototype','__proto__','estimate','story_points','external_id'].includes(key),'This key is reserved.'),
 name:z.string().trim().min(1).max(100),type:z.enum(FIELD_TYPES),options:z.array(option).max(100).default([]),required:z.boolean().default(false),showOnCard:z.boolean().default(false),
}).superRefine((f,ctx)=>{if(new Set(f.options.map(o=>o.value)).size!==f.options.length)ctx.addIssue({code:'custom',message:'Choice values must be unique.'});if(['select','multi_select'].includes(f.type)&&!f.options.length)ctx.addIssue({code:'custom',message:'Add at least one choice.'});if(!['select','multi_select'].includes(f.type)&&f.options.length)ctx.addIssue({code:'custom',message:'Only select fields have choices.'})})
export type FieldDefinitionInput = z.input<typeof fieldDefinitionSchema>
export const fieldPatchSchema=z.strictObject({name:z.string().trim().min(1).max(100).optional(),options:z.array(option).max(100).optional(),required:z.boolean().optional(),showOnCard:z.boolean().optional()})
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00Z`);return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
export function validateFieldValues(definitions: FieldDefinition[], values: Record<string, unknown>, activeUserIds: string[]): Record<string,FieldValue> {
 const keys=new Set(definitions.map(f=>f.key));for(const key of Object.keys(values))if(!keys.has(key))throw new Error(`Unknown field: ${key}`)
 const result:Record<string,FieldValue>={}
 for(const f of definitions){const value=values[f.key];const blank=value==null||value===''||(typeof value==='string'&&!value.trim())||(Array.isArray(value)&&!value.length)
 if(blank){if(f.required)throw new Error(`${f.name} is required.`);if(Object.hasOwn(values,f.key))result[f.key]=null;continue}
 let valid=false
 switch(f.type){
 case 'text':valid=typeof value==='string'&&value.length<=5000;break
 case 'number':valid=typeof value==='number'&&Number.isFinite(value);break
 case 'checkbox':valid=typeof value==='boolean';break
 case 'date':valid=typeof value==='string'&&validDate(value);break
 case 'url':try{valid=typeof value==='string'&&value.length<=2000&&['https:','http:'].includes(new URL(value).protocol)}catch{};break
 case 'user':valid=typeof value==='string'&&activeUserIds.includes(value);break
 case 'select':valid=typeof value==='string'&&f.options.some(o=>o.value===value);break
 case 'multi_select':valid=Array.isArray(value)&&value.every(v=>typeof v==='string'&&f.options.some(o=>o.value===v))&&new Set(value).size===value.length;break
 }
 if(!valid)throw new Error(`Choose a valid value for ${f.name}.`);result[f.key]=value as FieldValue
 }
 return result
}
export function validateChoiceChange(field:FieldDefinition,options:FieldDefinition['options'],cards:Record<string,unknown>[]){const kept=new Set(options.map(o=>o.value));for(const card of cards){const value=card[field.key];const values=Array.isArray(value)?value:value==null?[]:[value];if(values.some(v=>typeof v==='string'&&!kept.has(v)))throw new Error('A removed choice is still used by an active card. Update those cards first.')}}
export function fieldDisplay(field:FieldDefinition,value:unknown,people:{id:string;name:string}[]=[]):string {
 if(value==null||value==='')return 'Not set'
 if(field.type==='checkbox')return value?'Yes':'No'
 if(field.type==='user')return people.find(p=>p.id===value)?.name??'Unavailable member'
 if(field.type==='select'||field.type==='multi_select')return (Array.isArray(value)?value:[value]).map(v=>field.options.find(o=>o.value===v)?.label??String(v)).join(', ')
 return String(value)
}
