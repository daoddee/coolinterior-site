(()=>{
 'use strict';
 const region=document.querySelector('.hero-rotation');if(!region)return;
 const slides=[...region.querySelectorAll('.hero-slide')],button=region.querySelector('.hero-rotation-toggle');
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let current=0,timer=null,paused=motion.matches;
 function stop(){clearTimeout(timer);timer=null;}
 function schedule(){stop();if(paused||document.hidden)return;timer=setTimeout(async()=>{const next=(current+1)%slides.length;const photo=slides[next];try{await photo.decode();}catch{schedule();return;}if(paused||document.hidden)return;slides[current].classList.remove('is-active');slides[current].setAttribute('aria-hidden','true');photo.classList.add('is-active');photo.setAttribute('aria-hidden','false');current=next;schedule();},8000);}
 function update(){region.classList.toggle('is-paused',paused);button.textContent=paused?'Play slideshow':'Pause slideshow';button.setAttribute('aria-pressed',String(paused));schedule();}
 button.addEventListener('click',()=>{paused=!paused;update();});
 document.addEventListener('visibilitychange',schedule);
 motion.addEventListener('change',()=>{paused=motion.matches;update();});update();
})();
