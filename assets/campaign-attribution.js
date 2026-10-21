(()=>{
 'use strict';
 const core=window.CICampaign,key='ci_campaign_v1',ttl=90*86400000;
 if(!core)return;
 let analytics=false,advertising=false,state=null;
 const params=new URLSearchParams(location.search);
 let host='';try{const ref=new URL(document.referrer);if(ref.origin!==location.origin)host=ref.hostname;}catch{}
 const landing={at:new Date().toISOString(),landing_path:location.pathname,...(host?{referrer_host:host}:{})};
 for(const k of [...core.utms,...core.clicks])if(params.has(k))landing[k]=params.get(k);
 const campaign=core.utms.concat(core.clicks).some(k=>landing[k]);
 const clear=()=>{state=null;try{localStorage.removeItem(key);}catch{}};
 function refresh(){
  if(!analytics){clear();return;}
  let saved=null;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
  if(!saved||!Number.isFinite(saved.expires)||saved.expires<=Date.now())saved=null;
  const previous=state||saved?.data;
  state=core.sanitize({version:1,analytics_consent:true,advertising_consent:advertising,first:previous?.first||landing,last:campaign||host?landing:previous?.last||landing});
  // Preserve the original expiry across navigation and consent changes.
  try{localStorage.setItem(key,JSON.stringify({expires:saved?.expires||Date.now()+ttl,data:state}));}catch{}
 }
 function consent(event){
  if(Array.isArray(event?.detail?.accepted)){analytics=event.detail.accepted.includes('analytics');advertising=event.detail.accepted.includes('advertisement');}
  else{let cookie='';try{cookie=decodeURIComponent((document.cookie.split('; ').find(x=>x.startsWith('cookieyes-consent='))||'').split('=').slice(1).join('='));}catch{}analytics=/(?:^|,)analytics:yes(?:,|$)/.test(cookie);advertising=/(?:^|,)advertisement:yes(?:,|$)/.test(cookie);}
  refresh();
 }
 document.addEventListener('cookieyes_consent_update',consent);document.addEventListener('cookieyes_banner_load',consent);
 window.CIAttribution={get:()=>analytics?core.sanitize(state):{}};
 consent();
})();
