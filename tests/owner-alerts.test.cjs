const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const core=require('../server/enquiries-core'),handler=require('../api/enquiries');
test('owner alert APIs require a valid owner session and validate read IDs',async()=>{
 const secret='a'.repeat(48);process.env.PANEL_GATEWAY_URL='https://gateway.test';process.env.PANEL_GATEWAY_SECRET='test';process.env.PANEL_SESSION_SECRET=secret;
 const old=global.fetch,calls=[];const id=crypto.randomUUID();
 global.fetch=async(u,o)=>{const q=JSON.parse(o.body);calls.push(q);return {ok:true,status:200,json:async()=>q.path.startsWith('ci_panel_owner?')?[{password_hash:'configured',session_version:1}]:q.path==='rpc/ci_owner_alert_summary'?{unread:1,items:[{id}]}:q.path.startsWith('ci_enquiries?')?[{id}]:1};};
 const request=(action,method='GET',body,cookie)=>({url:'/api/enquiries?action='+action,method,body,headers:{host:'www.coolinterior.co.uk',origin:'https://www.coolinterior.co.uk','content-type':'application/json',cookie:cookie||''}});
 const response=()=>({code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.result=v;return this;}});
 const cookie='__Host-ci_panel='+core.sign({role:'owner',version:1,exp:Date.now()+60000},secret);
 try{let r=response();await handler(request('alerts'),r);assert.equal(r.code,401);assert.equal(calls.length,0);
 r=response();await handler(request('alerts','GET',null,cookie),r);assert.equal(r.code,200);assert.equal(r.result.unread,1);
 r=response();await handler(request('alerts-read','POST',{ids:['invalid']},cookie),r);assert.equal(r.code,400);
 r=response();await handler(request('alerts-read','POST',{ids:[id]},cookie),r);assert.equal(r.code,200);assert.deepEqual(JSON.parse(calls.at(-1).body),{p_ids:[id]});
 r=response();await handler(request('record&id='+id,'GET',null,cookie),r);assert.equal(r.result.record.id,id);
 }finally{global.fetch=old;}
});
