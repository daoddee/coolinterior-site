(() => {
 const hero=document.querySelector('.hero');
 if(!hero)return;
 const layers=[...hero.querySelectorAll('.hero-image')],toggle=hero.querySelector('.hero-motion-toggle'),caption=hero.querySelector('[data-hero-caption]');
 const config=document.querySelector('#hero-slides-data');
 if(layers.length!==2||!toggle||!config)return;
 let slides;try{slides=JSON.parse(config.textContent)}catch{return}
 if(slides.length<2)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let active=0,index=0,paused=false,timer=null,generation=0;
 const delay=8000;
 layers[0].classList.add('is-active');layers[1].classList.remove('is-active');
 layers[0].setAttribute('aria-hidden','false');layers[1].setAttribute('aria-hidden','true');
 hero.classList.add('slideshow-ready');
 const schedule=()=>{clearTimeout(timer);if(!paused&&!document.hidden&&!reduced.matches)timer=setTimeout(advance,delay)};
 const advance=()=>{
  if(paused||document.hidden||reduced.matches)return;
  const next=(index+1)%slides.length,slide=slides[next],token=++generation,preload=new Image();
  preload.onload=()=>{
   if(token!==generation||paused||document.hidden||reduced.matches)return;
   const incoming=layers[1-active],outgoing=layers[active];
   incoming.src=slide.src;incoming.alt=slide.alt;incoming.style.objectPosition=slide.position||'center';
   incoming.classList.add('is-active');outgoing.classList.remove('is-active');
   incoming.setAttribute('aria-hidden','false');outgoing.setAttribute('aria-hidden','true');
   active=1-active;index=next;if(caption)caption.textContent=slide.caption;schedule();
  };
  preload.onerror=()=>{if(token!==generation)return;index=next;schedule()};
  preload.src=slide.src;
 };
 toggle.addEventListener('click',()=>{
  paused=!paused;generation++;hero.classList.toggle('slideshow-paused',paused);
  toggle.textContent=paused?'Play slideshow':'Pause slideshow';
  toggle.setAttribute('aria-label',toggle.textContent);toggle.setAttribute('aria-pressed',String(paused));schedule();
 });
 document.addEventListener('visibilitychange',()=>{generation++;schedule()});
 const motion=()=>{generation++;schedule()};
 if(reduced.addEventListener)reduced.addEventListener('change',motion);
 schedule();
})();