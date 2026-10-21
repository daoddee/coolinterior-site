(()=>{
 'use strict';
 const form=document.querySelector('#quote-form'),step=form?.querySelector('[data-step="2"]');
 if(!step)return;
 const MAX=5,MAX_SOURCE=10*1024*1024,MAX_UPLOAD=2*1024*1024;
 let photos=[],processing=false,uploading=false,attempted=false,problem='';
 const box=document.createElement('div');box.className='enquiry-photo-picker';
 box.innerHTML='<label for="project-photos">Project photos <span>(optional)</span></label><p id="photo-help">Add up to 5 photos, up to 10 MB each. JPG, PNG and WebP are supported. Photos are resized and location metadata is removed before upload.</p><input id="project-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple aria-describedby="photo-help photo-status"><div id="photo-previews" class="enquiry-photo-grid"></div><p id="photo-status" role="status"></p>';
 step.querySelector('.form-navigation').before(box);
 const input=box.querySelector('input'),previews=box.querySelector('#photo-previews'),status=box.querySelector('#photo-status');
 const review=document.createElement('p');review.className='enquiry-photo-review';document.querySelector('#enquiry-ready .ready-actions').before(review);
 const update=()=>{
  input.disabled=processing||uploading;previews.replaceChildren();
  photos.forEach(p=>{const fig=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),remove=document.createElement('button');img.src=p.preview;img.alt='Selected project photo: '+p.name;caption.textContent=p.name;remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+p.name);remove.disabled=processing||uploading;remove.addEventListener('click',()=>{URL.revokeObjectURL(p.preview);photos=photos.filter(x=>x.id!==p.id);problem='';update();});fig.append(img,caption,remove);previews.append(fig);});
  status.textContent=problem||(processing?'Preparing photos…':photos.length?photos.length+' of 5 photos selected. Photos will upload when you submit your enquiry.':'You can submit without photos.');
  review.textContent=photos.length?photos.length+' project photo'+(photos.length===1?'':'s')+' selected.':'No photos selected.';
 };
 async function convert(file){
  if(file.size>MAX_SOURCE)throw Error(file.name+' is larger than 10 MB. Choose a smaller photo.');
  if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
  const url=URL.createObjectURL(file),image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This photo could not be opened. Save it as JPG, PNG or WebP and try again.'));image.src=url;});
   if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>60000000)throw Error('This photo is too large to prepare. Choose a smaller image.');
   const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo preparation is unavailable in this browser.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   let blob;for(const quality of [.84,.68,.5]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=MAX_UPLOAD)break;}
   if(!blob||blob.size>MAX_UPLOAD)throw Error('This photo could not be resized. Choose a smaller image.');
   const name=(file.name.replace(/\.[^.]+$/,'').replace(/[<>\x00-\x1f]/g,'').slice(0,110)||'Project photo')+'.jpg';
   return {id:crypto.randomUUID(),name,blob,preview:URL.createObjectURL(blob)};
  }finally{URL.revokeObjectURL(url);}
 }
 input.addEventListener('change',async()=>{
  const files=[...input.files];input.value='';problem='';
  if(files.length+photos.length>MAX){problem='Choose up to 5 photos in total. Remove a photo before adding another.';update();return;}
  processing=true;update();
  try{for(const file of files)photos.push(await convert(file));}catch(error){problem=error.message;}finally{processing=false;update();}
 });
 async function api(action,data){const response=await fetch('/api/enquiries?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});const body=await response.json();if(!response.ok)throw Error(body.error||'Photo upload unavailable.');return body;}
 async function upload({token,reference,onProgress}){
  if(processing)throw Error('Please wait for your photos to finish preparing.');
  if(!photos.length){if(attempted)await api('photo-prepare',{token,photos:[]});return 0;}
  attempted=true;
  uploading=true;update();
  try{
   const selected=[...photos];const prepared=await api('photo-prepare',{token,photos:selected.map(p=>({id:p.id,name:p.name,size:p.blob.size,type:'image/jpeg'}))});
   for(let i=0;i<selected.length;i++){
    const p=selected[i],target=prepared.uploads.find(x=>x.id===p.id);if(!target)throw Error('Photo upload could not be prepared.');
    onProgress?.('Your enquiry '+reference+' is saved. Uploading photo '+(i+1)+' of '+selected.length+'…');
    if(target.uploaded)continue;
    const url=new URL(target.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Photo upload address is unavailable.');
    const result=await fetch(url,{method:'PUT',headers:{'Content-Type':'image/jpeg','Cache-Control':'3600'},body:p.blob,signal:AbortSignal.timeout(60000)});
    // A retry can encounter an existing object after an earlier request timed out.
    if(!result.ok&&![400,409].includes(result.status))throw Error('Photo '+(i+1)+' did not finish uploading.');
   }
   const confirmed=await api('photo-complete',{token});return confirmed.count;
  }finally{uploading=false;update();}
 }
 window.CIPhotos={isPreparing:()=>processing,count:()=>photos.length,refresh:update,upload};update();
})();
