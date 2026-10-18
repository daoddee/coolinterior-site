'use strict';
document.querySelectorAll('.review-expand').forEach(button => {
  button.addEventListener('click', () => {
    const text = document.getElementById(button.getAttribute('aria-controls'));
    if (!text) return;
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : 'Read more';
    text.classList.toggle('review-text-collapsed', !expanded);
    // Leave the full review still while the customer reads it.
    const carousel = button.closest('[data-slider]');
    const pause = carousel?.querySelector('[data-slide-toggle]');
    if (expanded && pause?.getAttribute('aria-pressed') === 'false') pause.click();
  });
});
