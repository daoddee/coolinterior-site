(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CICampaign=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const utms=['utm_source','utm_medium','utm_campaign','utm_id','utm_term','utm_content'];
 const clicks=['gclid','gbraid','wbraid'];
 const clean=(v,max=150)=>typeof v==='string'?v.trim().replace(/[<>\x00-\x1f]/g,'').slice(0,max):'';
 function sanitize(raw){
  if(!raw||raw.version!==1||raw.analytics_consent!==true)return {};
  const ads=raw.advertising_consent===true;
  const touch=t=>{
   if(!t||typeof t!=='object')return null;
   const out={};
   for(const k of utms){const v=clean(t[k]);if(v&&!v.includes('@'))out[k]=v;}
   if(ads)for(const k of clicks){const v=clean(t[k],256);if(/^[A-Za-z0-9_.~-]{1,256}$/.test(v))out[k]=v;}
   const path=clean(t.landing_path,200).split(/[?#]/)[0];if(path.startsWith('/')&&!path.startsWith('//'))out.landing_path=path;
   const host=clean(t.referrer_host,120).toLowerCase();if(/^[a-z0-9.-]+$/.test(host))out.referrer_host=host;
   if(typeof t.at==='string'&&Number.isFinite(Date.parse(t.at)))out.at=new Date(t.at).toISOString();
   return out;
  };
  return {version:1,analytics_consent:true,advertising_consent:ads,first:touch(raw.first),last:touch(raw.last)};
 }
 function label(a){const t=a?.last||a?.first;if(!t)return 'Unattributed';return [t.utm_source||(t.gclid||t.gbraid||t.wbraid?'Google Ads':t.referrer_host||'Direct'),t.utm_medium,t.utm_campaign].filter(Boolean).join(' / ');}
 function summarize(records){const groups=new Map();for(const r of records){const key=label(r.attribution);const g=groups.get(key)||{source:key,enquiries:0,qualified:0,won:0,value:0};g.enquiries++;if(r.qualified_at||['Site visit','Quoted','Won'].includes(r.status))g.qualified++;if(r.status==='Won'){g.won++;g.value+=Number(r.value)||0;}groups.set(key,g);}return [...groups.values()].sort((a,b)=>b.won-a.won||b.enquiries-a.enquiries);}
 return {utms,clicks,sanitize,label,summarize};
});
