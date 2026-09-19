import test from 'node:test';import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
const {start}=await import('../backend/src/server.ts');
const server=await start(0);await new Promise<void>(r=>server.once('listening',()=>r()));const address=server.address() as any;const base=`http://127.0.0.1:${address.port}`;
test('health contract',async()=>{const r=await fetch(base+'/api/health');assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,service:'thinktank-academia'})});
test('register, profile, and validation',async()=>{const r=await fetch(base+'/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Ada Reader',email:'ada@example.com',password:'strong-password'})});assert.equal(r.status,201);const j:any=await r.json();assert.ok(j.data.token);const me=await fetch(base+'/api/v1/users/me',{headers:{authorization:`Bearer ${j.data.token}`}});assert.equal(me.status,200);assert.equal((await me.json()).data.email,'ada@example.com');const bad=await fetch(base+'/api/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(bad.status,400)});
test.after(()=>server.close());
