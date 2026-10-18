(() => {
 const track=document.querySelector('#project-card-track');
 if(!track)return;
 const data=JSON.parse(document.querySelector('#project-gallery-data').textContent);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 document.querySelectorAll('.project-carousel-arrow').forEach(button=>button.addEventListener('click',()=>{
 const direction=button.classList.contains('project-carousel-next')?1:-1;
 const max=track.scrollWidth-track.clientWidth;
 let left=track.scrollLeft+direction*(track.querySelector('article').getBoundingClientRect().width+24);
 if(left>max+5)left=0;else if(left< -5)left=max;
 track.scrollTo({left:Math.max(0,Math.min(max,left)),behavior:reduced?'auto':'smooth'});
 }));
 track.querySelectorAll('.project-showcase').forEach(card=>{
 const button=card.querySelector('.project-cover[data-project]');
 const photos=data[button?.dataset.project]?.photos;
 if(!photos?.length)return;
 const image=button.querySelector('img');
 let timer=null,active=false,generation=0;
 const advance=()=>{
  if(!active||document.hidden||document.querySelector('#tiling-album-dialog[open]'))return;
  const token=generation,next=((Number(button.dataset.photo)||0)+1)%photos.length;
  const photo=photos[next],preload=new Image();
  preload.onload=()=>{
   if(!active||token!==generation)return;
   image.classList.add('preview-fading');
   setTimeout(()=>{
    if(!active||token!==generation)return;
    image.src=photo.src;image.alt=photo.alt;button.dataset.photo=String(next);image.classList.remove('preview-fading');
   },350);
  };
  preload.src=photo.src;
 };
 card.addEventListener('pointerenter',event=>{
  if(event.pointerType==='touch'||reduced||active)return;
  active=true;generation++;timer=setInterval(advance,2000);
 });
 card.addEventListener('pointerleave',()=>{
  active=false;generation++;clearInterval(timer);timer=null;
  image.src=photos[0].src;image.alt=photos[0].alt;button.dataset.photo='0';image.classList.remove('preview-fading');
 });
 });
})();
