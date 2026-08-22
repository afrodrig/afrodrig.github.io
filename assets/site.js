/* site.js — the panel state machine. Behavior only; content lives in content/, looks in assets/css. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  const stage = document.querySelector('.stage');
  const SECTIONS = ['research', 'practice', 'lab', 'about'];
  const mobile = () => matchMedia('(max-width: 880px)').matches;

  /* ---- face visibility per state ---- */
  function apply(state) {
    stage.dataset.state = state;
    const landing = state === 'landing';
    // identity panel
    show('#panel-identity .identity-full', landing);
    show('#panel-identity .identity-rail', !landing);
    // section panels
    SECTIONS.forEach((key) => {
      const panel = document.getElementById('panel-' + key);
      show(panel.querySelector('.section-preview'), landing);
      show(panel.querySelector('.section-full'), state === key);
      show(panel.querySelector('.sliver-face'), !landing && state !== key);
    });
  }
  function show(elOrSel, on) {
    const el = typeof elOrSel === 'string' ? document.querySelector(elOrSel) : elOrSel;
    if (el) el.classList.toggle('is-shown', !!on);
  }

  /* ---- navigation ---- */
  function go(state, push) {
    if (!SECTIONS.includes(state)) state = 'landing';
    apply(state);
    if (push !== false) {
      const hash = state === 'landing' ? '' : '#/' + state;
      history.pushState(null, '', hash || location.pathname);
    }
    if (state !== 'landing') {
      const full = document.querySelector('#panel-' + state + ' .section-full');
      if (full) full.scrollTop = 0;
    }
  }
  const fromHash = () => (location.hash.match(/^#\/(\w+)/) || [])[1] || 'landing';

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (!opener) return;
    if (e.target.closest('a')) return; // real links inside previews win
    e.preventDefault();
    go(opener.dataset.open);
  });
  window.addEventListener('popstate', () => apply(fromHash()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stage.dataset.state !== 'landing') go('landing');
  });

  /* ---- research entries: click a title to unfold ---- */
  document.querySelectorAll('.entry-title').forEach((t) => {
    t.setAttribute('tabindex', '0');
    t.setAttribute('role', 'button');
    const toggle = () => t.closest('.entry').classList.toggle('entry-open');
    t.addEventListener('click', toggle);
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ---- boot ---- */
  apply(mobile() ? 'landing' : fromHash());
  // one orchestrated load reveal, then never again
  setTimeout(() => document.documentElement.classList.add('revealed'), 900);
})();
