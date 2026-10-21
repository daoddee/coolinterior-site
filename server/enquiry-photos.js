'use strict';
const crypto=require('node:crypto');
const {HttpError,safeEqual,sign}=require('./enquiries-core');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_PHOTOS=5,MAX_BYTES=2*1024*1024;
function ticket(record,secret){return sign({role:'photo-upload',enquiryId:record.id,requestId:record.request_id,exp:Date.now()+30*60000},secret);}
function claims(token,secret){
 try{if(typeof token!=='string'||token.length>1200)throw Error();const [data,sig,...rest]=token.split('.');if(rest.length||!safeEqual(crypto.createHmac('sha256',secret).update(data).digest('base64url'),sig))throw Error();const p=JSON.parse(Buffer.from(data,'base64url'));if(p.role!=='photo-upload'||!UUID.test(p.enquiryId)||!UUID.test(p.requestId)||p.exp<=Date.now()||p.exp>Date.now()+31*60000)throw Error();return p;}catch{throw new HttpError(403,'Your photo upload session expired. Please retry Submit enquiry to renew it.');}
}
function plan(enquiryId,input,existing=[]){
 if(!Array.isArray(input)||input.length>MAX_PHOTOS)throw new HttpError(400,'Choose up to five photos.');
 const ids=new Set();
 return input.map(p=>{
  if(!p||!UUID.test(p.id)||ids.has(p.id)||!Number.isInteger(p.size)||p.size<1||p.size>MAX_BYTES||p.type!=='image/jpeg'||typeof p.name!=='string'||p.name.length>120)throw new HttpError(400,'Please choose valid photos within the upload limits.');
  ids.add(p.id);const old=existing.find(x=>x.id===p.id);
  return {id:p.id,path:enquiryId+'/'+p.id+'.jpg',name:p.name.replace(/[<>\x00-\x1f]/g,'').trim()||'Project photo.jpg',size:p.size,type:'image/jpeg',status:old?.status==='uploaded'?'uploaded':'pending'};
 });
}
module.exports={ticket,claims,plan,UUID,MAX_PHOTOS,MAX_BYTES};
