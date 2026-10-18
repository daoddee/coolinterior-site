(() => {
 const track=document.querySelector('#project-card-track');
 if(!track)return;
 const data=JSON.parse(document.querySelector('#project-gallery-data').textContent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let paused=reduced,visible=true;
 const toggle=document.querySelector('#project-preview-toggle');
 const sync=()=>{toggle.textContent=paused?'Play photo previews':'Pause photo previews';toggle.setAttribute('aria-pressed',String(paused));};sync();
 toggle.addEventListener('click',()=>{paused=!paused;sync();});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:.05}).observe(track);
 document.querySelectorAll('.project-carousel-arrow').forEach(button=>button.addEventListener('click',()=>{
 const direction=button.classList.contains('project-carousel-next')?1:-1;
 const max=track.scrollWidth-track.clientWidth;
 let left=track.scrollLeft+direction*(track.querySelector('article').getBoundingClientRect().width+24);
 if(left>max+5)left=0;else if(left< -5)left=max;
 track.scrollTo({left:Math.max(0,Math.min(max,left)),behavior:reduced?'auto':'smooth'});
 }));
 setInterval(()=>{
 if(paused||!visible||document.hidden||document.querySelector('#tiling-album-dialog[open]'))return;
 track.querySelectorAll('.project-cover[data-project]').forEach(button=>{
 const photos=data[button.dataset.project]?.photos;if(!photos?.length)return;
 const next=((Number(button.dataset.photo)||0)+1)%photos.length;
 const image=button.querySelector('img'),photo=photos[next],preload=new Image();
 preload.onload=()=>{if(paused)return;image.classList.add('preview-fading');setTimeout(()=>{image.src=photo.src;image.alt=photo.alt;button.dataset.photo=String(next);image.classList.remove('preview-fading');},reduced?0:350);};preload.src=photo.src;
 });
 },5000);
})();
