'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const phone = '447365155414';
  const email = 'booking@coolinterior.co.uk';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Consumers may listen for these events. Contact details are never included.
  const track = (action, metadata = {}) => document.dispatchEvent(new CustomEvent('coolinterior:interaction', { detail: { action, ...metadata } }));
  // Measure intent only after analytics consent. Never send form fields or enquiry text.
  let analyticsAllowed = /(?:^|,)analytics:yes(?:,|$)/.test(
    decodeURIComponent((document.cookie.split('; ').find(value => value.startsWith('cookieyes-consent=')) || '').split('=').slice(1).join('='))
  );
  const updateAnalyticsConsent = event => {
    if (Array.isArray(event.detail?.accepted)) analyticsAllowed = event.detail.accepted.includes('analytics');
  };
  document.addEventListener('cookieyes_consent_update', updateAnalyticsConsent);
  document.addEventListener('cookieyes_banner_load', updateAnalyticsConsent);
  const measuredActions = new Set(['quote_start', 'quote_step', 'enquiry_prepared', 'generate_lead', 'enquiry_handoff', 'contact_click', 'calculator_to_quote']);
  document.addEventListener('coolinterior:interaction', event => {
    const { action, channel, step } = event.detail || {};
    if (!analyticsAllowed || !measuredActions.has(action) || typeof window.gtag !== 'function') return;
    const parameters = { send_to: 'G-CMTEW5X2MT' };
    if (['phone', 'email'].includes(channel)) parameters.contact_channel = channel;
    if ([1, 2, 3].includes(step)) parameters.form_step = step;
    window.gtag('event', action, parameters);
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    const channel = href.startsWith('tel:') ? 'phone' : href.startsWith('mailto:') ? 'email' : /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href) ? 'whatsapp' : '';
    if (channel) track('contact_click', { channel });
  });
  $$('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
  const menuButton = $('.menu-button');
  const mobileNav = $('#mobile-nav');
  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    if (mobileNav) mobileNav.hidden = true;
  };
  menuButton?.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !opening;
  });
  $$('#mobile-nav a').forEach(el => el.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  const showDialog = dialog => {
    if (!dialog) return;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
  $$('dialog').forEach(dialog => {
    $('[data-close]', dialog)?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
    dialog.addEventListener('click', e => {
      const rect = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dialog.close();
    });
  });
  $$('[data-privacy]').forEach(button => button.addEventListener('click', () => showDialog($('#privacy-dialog'))));

  const serviceData = [
    {name:"Natural Stone Installation",key:"design",tag:"Natural stone surfaces",description:"Precision stone wall and floor installation.",items:["Marble and limestone installation","Travertine and natural stone floors","Stone wall finishes","Cutting, jointing and sealing considerations"]},
    {name:'Tiling', key:'tiling', tag:'Bathrooms, kitchens & floors', description:'From a new splashback to a complete tiled space.', items:['Wall & floor tiling','Bathrooms & wet rooms','Kitchens & splashbacks','Patios & outdoor tiling']},
    {name:'Marble', key:'stone', tag:'A beautiful centrepiece', description:'Worktops, islands and vanities with a considered finish.', items:['Kitchen worktops & islands','Natural marble surfaces','Bathroom vanities','Marble fitting & finishing']},
  ];
  let activeService = '';
  $$('[data-service-open]').forEach(button => button.addEventListener('click', () => {
    const service = serviceData.find(item => item.key === button.dataset.serviceOpen);
    if (!service) return;
    activeService = service.name;
    $('#service-dialog-tag').textContent = service.tag;
    $('#service-dialog-title').textContent = service.name;
    $('#service-dialog-description').textContent = service.description;
    $('#service-dialog-items').replaceChildren(...service.items.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    $('#stone-details-link').hidden = service.key !== 'stone';
    if ($('#tiling-details-link')) $('#tiling-details-link').hidden = service.key !== 'tiling';
    showDialog($('#service-dialog'));
    track('service_view', {service:service.name});
  }));

  const projectGalleries = JSON.parse($('#project-gallery-data')?.textContent || '{}');
  const albumDialog = $('#tiling-album-dialog');
  let albumIndex = 0;
  let activeProjectKey = 'finchley';
  let albumPhotos = [];
  const renderAlbumPhoto = index => {
    if (!albumPhotos.length) return;
    albumIndex = (index + albumPhotos.length) % albumPhotos.length;
    const photo = albumPhotos[albumIndex];
    $('#tiling-album-image').src = photo.src;
    $('#tiling-album-image').alt = photo.alt;
    $('#tiling-album-caption').textContent = photo.title;
    $('#project-viewer-label').textContent = projectGalleries[activeProjectKey].name + (activeProjectKey === 'flooring' ? ' · Design inspiration' : ' · Cool Interior project');
    $('#tiling-album-counter').textContent = (activeProjectKey === 'flooring' ? 'Image ' : 'Photo ') + (albumIndex + 1) + ' of ' + albumPhotos.length;
  };
  $$('.project-gallery-open').forEach(button => button.addEventListener('click', () => {
    activeProjectKey = button.dataset.project;
    const project = projectGalleries[activeProjectKey];
    if (!project) return;
    albumPhotos = project.photos;
    renderAlbumPhoto(Number(button.dataset.photo) || 0);
    showDialog(albumDialog);
    track('project_view', {project:activeProjectKey});
  }));
  $('#album-prev')?.addEventListener('click', () => renderAlbumPhoto(albumIndex - 1));
  $('#album-next')?.addEventListener('click', () => renderAlbumPhoto(albumIndex + 1));
  albumDialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); renderAlbumPhoto(albumIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); renderAlbumPhoto(albumIndex + 1); }
  });
  let touchStart = null;
  $('#tiling-album-image')?.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY};
  }, {passive:true});
  $('#tiling-album-image')?.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) renderAlbumPhoto(albumIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive:true});
  $('#tiling-details-link')?.addEventListener('click', () => $('#service-dialog').close());

  const form = $('#quote-form');
  const selected = new Set();
  let currentStep = 1;
  let message = '';
  const syncServices = () => {
    $$('.service-choice').forEach(button => button.setAttribute('aria-pressed', String(selected.has(button.dataset.service))));
    $('#service-error').hidden = true;
  };
  const refreshSummary = () => {
    const location = $('#location').value.trim();
    $('#brief-summary').textContent = `${[...selected].join(', ')} · ${location} · ${$('#property').value} · ${$('#timeframe').value}`;
  };
  const showStep = (step, focus = true) => {
    currentStep = step;
    $$('.form-step').forEach(el => { el.hidden = Number(el.dataset.step) !== step; });
    $('#step-label').textContent = `STEP ${String(step).padStart(2, '0')} / 03`;
    $$('.wizard-progress span').forEach((el, i) => { el.style.backgroundColor = i < step ? 'var(--teal)' : ''; });
    form.hidden = false;
    $('#enquiry-ready').hidden = true;
    if (step === 3) refreshSummary();
    if (focus) {
      const heading = $(`.form-step[data-step="${step}"] h3`);
      heading.focus({preventScroll:true});
      $('.quote-panel').scrollIntoView({behavior:reducedMotion ? 'instant' : 'smooth', block:'start'});
    }
  };
  const validateStep = step => {
    if (step === 1) {
      if (!selected.size) { $('#service-error').hidden = false; $('.service-choice').focus(); return false; }
      return true;
    }
    const stepElement = $(`.form-step[data-step="${step}"]`);
    for (const input of $$('input,textarea,select', stepElement)) {
      if (input.required) input.value = input.value.trim();
      if (!input.checkValidity()) { input.reportValidity(); input.focus(); return false; }
    }
    if (step === 3) {
      const phoneValue = $('#phone').value.trim();
      const emailValue = $('#email').value.trim();
      const phoneValid = !phoneValue || (/^[+\d\s().-]+$/.test(phoneValue) && phoneValue.replace(/\D/g,'').length >= 7 && phoneValue.replace(/\D/g,'').length <= 15);
      if ((!phoneValue && !emailValue) || !phoneValid) { $('#contact-error').hidden = false; $('#phone').focus(); return false; }
      $('#contact-error').hidden = true;
    }
    return true;
  };
  $$('.service-choice').forEach(button => button.addEventListener('click', () => {
    const service = button.dataset.service;
    if (selected.has(service)) selected.delete(service); else selected.add(service);
    syncServices();
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (validateStep(currentStep)) { showStep(Number(button.dataset.next)); track('quote_step', {step:currentStep}); }
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  // One entry point ensures every service CTA populates the same enquiry flow.
  const startQuote = (service, inspiration = '') => {
    if (service) { selected.add(service); syncServices(); }
    if (inspiration) {
      const note = `Interested in: ${inspiration}.`;
      if (!$('#details').value.includes(note)) $('#details').value = [$('#details').value.trim(), note].filter(Boolean).join('\n');
    }
    showStep(service ? 2 : 1);
    history.replaceState(null, '', '#quote');
    track('quote_start', {service});
  };
  $('#album-discuss')?.addEventListener('click', () => { albumDialog.close(); startQuote('Tiling', projectGalleries[activeProjectKey].name + ' — ' + projectGalleries[activeProjectKey].title + ': ' + albumPhotos[albumIndex].title); });
  $$('[data-quote-service]').forEach(button => button.addEventListener('click', () => startQuote(button.dataset.quoteService, button.dataset.inspiration || '')));
  $('#service-dialog-quote')?.addEventListener('click', () => { $('#service-dialog').close(); startQuote(activeService); });
  $$('[data-quote-start]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    closeMenu();
    showStep(1);
    history.replaceState(null, '', '#quote-form');
    track('quote_start');
  }));
  $$('a[href="#quote"],a[href="/#quote"]').forEach(link => link.addEventListener('click', () => { track('quote_start'); }));
  const params = new URLSearchParams(location.search);
  const presetService = params.get('service');
  const presetArea = params.get('area');
  if (presetArea && $('#location') && presetArea.length <= 100) $('#location').value = presetArea;
  if (presetService && serviceData.map(s => s.name).includes(presetService)) { selected.add(presetService); syncServices(); }
  // Quote requests use the website API only; success requires a saved reference.
  let directRequestId = null;
  let directPayload = null;
  let directSending = false;
  const directButton = document.createElement('button');
  directButton.type = 'button'; directButton.className = 'button';
  directButton.id = 'send-direct'; directButton.textContent = 'Submit enquiry';
  directButton.hidden = false;
  const directStatus = document.createElement('p');
  directStatus.setAttribute('role', 'status'); directStatus.className = 'direct-enquiry-status';
  if (form) {
    $('#enquiry-ready .ready-actions').prepend(directButton);
    $('#enquiry-ready .ready-actions').after(directStatus);
    const honeypot = document.createElement('input');
    honeypot.name = 'website'; honeypot.autocomplete = 'off'; honeypot.tabIndex = -1;
    honeypot.setAttribute('aria-hidden','true');
    honeypot.style.cssText='position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
    form.append(honeypot);
    directButton.addEventListener('click', async () => {
      if(directSending || !directPayload) return;
      directSending=true; directButton.disabled=true;
      directStatus.textContent='Sending your enquiry…';
      try {
        const response=await fetch('/api/enquiries?action=submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...directPayload,website:honeypot.value}),signal:AbortSignal.timeout(20000)});
        const data=await response.json();
        if(!response.ok || !data.reference) throw new Error(data.error || 'We could not confirm delivery. Please try again.');
        $('#enquiry-ready h3').textContent='Thank you. Your enquiry is with us.';
        $('#enquiry-ready > .eyebrow').textContent='Enquiry received';
        $('#enquiry-ready > p').textContent='Our team will review your project and contact you using the details you provided.';
        directStatus.textContent='Your reference: '+data.reference+'. Please keep this for your records.';
        $('#enquiry-ready .ready-actions').hidden=true;
        $('#enquiry-ready .send-note').hidden=true;
        $('#edit-enquiry').hidden=true;
        track('generate_lead', {channel:'website'});
        $('#enquiry-ready h3').focus({preventScroll:true});
      } catch(error) {
        directStatus.textContent=(error.name==='TimeoutError'?'Delivery has not been confirmed. Retry safely using this button; duplicate enquiries will not be created.':error.message)+' Your project brief is still available below. Please retry using Submit enquiry.';
      } finally {directSending=false;directButton.disabled=false;}
    });
  }
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      // Enter in a field moves the wizard forward without bypassing validation.
      if (currentStep < 3) { if (validateStep(currentStep)) showStep(currentStep + 1); return; }
      for (const step of [1,2,3]) { if (!validateStep(step)) { showStep(step); validateStep(step); return; } }
      message = [
        'PROJECT ENQUIRY — CoolInterior', '',
        `Name: ${$('#customer-name').value.trim()}`,
        `Phone: ${$('#phone').value.trim() || 'Not provided'}`,
        `Email: ${$('#email').value.trim() || 'Not provided'}`,
        `Services: ${[...selected].join(', ')}`,
        `Location: ${$('#location').value.trim()}`,
        `Property: ${$('#property').value}`,
        `Timeframe: ${$('#timeframe').value}`,
        `Indicative budget: ${$('#budget').value}`, '',
        'Project details:', $('#details').value.trim(), '',
        'Please contact me to discuss the scope, availability and a quote.'
      ].join('\n');
      const payload={name:$('#customer-name').value.trim(),phone:$('#phone').value.trim(),email:$('#email').value.trim(),services:[...selected],location:$('#location').value.trim(),property:$('#property').value,timeframe:$('#timeframe').value,budget:$('#budget').value,details:$('#details').value.trim(),source:location.pathname};
      if(JSON.stringify(payload)!==JSON.stringify(directPayload && Object.fromEntries(Object.entries(directPayload).filter(([key])=>key!=='requestId')))) directRequestId=crypto.randomUUID();
      directPayload={...payload,requestId:directRequestId};
      directStatus.textContent='';
      directButton.hidden=false;
      $('#enquiry-ready .ready-actions').hidden=false;
      $('#edit-enquiry').hidden=false;
      $('#enquiry-ready h3').textContent='Your enquiry is ready.';
      $('#enquiry-ready > .eyebrow').textContent='Ready for the next step';
      $('#enquiry-ready > p').textContent='Review your project brief, then submit it securely to our team. You will receive a reference once delivery is confirmed.';
      $('#enquiry-ready .send-note').hidden=false;
      $('#message-preview').textContent = message;
      form.hidden = true;
      $('#enquiry-ready').hidden = false;
      $('#enquiry-ready h3').focus({preventScroll:true});
      $('.quote-panel').scrollIntoView({behavior:reducedMotion ? 'instant' : 'smooth',block:'start'});
      track('enquiry_prepared', {services:[...selected]});
    });
    $('#edit-enquiry').addEventListener('click', () => showStep(3));
    $('#copy-enquiry').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(message); $('#copy-status').textContent = 'Project brief copied.'; }
      catch { $('#copy-status').textContent = 'Open “Review your project brief” to select and copy the text.'; $('.brief-preview').open = true; }
    });
  }

  const calc = $('#tile-calculator');
  let calculation = null;
  if (calc) {
    const calculate = () => {
      const length = Number($('#surface-length').value);
      const width = Number($('#surface-width').value);
      const tileLength = Number($('#tile-length').value);
      const tileWidth = Number($('#tile-width').value);
      const allowance = Number($('#tile-waste').value);
      if (!calc.checkValidity() || ![length,width,tileLength,tileWidth].every(n => Number.isFinite(n) && n > 0)) {
        calculation = null;
        $('#area-result').textContent = '—';
        $('#tile-count-result').textContent = '—';
        $('#tile-coverage-result').textContent = 'Enter positive measurements within the stated limits.';
        return;
      }
      const area = length * width;
      const targetCoverage = area * (1 + allowance / 100);
      const tiles = Math.ceil(targetCoverage / ((tileLength / 1000) * (tileWidth / 1000)) - 1e-9);
      calculation = {length,width,tileLength,tileWidth,allowance,area,targetCoverage,tiles};
      $('#area-result').replaceChildren(document.createTextNode(area.toFixed(2) + ' '), Object.assign(document.createElement('em'), {textContent:'m²'}));
      $('#tile-count-result').textContent = tiles.toLocaleString('en-GB');
      $('#tile-coverage-result').textContent = `Includes ${allowance}% allowance. Target coverage: ${targetCoverage.toFixed(2)} m². Buy full packs as required.`;
    };
    calc.addEventListener('input', calculate);
    calc.addEventListener('change', calculate);
    calc.addEventListener('submit', e => {
      e.preventDefault();
      calculate();
      if (!calculation) { calc.reportValidity(); return; }
      const c = calculation;
      const note = `Tile planning measurements: ${c.length} m × ${c.width} m (${c.area.toFixed(2)} m²); tiles ${c.tileLength} × ${c.tileWidth} mm; ${c.allowance}% allowance; approximately ${c.tiles} individual tiles. Final measurements and quantity to be confirmed.`;
      // Replace a prior calculator note when measurements change.
      const lines = $('#details').value.split('\n').filter(line => !line.startsWith('Tile planning measurements: '));
      $('#details').value = [...lines.filter(Boolean),note].join('\n');
      startQuote('Tiling');
      track('calculator_to_quote');
    });
    calculate();
  }
  // If scripting is disabled, the always-visible contact links remain available.
})();
