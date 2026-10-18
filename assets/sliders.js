'use strict';
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-slider]').forEach(slider => {
    const track = slider.querySelector('.slider-track');
    const controls = slider.querySelector('.slider-controls');
    const toggle = slider.querySelector('[data-slide-toggle]');
    if (!track || !controls || !toggle) return;
    controls.hidden = false;
    let paused = reduced.matches, hovered = false, focused = false, visible = false, timer;
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
      if (paused || hovered || focused || !visible || document.hidden) return;
      timer = setTimeout(() => { step(1); schedule(); }, track.id === 'reviews-slider' ? 15000 : 10000);
    };
    const manual = direction => { paused = true; sync(); step(direction); schedule(); };
    slider.querySelector('[data-slide-prev]').addEventListener('click', () => manual(-1));
    slider.querySelector('[data-slide-next]').addEventListener('click', () => manual(1));
    toggle.addEventListener('click', () => { paused = !paused; sync(); schedule(); });
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); manual(event.key === 'ArrowLeft' ? -1 : 1);
    });
    track.addEventListener('pointerdown', () => { paused = true; sync(); schedule(); }, { passive: true });
    slider.addEventListener('mouseenter', () => { hovered = true; schedule(); });
    slider.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    slider.addEventListener('focusin', () => { focused = true; schedule(); });
    slider.addEventListener('focusout', event => { if (!slider.contains(event.relatedTarget)) { focused = false; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; sync(); schedule(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); schedule(); }, { threshold: 0.2 });
      observer.observe(slider);
    } else { visible = true; schedule(); }
    sync();
  });
})();
