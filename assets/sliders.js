'use strict';
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-slider]').forEach(slider => {
    const track = slider.querySelector('.slider-track');
    const controls = slider.querySelector('.slider-controls');
    const toggle = slider.querySelector('[data-slide-toggle]');
    if (!track || !controls || !toggle) return;
    controls.hidden = false;
    let paused = reduced.matches, focused = false, visible = false, timer, interactingUntil = 0;
    const sync = () => {
      toggle.textContent = paused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', paused ? 'Start automatic sliding' : 'Pause automatic sliding');
      toggle.setAttribute('aria-pressed', String(paused));
    };
    const step = direction => {
      const card = track.firstElementChild;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const amount = card.getBoundingClientRect().width + gap;
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      let next = track.scrollLeft + amount * direction;
      if (direction > 0 && track.scrollLeft >= max - 3) next = 0;
      else if (direction < 0 && track.scrollLeft <= 3) next = max;
      track.scrollTo({ left: Math.max(0, Math.min(next, max)), behavior: reduced.matches ? 'auto' : 'smooth' });
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || focused || !visible || document.hidden) return;
      timer = setTimeout(() => { if (Date.now() >= interactingUntil) step(1); schedule(); }, track.id === 'reviews-slider' ? 7000 : 9000);
    };
    const manual = direction => { interactingUntil = Date.now() + 8000; step(direction); schedule(); };
    slider.querySelector('[data-slide-prev]').addEventListener('click', () => manual(-1));
    slider.querySelector('[data-slide-next]').addEventListener('click', () => manual(1));
    toggle.addEventListener('click', () => { paused = !paused; sync(); schedule(); });
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); manual(event.key === 'ArrowLeft' ? -1 : 1);
    });
    track.addEventListener('pointerdown', () => { interactingUntil = Date.now() + 8000; schedule(); }, { passive: true });
    slider.addEventListener('focusin', event => { focused = track.contains(event.target) && event.target.matches(':focus-visible'); schedule(); });
    slider.addEventListener('focusout', event => { focused = !!(event.relatedTarget && track.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible')); schedule(); });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; sync(); schedule(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); schedule(); }, { threshold: 0.05 });
      observer.observe(track);
    } else { visible = true; schedule(); }
    sync();
  });
})();
