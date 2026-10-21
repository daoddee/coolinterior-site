'use strict';
const crypto = require('node:crypto');
const {STAGES,PRIORITIES,HttpError,text,validateEnquiry,sign,verify,verifyPassword}=require('../server/enquiries-core');
const COOKIE='__Host-ci_panel';
const ready=()=>!!(process.env.PANEL_GATEWAY_URL && process.env.PANEL_GATEWAY_SECRET && process.env.PANEL_SESSION_SECRET?.length>=32);
const enabled=()=>ready() && String(process.env.ENQUIRIES_ENABLED||'').trim().toLowerCase()==='true';
function connectionError(code) {
  const error=new HttpError(503,'The enquiry service is temporarily unavailable. Please try again or contact us directly.');
  error.connectionCode=code;return error;
}
async function db(path,options={}) {
  let endpoint;
  try {endpoint=new URL(process.env.PANEL_GATEWAY_URL.trim());if(endpoint.protocol!=='https:')throw new Error();}
  catch {throw connectionError('invalid_gateway_url');}
  let response;
  try {
    response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.PANEL_GATEWAY_SECRET.trim(),'Content-Type':'application/json'},body:JSON.stringify({path,method:options.method||'GET',body:options.body,prefer:options.headers?.Prefer})});
  } catch(error) {throw connectionError(error.name==='TimeoutError'?'gateway_timeout':'gateway_network_error');}
  if(!response.ok)throw connectionError([401,403].includes(response.status)?'gateway_credential_mismatch':response.status===503?'gateway_configuration_missing':'gateway_database_error');
  if(response.status===204)return null;
  try{return await response.json();}catch{throw connectionError('invalid_gateway_response');}
}
async function rate(req,kind,max) {
  const ip=String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key=crypto.createHmac('sha256',process.env.PANEL_SESSION_SECRET).update(kind+':'+ip).digest('hex');
  const allowed=await db('rpc/ci_take_rate',{method:'POST',body:JSON.stringify({p_key:key,p_limit:max,p_window:900})});
  if(!allowed) throw new HttpError(429,'Too many attempts. Please try again in 15 minutes.');
}
function originCheck(req) {
  const origin=req.headers.origin;
  if(!origin) throw new HttpError(403,'Please submit from the Cool Interior website.');
  let url; try{url=new URL(origin);}catch{throw new HttpError(403,'Invalid origin.');}
  if(url.protocol!=='https:' || url.host!==req.headers.host) throw new HttpError(403,'Please submit from the Cool Interior website.');
}
function cookie(req) { return String(req.headers.cookie||'').split('; ').find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''; }
async function owner() {return (await db('ci_panel_owner?id=eq.owner&select=*'))[0];}
async function session(req) {
  const token=cookie(req);if(!verify(token,process.env.PANEL_SESSION_SECRET))throw new HttpError(401,'Please sign in to continue.');
  const claims=JSON.parse(Buffer.from(token.split('.')[0],'base64url'));
  const account=await owner();if(!account?.password_hash||claims.version!==account.session_version)throw new HttpError(401,'Please sign in to continue.');
  return account;
}
function loginCookie(res,version){setCookie(res,sign({role:'owner',version,exp:Date.now()+8*3600000,nonce:crypto.randomBytes(16).toString('hex')},process.env.PANEL_SESSION_SECRET),28800);}
function passwordHash(password){if(typeof password!=='string'||password.length<14||password.length>256)throw new HttpError(400,'Choose a password of at least 14 characters. A long, unique passphrase works well.');const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex');} 
function setCookie(res,value,age) {res.setHeader('Set-Cookie',`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);}
function body(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json')) throw new HttpError(415,'JSON requests only.');
  let b=req.body; if(typeof b==='string') {if(Buffer.byteLength(b)>16384)throw new HttpError(413,'Enquiry too large.');try{b=JSON.parse(b);}catch{throw new HttpError(400,'Invalid request.');}}
  if(!b||typeof b!=='object'||Array.isArray(b)||Buffer.byteLength(JSON.stringify(b))>16384)throw new HttpError(400,'Invalid request.');return b;
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const action=new URL(req.url,'https://local.invalid').searchParams.get('action')||'submit';
  try {
    if(req.method==='GET'&&action==='health') {
      let accepting=false,connection='configuration_missing';
      if(ready()) {
        try {
          await db('ci_enquiries?select=id&limit=0');
          const hasOwner=!!(await owner())?.password_hash;
          connection=!hasOwner?'owner_setup_required':enabled()?'ready':'enquiries_disabled';
          accepting=hasOwner&&enabled();
        } catch(error) {connection=error.connectionCode||'service_unavailable';}
      }
      return res.status(200).json({accepting,connection,version:'connection-check-v1'});
    }
    if(!ready()) throw new HttpError(503,'The team panel is awaiting its secure database connection.');
    if(!['GET','POST','PATCH','DELETE'].includes(req.method)) {res.setHeader('Allow','GET, POST, PATCH, DELETE');throw new HttpError(405,'Method not allowed.');}
    if(req.method!=='GET')originCheck(req);
    if(action==='setup'&&req.method==='POST') {
      await rate(req,'setup',8);const b=body(req),account=await owner();
      const token=text(b.token,100,true);const digest=crypto.createHash('sha256').update(token).digest('hex');
      if(!account||account.password_hash||!account.setup_token_hash||digest!==account.setup_token_hash)throw new HttpError(403,'This setup link is invalid or has already been used.');
      const hash=passwordHash(b.password);
      const changed=await db('ci_panel_owner?id=eq.owner&password_hash=is.null',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({password_hash:hash,setup_token_hash:null})});
      if(!changed.length)throw new HttpError(409,'Setup has already been completed. Please sign in.');
      loginCookie(res,changed[0].session_version);return res.status(200).json({ok:true});
    }
    if(action==='login'&&req.method==='POST') {
      await rate(req,'login',8);const b=body(req);const password=text(b.password,256,true);
      const account=await owner();if(!account?.password_hash||!verifyPassword(password,account.password_hash))throw new HttpError(401,'Incorrect password or workspace not yet activated.');
      loginCookie(res,account.session_version);
      return res.status(200).json({ok:true});
    }
    if(action==='logout'&&req.method==='POST'){setCookie(res,'',0);return res.status(200).json({ok:true});}
    if(action==='submit'&&req.method==='POST') {
      if(!enabled())throw new HttpError(503,'Online enquiries are temporarily unavailable. Your brief has not been sent. Please try again shortly.');
      await rate(req,'submit',8);const b=body(req);if(b.website)throw new HttpError(400,'Please try again.');const data=validateEnquiry(b);
      // The unique request ID makes safe retries return the original acknowledgement.
      const record={...data,id:crypto.randomUUID(),reference:'CI-'+crypto.randomBytes(5).toString('hex').toUpperCase(),activity:[{at:new Date().toISOString(),message:'Enquiry received from website'}]};
      const rows=await db('ci_enquiries?on_conflict=request_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(record)});
      const saved=rows[0] || (await db('ci_enquiries?request_id=eq.'+encodeURIComponent(data.request_id)+'&select=reference'))[0];
      if(!saved)throw new HttpError(503,'Unable to confirm delivery. Please retry.');
      return res.status(201).json({reference:saved.reference});
    }
    const account=await session(req);
    if(action==='password'&&req.method==='POST') {
      await rate(req,'password',8);const b=body(req);
      if(!verifyPassword(text(b.current,256,true),account.password_hash))throw new HttpError(400,'Current password is incorrect.');
      const hash=passwordHash(b.password),version=account.session_version+1;
      const changed=await db('ci_panel_owner?id=eq.owner&session_version=eq.'+account.session_version,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({password_hash:hash,session_version:version})});
      if(!changed.length)throw new HttpError(409,'Account changed. Please sign in again.');
      loginCookie(res,version);return res.status(200).json({ok:true});
    }
    if(action==='session'&&req.method==='GET')return res.status(200).json({ok:true});
    if(action==='list'&&req.method==='GET') {
      const query=new URL(req.url,'https://local.invalid').searchParams;
      const before=query.get('before');let filter='';
      if(before){const beforeId=query.get('before_id');if(!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(before)||!/^[a-f0-9-]{36}$/i.test(beforeId||''))throw new HttpError(400,'Invalid page.');filter='&or='+encodeURIComponent('(created_at.lt.'+before+',and(created_at.eq.'+before+',id.lt.'+beforeId+'))');}
      const rows=await db('ci_enquiries?select=*&order=created_at.desc,id.desc&limit=101'+filter);
      return res.status(200).json({records:rows.slice(0,100),more:rows.length>100});
    }
    if(action==='update'&&req.method==='PATCH') {
      const b=body(req);if(!/^[a-f0-9-]{36}$/i.test(b.id||'')||!Number.isInteger(b.version))throw new HttpError(400,'Invalid enquiry.');
      const old=(await db('ci_enquiries?id=eq.'+b.id+'&limit=1'))[0];if(!old)throw new HttpError(404,'Enquiry not found.');
      if(!STAGES.includes(b.status)||!PRIORITIES.includes(b.priority))throw new HttpError(400,'Invalid stage or priority.');
      const owner=text(b.owner,80), note=text(b.note,2000), followUp=text(b.follow_up,10);
      if(followUp&&(!/^\d{4}-\d{2}-\d{2}$/.test(followUp)||Number.isNaN(Date.parse(followUp))))throw new HttpError(400,'Invalid follow-up date.');
      const value=b.value===''||b.value===null?null:Number(b.value);if(value!==null&&(!Number.isFinite(value)||value<0||value>10000000))throw new HttpError(400,'Enter a valid quote value.');
      const activity=[...old.activity];const now=new Date().toISOString();
      const qualifiedAt=old.qualified_at||(['Site visit','Quoted','Won'].includes(b.status)?now:null);
      if(old.status!==b.status)activity.push({at:now,message:`Stage changed from ${old.status} to ${b.status}`});
      if(old.priority!==b.priority)activity.push({at:now,message:`Priority changed to ${b.priority}`});
      if(old.owner!==owner)activity.push({at:now,message:'Assigned to '+(owner||'unassigned')});
      if(old.follow_up!==(followUp||null))activity.push({at:now,message:'Follow-up '+(followUp||'cleared')});
      if(old.value!==value)activity.push({at:now,message:'Quote value '+(value===null?'cleared':'updated to £'+value)});
      if(note)activity.push({at:now,message:note,type:'note'});
      const updated=await db('ci_enquiries?id=eq.'+b.id+'&version=eq.'+b.version,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:b.status,priority:b.priority,owner,follow_up:followUp||null,value,qualified_at:qualifiedAt,activity:activity.slice(-300),version:b.version+1,updated_at:now})});
      if(!updated.length)throw new HttpError(409,'This enquiry changed in another session. Refresh before saving.');
      return res.status(200).json({record:updated[0]});
    }
    if(action==='delete'&&req.method==='DELETE') {
      const b=body(req);if(!/^[a-f0-9-]{36}$/i.test(b.id||'')||!b.reference)throw new HttpError(400,'Invalid enquiry.');
      const rows=await db('ci_enquiries?id=eq.'+b.id+'&reference=eq.'+encodeURIComponent(b.reference),{method:'DELETE',headers:{Prefer:'return=representation'}});
      if(!rows.length)throw new HttpError(404,'Enquiry not found.');return res.status(200).json({ok:true});
    }
    throw new HttpError(405,'Method not allowed.');
  } catch(error) {return res.status(error.status||503).json({error:error.status?error.message:'The service is temporarily unavailable. Please try again.'});}
};
