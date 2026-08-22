/* site.js — the panel state machine + the Paper Wheel. Behavior only. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  const stage = document.querySelector('.stage');
  const SECTIONS = ['research', 'practice', 'lab'];
  const mobile = () => matchMedia('(max-width: 880px)').matches;

  /* ================= the Paper Wheel ================= */
  // Cards ride a real circle: center off-screen RIGHT of the wheel column,
  // radius R. The focal card sits at the circle's rightmost point; neighbors
  // recede LEFT and up/down along the same arc the dashed line draws.
  const wheelAPI = (function paperWheel() {
    const wheelEl = document.querySelector('.wheel');
    if (!wheelEl) return null;
    const cards = [...wheelEl.querySelectorAll('.wheel-card')];
    const details = [...document.querySelectorAll('.wheel-detail')];
    const arcPath = wheelEl.querySelector('.wheel-arc path');
    const arcSvg = wheelEl.querySelector('.wheel-arc');
    const full = document.querySelector('#panel-research .section-full');
    const R = 900;                    // circle radius (px)
    const STEP = 6 * Math.PI / 180;   // 6° between cards
    let focal = 0;

    const pos = (off) => {
      const th = off * STEP;
      return { x: -R * (1 - Math.cos(th)), y: R * Math.sin(th), deg: off * 5.1 };
    };

    function layout() {
      cards.forEach((c, i) => {
        const off = i - focal;
        const p = pos(off);
        c.style.transform = 'translate(' + p.x.toFixed(1) + 'px, ' + p.y.toFixed(1) + 'px) ' +
          'rotate(' + p.deg + 'deg) scale(' + (off === 0 ? 1 : 0.94) + ')';
        c.style.opacity = off === 0 ? '1' : String(Math.max(0.4, 0.8 - Math.abs(off) * 0.18));
        c.style.zIndex = String(20 - Math.abs(off));
        c.classList.toggle('is-focal', off === 0);
        c.setAttribute('aria-pressed', off === 0 ? 'true' : 'false');
      });
      details.forEach((d, i) => d.classList.toggle('is-current', i === focal));
    }

    // Draw the arc through the cards' right-edge anchors, matching the same circle.
    function drawArc() {
      const W = wheelEl.clientWidth, H = wheelEl.clientHeight;
      if (!W || !H) return;
      const ax = W - 4, ay = H / 2;             // focal anchor (rightmost point)
      const span = 22 * Math.PI / 180;          // arc spans ±22°
      const px = (th) => ax - R * (1 - Math.cos(th));
      const py = (th) => ay + R * Math.sin(th);
      arcSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      arcPath.setAttribute('d',
        'M ' + px(-span).toFixed(1) + ' ' + py(-span).toFixed(1) +
        ' A ' + R + ' ' + R + ' 0 0 1 ' + px(span).toFixed(1) + ' ' + py(span).toFixed(1));
    }

    function goTo(i) {
      const next = Math.min(cards.length - 1, Math.max(0, i));
      focal = next;
      layout();
    }

    cards.forEach((c, i) => c.addEventListener('click', () => goTo(i)));

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

    window.addEventListener('resize', drawArc);
    layout();
    return { goTo, drawArc };
  })();

  /* ================= panel state machine ================= */
  function apply(state) {
    stage.dataset.state = state;
    const landing = state === 'landing';
    show('#panel-identity .identity-full', landing);
    show('#panel-identity .identity-rail', !landing);
    SECTIONS.forEach((key) => {
      const panel = document.getElementById('panel-' + key);
      show(panel.querySelector('.section-preview'), landing);
      show(panel.querySelector('.section-full'), state === key);
      show(panel.querySelector('.sliver-face'), !landing && state !== key);
    });
    if (state === 'research' && wheelAPI) {
      // the wheel column only has real dimensions once visible
      requestAnimationFrame(() => requestAnimationFrame(wheelAPI.drawArc));
    }
  }
  function show(elOrSel, on) {
    const el = typeof elOrSel === 'string' ? document.querySelector(elOrSel) : elOrSel;
    if (el) el.classList.toggle('is-shown', !!on);
  }

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
    // a specific paper card on the landing opens Research focused on that paper
    const focusCard = e.target.closest('[data-focus-paper]');
    if (focusCard) {
      e.preventDefault();
      e.stopPropagation();
      go('research');
      if (wheelAPI) wheelAPI.goTo(parseInt(focusCard.dataset.focusPaper, 10));
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (!opener) return;
    if (e.target.closest('a')) return;
    e.preventDefault();
    go(opener.dataset.open);
  });
  window.addEventListener('popstate', () => apply(fromHash()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stage.dataset.state !== 'landing') go('landing');
  });

  /* ---- LIST / WHEEL toggle ---- */
  document.querySelectorAll('[data-view-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const full = btn.closest('.section-full');
      full.dataset.view = btn.dataset.viewSet;
      full.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      if (btn.dataset.viewSet === 'wheel' && wheelAPI) requestAnimationFrame(wheelAPI.drawArc);
    });
  });

  /* ---- research entries (list view): click a title to unfold ---- */
  document.querySelectorAll('.entry-title').forEach((t) => {
    t.setAttribute('tabindex', '0');
    t.setAttribute('role', 'button');
    const toggle = () => t.closest('.entry').classList.toggle('entry-open');
    t.addEventListener('click', toggle);
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ---- boot ---- */
  apply(mobile() ? 'landing' : fromHash());
  setTimeout(() => document.documentElement.classList.add('revealed'), 900);
})();
