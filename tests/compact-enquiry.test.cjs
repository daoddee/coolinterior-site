const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('WhatsApp contact clicks are consent-gated intent events, separate from saved leads',()=>{
 const source=fs.readFileSync('assets/site.js','utf8').split("  $$('.year')")[0]+'})();';
 function run(consent){const listeners={},events=[];const document={cookie:consent?'cookieyes-consent=analytics:yes':'',querySelector:()=>({}),addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:e=>listeners[e.type]?.(e)};const window={matchMedia:()=>({matches:false}),gtag:(...args)=>events.push(args)};
 vm.runInNewContext(source,{document,window,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}}});listeners.click({target:{closest:()=>({getAttribute:()=> 'https://wa.me/447365155414?text=Hello'})}});return events;}
 assert.equal(run(false).length,0);const events=run(true);assert.equal(events.length,1);assert.equal(events[0][1],'contact_click');assert.equal(events[0][2].contact_channel,'whatsapp');assert.equal(events[0][2].form_variant,'compact');assert.equal(events.some(e=>e[1]==='generate_lead'),false);assert.equal(Object.keys(events[0][2]).length,3);
});
