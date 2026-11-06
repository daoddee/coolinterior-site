(()=>{
 'use strict';
 const name='cookieyes-consent';
 let panel,settingsButton,choice=null,loaded=false;
 try{const raw=decodeURIComponent((document.cookie.split('; ').find(c=>c.startsWith(name+'='))||'').slice(name.length+1));if(/(?:^|,)analytics:(yes|no)(?:,|$)/.test(raw))choice={analytics:/(?:^|,)analytics:yes(?:,|$)/.test(raw),advertising:/(?:^|,)advertisement:yes(?:,|$)/.test(raw)};}catch{}
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
 const consent=c=>({analytics_storage:c?.analytics?'granted':'denied',ad_storage:c?.advertising?'granted':'denied',ad_user_data:c?.advertising?'granted':'denied',ad_personalization:c?.advertising?'granted':'denied'});
 window.gtag('consent','default',consent(choice));
 function announce(){document.dispatchEvent(new CustomEvent('cookieyes_consent_update',{detail:{accepted:['necessary',...(choice?.analytics?['analytics']:[]),...(choice?.advertising?['advertisement']:[])]}}));}
 function apply(){
  window.gtag('consent','update',consent(choice));
  if((choice?.analytics||choice?.advertising)&&!loaded){
   loaded=true;window.gtag('js',new Date());
   const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id=G-CMTEW5X2MT';document.head.appendChild(script);
  }
  if(choice?.analytics)window.gtag('config','G-CMTEW5X2MT');
  if(choice?.advertising)window.gtag('config','AW-18513281099');
  if(!choice?.analytics||!choice?.advertising){for(const item of document.cookie.split('; ')){const key=item.split('=')[0];if((!choice?.analytics&&/^_ga(?:_|$)|^_gid$|^_gat/.test(key))||(!choice?.advertising&&/^_gcl_/.test(key))){for(const domain of ['',location.hostname,'.coolinterior.co.uk'])document.cookie=key+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'');}}}
  announce();
 }
 function save(analytics,advertising){
  choice={analytics,advertising};
  document.cookie=name+'='+encodeURIComponent('consent:yes,necessary:yes,analytics:'+(analytics?'yes':'no')+',advertisement:'+(advertising?'yes':'no'))+'; Max-Age=15552000; Path=/; SameSite=Lax; Secure';
  apply();panel.hidden=true;settingsButton.focus();
 }
 function open(){panel.hidden=false;panel.querySelector('[data-analytics]').checked=!!choice?.analytics;panel.querySelector('[data-advertising]').checked=!!choice?.advertising;panel.querySelector('button').focus();}
 function mount(){
  const style=document.createElement('style');style.textContent=`#ci-cookies{position:fixed;bottom:16px;left:16px;right:16px;max-width:700px;max-height:85vh;overflow:auto;padding:24px;background:#fffdf8;color:#242a27;border:1px solid #c5c2b8;border-radius:12px;box-shadow:0 8px 40px #0003;z-index:2147483646;font:15px/1.5 Arial,sans-serif}#ci-cookies[hidden]{display:none}#ci-cookies h2{font-size:22px;margin:0 0 8px}#ci-cookies p{margin:8px 0 16px}#ci-cookies .ci-cookie-actions{display:flex;gap:10px;flex-wrap:wrap}#ci-cookies button,#ci-cookie-settings{font:inherit;padding:10px 16px;border:1px solid #344b3d;border-radius:6px;background:#fff;color:#243b2c;cursor:pointer}#ci-cookies label{display:block;margin:12px 0}#ci-cookies input{width:18px;height:18px;vertical-align:middle;margin-right:8px}#ci-cookie-settings{position:fixed;bottom:12px;left:12px;z-index:2147483645;font:13px Arial,sans-serif;box-shadow:0 2px 10px #0002}#ci-cookies button:focus-visible,#ci-cookie-settings:focus-visible{outline:3px solid #ad772c;outline-offset:3px}@media(max-width:480px){#ci-cookies{padding:18px;bottom:10px;left:10px;right:10px}#ci-cookies .ci-cookie-actions button{flex:1 1 100%}}`;
  document.head.appendChild(style);
  settingsButton=document.createElement('button');settingsButton.type='button';settingsButton.id='ci-cookie-settings';settingsButton.textContent='Cookie settings';settingsButton.addEventListener('click',open);document.body.appendChild(settingsButton);
  panel=document.createElement('section');panel.id='ci-cookies';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','ci-cookie-title');panel.innerHTML='<h2 id="ci-cookie-title">Your cookie choices</h2><p>Essential cookies keep enquiries and secure areas working. With your permission, analytics cookies help us understand visits and how customers found us. Advertising cookies support Google advertising measurement. You can use our website and submit enquiries without accepting either.</p><div class="ci-cookie-actions"><button type="button" data-accept>Accept all</button><button type="button" data-reject>Reject optional</button><button type="button" data-customise aria-expanded="false">Choose cookies</button></div><div data-options hidden><label><input type="checkbox" checked disabled>Essential (always on)</label><label><input type="checkbox" data-analytics>Analytics and enquiry source measurement</label><label><input type="checkbox" data-advertising>Advertising measurement</label><button type="button" data-save>Save choices</button></div><p style="margin-bottom:0;font-size:13px">Change your choice at any time using Cookie settings.</p>';
  document.body.appendChild(panel);
  panel.querySelector('[data-accept]').addEventListener('click',()=>save(true,true));panel.querySelector('[data-reject]').addEventListener('click',()=>save(false,false));panel.querySelector('[data-save]').addEventListener('click',()=>save(panel.querySelector('[data-analytics]').checked,panel.querySelector('[data-advertising]').checked));panel.querySelector('[data-customise]').addEventListener('click',e=>{panel.querySelector('[data-options]').hidden=false;e.target.setAttribute('aria-expanded','true');panel.querySelector('[data-analytics]').focus();});
  apply();if(!choice)open();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
