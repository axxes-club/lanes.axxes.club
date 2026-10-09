import "server-only"
import {securityPool} from "../security/admission-server"
import {admit} from "../security/admission.mjs"
const WINDOW_MS=60_000, LIMIT_WRITE=120, LIMIT_READ=600
export type Limit={limit:number;remaining:number;reset:number;ok:boolean;unavailable?:boolean}
export interface RateLimitStore{name:string;increment(key:string,windowMs:number):Promise<{count:number;reset:number}>}
// INCR and initial expiry form one indivisible operation; no pipeline races.
const SCRIPT="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local ttl=redis.call('PTTL',KEYS[1]); if ttl<0 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); ttl=tonumber(ARGV[1]) end; return {n,ttl}"
export function redisStore(url:string,token:string):RateLimitStore{
 return {name:"redis",async increment(key,windowMs){
  const endpoint=new URL(url);if(endpoint.protocol!=="https:")throw Error("Invalid shared rate store");
  const res=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(["EVAL",SCRIPT,"1",`lanes:admission:${key}`,String(windowMs)]),signal:AbortSignal.timeout(3000)});
  if(!res.ok)throw Error("Rate store unavailable");
  const payload=await res.json() as {error?:unknown;result?:unknown};
  if(payload.error||!Array.isArray(payload.result)||payload.result.length!==2)throw Error("Invalid rate result");
  const [count,ttl]=payload.result;if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(ttl)||ttl<0||ttl>windowMs)throw Error("Invalid rate counter");
  return {count,reset:Date.now()+ttl};
 }};
}
function buildStore():RateLimitStore{
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(url&&token)return redisStore(url,token);
 return {name:"postgres",async increment(key,windowMs){const result=await admit(securityPool(),{service:"lanes",scope:"api-token",subject:key,limit:2147483646,windowMs});return {count:2147483646-result.remaining,reset:Date.now()+result.retryAfter*1000};}};
}
let store=buildStore();
export function setRateLimitStore(next:RateLimitStore){store=next;}
export function rateLimitStoreName(){return store.name;}
export async function rateLimit(key:string,kind:"read"|"write"):Promise<Limit>{
 const limit=kind==="write"?LIMIT_WRITE:LIMIT_READ;
 try{const bucket=await store.increment(key,WINDOW_MS);if(!Number.isSafeInteger(bucket.count)||bucket.count<1||!Number.isFinite(bucket.reset))throw Error("Invalid rate result");return {limit,remaining:Math.max(0,limit-bucket.count),reset:bucket.reset,ok:bucket.count<=limit};}
 catch{return {limit,remaining:0,reset:Date.now()+3000,ok:false,unavailable:true};}
}
export function retryAfterSeconds(limit:Limit){return Math.max(1,Math.ceil((limit.reset-Date.now())/1000));}
