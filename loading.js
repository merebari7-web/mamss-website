/* Critical welcome controller. Inline, dependency-free, no new storage or forced wait. */
(() => {
  'use strict';
  const root = document.documentElement, dialog = document.getElementById('mamss-loader');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const states = { structure: 'pending', styles: 'pending', tools: 'pending', fonts: 'pending', photo: 'pending' };
  const labels = { structure: 'School information ready', styles: 'Visual identity ready', tools: 'School tools ready', fonts: 'Typography ready', photo: 'Welcome photograph ready' };
  const status = document.getElementById('ml-status'), progress = document.getElementById('ml-progress');
  let finished = false, closing = false, reason = '', fontWatch = false, documentWatch = false, deadline, exitTimer;
  // Honour an existing, opted-in School Desk preference before its main script arrives.
  try {
    const saved = JSON.parse(localStorage.getItem('mamss.desk.v1') || 'null');
    if (saved?.version === 1 && saved.consent === true && saved.settings?.motion === true) dialog.dataset.motion = 'reduce';
  } catch { /* Device storage can be unavailable; system reduced motion still applies. */ }
  const reduceMotion = () => dialog.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'reduce';
  function focusPage() {
    const main = document.getElementById('main');
    if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  }
  function cleanup(moveFocus) {
    if (finished) return;
    finished = true; clearTimeout(deadline); clearTimeout(exitTimer);
    root.classList.remove('mamss-loading');
    if (dialog.open) dialog.close();
    dialog.classList.remove('ml-leaving');
    dialog.dataset.exit = reason;
    document.removeEventListener('load', loaded, true);
    window.removeEventListener('error', failed, true);
    document.removeEventListener('error', failed, true);
    document.removeEventListener('readystatechange', documentReady);
    document.removeEventListener('DOMContentLoaded', documentReady);
    if (moveFocus) {
      if (document.getElementById('main')) focusPage();
      else document.addEventListener('DOMContentLoaded', focusPage, { once: true });
    }
    document.dispatchEvent(new CustomEvent('mamss:loading-complete', { detail: { reason, checks: { ...states } } }));
  }
  function finish(why, immediate = false, moveFocus = false) {
    if (finished) return;
    if (closing) { if (immediate) cleanup(moveFocus); return; }
    closing = true; reason = why; clearTimeout(deadline);
    if (why !== 'ready' && why !== 'ready-with-fallback') status.textContent = 'Continuing to the school website';
    if (immediate || reduceMotion() || document.hidden) { cleanup(moveFocus); return; }
    dialog.classList.add('ml-leaving');
    // Do not depend on animationend: CSS, motion preferences and background tabs can interrupt it.
    exitTimer = setTimeout(() => cleanup(moveFocus), 360);
  }
  function check(key, state = 'ready') {
    if (closing || finished || !Object.hasOwn(states, key) || states[key] !== 'pending') return;
    states[key] = state;
    const item = dialog.querySelector(`[data-load-check="${key}"]`);
    item.dataset.state = state;
    item.querySelector('span').textContent = state === 'ready' ? '✓' : '—';
    item.setAttribute('aria-label', `${item.textContent.slice(1).trim()}: ${state === 'ready' ? 'ready' : 'unavailable; continuing without it'}`);
    const count = Object.values(states).filter(s => s !== 'pending').length;
    progress.value = count;
    progress.setAttribute('aria-valuetext', `${count} of 5 readiness checks complete`);
    document.getElementById('ml-count').textContent = `${count} / 5`;
    document.getElementById('ml-ring').style.strokeDashoffset = String(628.32 * (1 - count / 5));
    status.textContent = state === 'ready' ? labels[key] : 'Some visual details are unavailable';
    if (count === 5) {
      const fallback = Object.values(states).includes('unavailable');
      status.textContent = fallback ? 'Ready to continue' : 'Welcome to MAMSS';
      finish(fallback ? 'ready-with-fallback' : 'ready');
    }
  }
  function watchFonts() {
    if (fontWatch || finished || closing) return;
    fontWatch = true;
    if (!document.fonts?.load) { check('fonts', 'unavailable'); return; }
    // Actual local font availability, not a timer or a fabricated download percentage.
    Promise.all([document.fonts.load('400 16px "DM Sans"'), document.fonts.load('400 16px "Libre Caslon Display"')])
      .then(fonts => check('fonts', fonts.every(f => f.length > 0) ? 'ready' : 'unavailable'), () => check('fonts', 'unavailable'));
  }
  function loaded(event) {
    if (event.target?.id === 'mamss-styles') { check('styles'); watchFonts(); }
  }
  function failed(event) {
    if (event.target?.id === 'mamss-styles') finish('stylesheet-error', true);
    else if (event.target?.id === 'mamss-runtime' || /site\.min\.js(?:\?|$)/.test(event.filename || '')) finish('script-error', true);
  }
  function documentReady() {
    if (documentWatch || document.readyState === 'loading' || finished || closing) return;
    documentWatch = true;
    check('structure');
    // A deep link opens its requested chapter; it never waits on the hidden home photograph.
    const home = !location.hash || location.hash === '#home';
    const photo = home ? document.querySelector('.hero-photo') : null;
    if (!home || !photo) {
      document.getElementById('ml-view-label').textContent = 'View';
      labels.photo = 'Your opening view selected'; check('photo');
    } else if (photo.complete) check('photo', photo.naturalWidth ? 'ready' : 'unavailable');
    else {
      photo.addEventListener('load', () => check('photo'), { once: true });
      photo.addEventListener('error', () => check('photo', 'unavailable'), { once: true });
    }
  }
  // A small public readiness signal is appended only after the entire application bundle executes.
  window.MAMSSLoading = Object.freeze({ check, get state() { return { finished, closing, reason, checks: { ...states } }; } });
  document.getElementById('ml-skip').addEventListener('click', () => finish('skipped', true, true));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish('skipped', true, true); });
  dialog.addEventListener('keydown', event => {
    if (event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) event.stopPropagation();
  });
  dialog.addEventListener('close', () => { if (!finished) finish('dismissed', true); });
  document.addEventListener('load', loaded, true);
  window.addEventListener('error', failed, true);
  document.addEventListener('error', failed, true);
  document.addEventListener('readystatechange', documentReady);
  document.addEventListener('DOMContentLoaded', documentReady, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish('page-hidden', true); });
  window.addEventListener('pagehide', () => finish('page-hidden', true));
  window.addEventListener('pageshow', event => { if (event.persisted) finish('history-restored', true); });
  window.addEventListener('beforeprint', () => finish('printing', true));
  if (!navigator.onLine) document.getElementById('ml-network').textContent = 'Offline · available content only';
  deadline = setTimeout(() => finish('timeout', true), 3500);
  try {
    if (document.hidden) { finish('page-hidden', true); return; }
    root.classList.add('mamss-loading');
    dialog.showModal();
    documentReady();
  } catch { finish('unsupported', true); }
})();
