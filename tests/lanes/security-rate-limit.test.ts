import {afterEach,describe,it,expect,vi} from 'vitest';
import {rateLimit,setRateLimitStore,redisStore} from '../../src/lib/lanes/rate-limit';
afterEach(()=>vi.unstubAllGlobals());
describe('distributed admission',()=>{
 it('refuses work when the shared counter is unavailable',async()=>{
  setRateLimitStore({name:'failed',increment:async()=>{throw new Error('offline')}});
  expect((await rateLimit('actor:write','write')).ok).toBe(false);
 });
 it('accepts the first real REST envelope and refuses an exhausted bucket',async()=>{
  const responses=[{result:[1,60000]},{result:[121,60000]}];
  vi.stubGlobal('fetch',async()=>Response.json(responses.shift()));
  const store=redisStore('https://redis.invalid','unit-token');
  setRateLimitStore(store);
  const first=await rateLimit('actor:write','write');expect(first.ok).toBe(true);expect(first.remaining).toBe(119);
  expect((await rateLimit('actor:write','write')).ok).toBe(false);
 });
 it('rejects malformed and Redis error envelopes',async()=>{
  for(const response of [{error:'ERR'}, {result:['1',60000]}, {result:[1,-1]}]){
   vi.stubGlobal('fetch',async()=>Response.json(response));setRateLimitStore(redisStore('https://redis.invalid','unit-token'));
   expect((await rateLimit('actor:read','read')).ok).toBe(false);
  }
 });
});
