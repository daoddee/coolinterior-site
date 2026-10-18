'use strict';
(() => {
  const section = document.querySelector('#our-numbers');
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const counters = [...section.querySelectorAll('[data-count-to]')];
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    const started = performance.now();
    const render = now => {
      const progress = Math.min(Math.max((now - started) / 1500, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach(counter => { counter.textContent = Math.round(Number(counter.dataset.countTo) * eased).toString(); });
      if (progress < 1) requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, { threshold: 0.15 });
  observer.observe(section);
})();
