(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const image = hero.querySelector('.hero-image-secondary');
  const toggle = hero.querySelector('.hero-motion-toggle');
  if (!image || !toggle) return;
  const ready = () => { if (image.naturalWidth) hero.classList.add('slideshow-ready'); };
  if (image.complete) ready(); else image.addEventListener('load', ready, { once: true });
  toggle.addEventListener('click', () => {
    const paused = hero.classList.toggle('slideshow-paused');
    toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
    toggle.setAttribute('aria-label', toggle.textContent);
    toggle.setAttribute('aria-pressed', String(paused));
  });
})();
