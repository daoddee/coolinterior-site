const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const photos=require('../server/enquiry-photos'),core=require('../server/enquiries-core'),handler=require('../api/enquiries');
const secret='p'.repeat(48),id=crypto.randomUUID(),request_id=crypto.randomUUID(),file={id:crypto.randomUUID(),name:'Bathroom.jpg',size:2048,type:'image/jpeg'};
test('photo tickets are scoped, expiring and cannot become owner sessions',()=>{const token=photos.ticket({id,request_id},secret);assert.equal(photos.claims(token,secret).enquiryId,id);assert.equal(core.verify(token,secret),false);assert.throws(()=>photos.claims(token+'x',secret));assert.throws(()=>photos.claims(token,'q'.repeat(48)));assert.throws(()=>photos.claims(core.sign({role:'photo-upload',enquiryId:id,requestId:request_id,exp:Date.now()-1},secret),secret));assert.throws(()=>photos.claims(core.sign({role:'owner',enquiryId:id,requestId:request_id,exp:Date.now()+1000},secret),secret));});
test('reservation caps files, prevents arbitrary paths and rejects unsafe formats',()=>{const plan=photos.plan(id,[{...file,path:'../../elsewhere'}]);assert.equal(plan[0].path,id+'/'+file.id+'.jpg');assert.equal(plan[0].status,'pending');assert.throws(()=>photos.plan(id,Array.from({length:6},()=>({...file,id:crypto.randomUUID()}))));assert.throws(()=>photos.plan(id,[file,file]));assert.throws(()=>photos.plan(id,[{...file,size:2097153}]));assert.throws(()=>photos.plan(id,[{...file,type:'image/svg+xml'}]));assert.equal(photos.plan(id,[file],[{...file,status:'uploaded'}])[0].status,'uploaded');});
function response(){return{code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.result=v;return this}};}
function req(action,body,method='POST',cookie){return{url:'/api/enquiries?action='+action,method,body,headers:{host:'www.coolinterior.co.uk',origin:'https://www.coolinterior.co.uk','content-type':'application/json',...(cookie?{cookie}:{})}};}
test('private upload flow reserves, verifies and reads photos only for signed-in owner',async()=>{
 process.env.PANEL_GATEWAY_URL='https://gateway.test';process.env.PANEL_GATEWAY_SECRET='test';process.env.PANEL_SESSION_SECRET=secret;process.env.ENQUIRIES_ENABLED='true';
 const original=global.fetch;let record={id,request_id,version:1,photos:[]},size=file.size;const calls=[];
 global.fetch=async(url,opts)=>{const q=JSON.parse(opts.body);calls.push(q.path);let data=[];
  if(q.path==='rpc/ci_take_rate')data=true;
  else if(q.path.startsWith('ci_panel_owner?'))data=[{password_hash:'configured',session_version:1}];
  else if(q.path.startsWith('ci_enquiries?')){if(q.method==='PATCH')record={...record,...JSON.parse(q.body)};data=q.path.includes('request_id=eq.')&&!q.path.includes(request_id)?[]:[record];}
  else if(q.path==='storage/sign-upload'||q.path==='storage/sign-read')data=JSON.parse(q.body).paths.map(path=>({path,signedUrl:'https://project.supabase.co/storage/signed-test'}));
  else if(q.path==='storage/verify')data=JSON.parse(q.body).paths.map(path=>({path,size}));
  return{ok:true,status:200,json:async()=>data};};
 const token=photos.ticket(record,secret),cookie='__Host-ci_panel='+core.sign({role:'owner',version:1,exp:Date.now()+60000},secret);
 try{
  let r=response();await handler(req('photo-prepare',{token:'invalid',photos:[file]}),r);assert.equal(r.code,403);assert.equal(record.photos.length,0);
  r=response();await handler(req('photo-prepare',{token,photos:[file]}),r);assert.equal(r.code,200);assert.equal(record.photos[0].status,'pending');assert.equal(r.result.uploads[0].id,file.id);
  size=99;r=response();await handler(req('photo-complete',{token}),r);assert.equal(r.code,409);assert.equal(record.photos[0].status,'pending');
  size=file.size;r=response();await handler(req('photo-complete',{token}),r);assert.equal(r.code,200);assert.equal(record.photos[0].status,'uploaded');
  r=response();await handler(req('photos&id='+id,null,'GET'),r);assert.equal(r.code,401);
  r=response();await handler(req('photos&id='+id,null,'GET',cookie),r);assert.equal(r.code,200);assert.equal(r.result.photos.length,1);assert.equal(r.result.expiresIn,600);
  const stolen=photos.ticket({id,request_id:crypto.randomUUID()},secret);r=response();await handler(req('photo-prepare',{token:stolen,photos:[file]}),r);assert.equal(r.code,404);
 }finally{global.fetch=original;}
});
test('service selection accepts the form labels',()=>{const b={name:'Test Customer',location:'NW10',details:'A bathroom project to discuss',email:'test@example.invalid',requestId:crypto.randomUUID(),services:['Natural Stone Installation']};assert.deepEqual(core.validateEnquiry(b).services,['Natural stone installation']);});
