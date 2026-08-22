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

  /* ---- LIST / WHEEL toggle ---- */
  document.querySelectorAll('[data-view-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const full = btn.closest('.section-full');
      full.dataset.view = btn.dataset.viewSet;
      full.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  /* ---- the Paper Wheel ---- */
  (function paperWheel() {
    const wheelEl = document.querySelector('.wheel');
    if (!wheelEl) return;
    const cards = [...wheelEl.querySelectorAll('.wheel-card')];
    const details = [...document.querySelectorAll('.wheel-detail')];
    const full = document.querySelector('#panel-research .section-full');
    const SPACING = 88, ROT = 3.2, DRIFT = 16;
    let focal = 0;

    function layout() {
      cards.forEach((c, i) => {
        const off = i - focal;
        c.style.transform =
          'translate(' + (-Math.abs(off) * DRIFT) + 'px, ' + (off * SPACING) + 'px) ' +
          'rotate(' + (off * ROT) + 'deg) scale(' + (off === 0 ? 1 : 0.94) + ')';
        c.style.opacity = off === 0 ? '1' : String(Math.max(0.4, 0.8 - Math.abs(off) * 0.18));
        c.style.zIndex = String(20 - Math.abs(off));
        c.classList.toggle('is-focal', off === 0);
        c.setAttribute('aria-pressed', off === 0 ? 'true' : 'false');
      });
      details.forEach((d, i) => d.classList.toggle('is-current', i === focal));
    }
    function goTo(i) {
      const next = Math.min(cards.length - 1, Math.max(0, i));
      if (next === focal) return;
      focal = next;
      layout();
    }

    cards.forEach((c, i) => c.addEventListener('click', () => goTo(i)));

    // scroll rotates — accumulated, snapping card by card, interruptible
    let acc = 0, cooling = false;
    wheelEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (cooling) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 60) {
        goTo(focal + (acc > 0 ? 1 : -1));
        acc = 0;
        cooling = true;
        setTimeout(() => { cooling = false; }, 160);
      }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (stage.dataset.state !== 'research' || full.dataset.view !== 'wheel') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goTo(focal + 1); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goTo(focal - 1); }
    });

    layout();
  })();

  /* ---- boot ---- */
  apply(mobile() ? 'landing' : fromHash());
  // one orchestrated load reveal, then never again
  setTimeout(() => document.documentElement.classList.add('revealed'), 900);
})();
