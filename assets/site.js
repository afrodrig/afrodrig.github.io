/* site.js — the Ledger Scroll engine: pinned wheel track, record nav, magnetic snap.
   Behavior only. The identity spine is STATIC (scroll morph removed 2026-08-23). */
(function () {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = matchMedia('(max-width: 880px)');
  const isStatic = () => reduced.matches || mqMobile.matches;

  const frame = document.getElementById('frame');
  const navWrap = document.querySelector('.record-nav-wrap');
  const about = document.getElementById('about');
  const track = document.getElementById('research');
  const pin = track ? track.querySelector('.pin') : null;
  const practiceSec = document.getElementById('practice');
  const navLinks = [...document.querySelectorAll('.rnav')];

  /* ============ the Paper Wheel ============
     Cards ride one real circle (R = 900px, 6°/step) whose center sits OFF-SCREEN
     to the RIGHT — the wheel reads as mounted just beyond the browser's edge, and
     receding cards drift toward it. The dashed arc is drawn through the same
     geometry. Page scroll through the pinned track rotates it. */
  const wheelAPI = (function () {
    const wheelEl = document.querySelector('.wheel');
    if (!wheelEl) return null;
    const cards = [...wheelEl.querySelectorAll('.wheel-card')];
    const details = [...document.querySelectorAll('.wheel-detail')];
    const arcSvg = wheelEl.querySelector('.wheel-arc');
    const arcPath = arcSvg.querySelector('path');
    const hint = document.querySelector('.wheel-hint');
    const counters = [...document.querySelectorAll('.count-cur')];
    const R = 900;                    // circle radius (px)
    const STEP = 6 * Math.PI / 180;   // 6° between cards
    let focal = 0;
    let rotated = false;              // first scroll rotation dismisses the hint

    const pos = (off) => {
      const th = off * STEP;
      return { x: R * (1 - Math.cos(th)), y: R * Math.sin(th), deg: -off * 5.1 };
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
      const label = String(focal + 1).padStart(2, '0');
      counters.forEach((el) => { el.textContent = label; });
    }

    // Draw the arc through the cards' right-edge anchors, matching the same circle
    // (center at focal-anchor + R, off past the right edge of the viewport).
    function drawArc() {
      const W = wheelEl.clientWidth, H = wheelEl.clientHeight;
      if (!W || !H) return;
      const ax = W - 4, ay = H / 2;             // focal anchor (the circle's leftmost point)
      const span = 22 * Math.PI / 180;          // arc spans ±22°
      const px = (th) => ax + R * (1 - Math.cos(th));
      const py = (th) => ay + R * Math.sin(th);
      arcSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      arcPath.setAttribute('d',
        'M ' + px(-span).toFixed(1) + ' ' + py(-span).toFixed(1) +
        ' A ' + R + ' ' + R + ' 0 0 0 ' + px(span).toFixed(1) + ' ' + py(span).toFixed(1));
    }

    function setFocal(i, byScroll) {
      const next = Math.min(cards.length - 1, Math.max(0, i));
      if (next === focal) return;
      focal = next;
      layout();
      if (byScroll && !rotated) { rotated = true; if (hint) hint.classList.add('is-dismissed'); }
    }

    // Entrance: the whole wheel rolls up into place the first time the track shows.
    function enter() {
      wheelEl.classList.add('is-booting');
      cards.forEach((c, i) => {
        const p = pos(i - focal + 2.2);
        c.style.transform = 'translate(' + p.x.toFixed(1) + 'px, ' + p.y.toFixed(1) + 'px) ' +
          'rotate(' + p.deg + 'deg) scale(0.94)';
        c.style.opacity = '0';
      });
      void wheelEl.offsetWidth;                 // land boot positions without transition
      wheelEl.classList.remove('is-booting');
      requestAnimationFrame(() => { layout(); drawArc(); });
    }

    layout();
    return {
      setFocal, drawArc, enter,
      count: cards.length,
      focal: () => focal,
      slug: () => cards[focal] ? cards[focal].dataset.slug : null,
      slugIndex: (slug) => cards.findIndex((c) => c.dataset.slug === slug),
    };
  })();

  /* ============ measurements ============ */
  let M = null;
  function measure() {
    if (!track || !pin) return;
    const navH = navWrap ? navWrap.offsetHeight : 0;
    M = {
      vh: window.innerHeight,
      mob: mqMobile.matches,
      navH,
      trackTop: track.offsetTop - navH,          // pin engages here (pin top = navH)
      trackLen: Math.max(1, track.offsetHeight - pin.offsetHeight),
      practiceTop: practiceSec ? practiceSec.offsetTop - navH : Infinity,
    };
  }

  /* ============ the scroll engine (rAF-throttled) ============ */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  let lastHash = location.hash;
  function setHash(h) {
    if (h === lastHash) return;
    lastHash = h;
    history.replaceState(null, '', h || location.pathname + location.search);
  }

  function apply() {
    if (!M) return;
    const y = window.scrollY;

    // 1) track progress → wheel rotation (quantized: snaps card-by-card)
    if (wheelAPI && !isStatic() && track.dataset.view === 'wheel') {
      const prog = clamp01((y - M.trackTop) / M.trackLen);
      wheelAPI.setFocal(Math.round(prog * (wheelAPI.count - 1)), true);
    }

    // 2) active section (record nav) + shareable hash — thresholds sit midway
    // between the rest points the snap engine produces (0, trackTop, practiceTop)
    const endPin = M.trackTop + M.trackLen;
    let section = 'about';
    if (y >= M.trackTop / 2) section = 'research';
    if (practiceSec && y >= (endPin + M.practiceTop) / 2) section = 'practice';
    navLinks.forEach((el) => el.classList.toggle('is-active', el.dataset.idx === section));
    if (section === 'research') {
      const slug = (wheelAPI && !isStatic() && track.dataset.view === 'wheel') ? wheelAPI.slug() : null;
      setHash(slug ? '#/research/' + slug : '#research');
    } else if (section === 'practice') setHash('#practice');
    else setHash('');
  }

  /* ============ magnetic snap: the in-between zones resolve to a boundary ============
     Zone A: between About and the pinned track. Zone B: between the last paper and
     Practice. After scroll goes idle inside a zone, glide to the boundary in the
     direction of travel — the page always comes to rest in the right place. */
  let snapping = false, snapT = 0, lastY = window.scrollY, dir = 1;

  function maybeSnap() {
    if (snapping || !M || isStatic() || !track || track.dataset.view !== 'wheel') return;
    measure();   // fresh geometry — late reflows must never leave stale snap targets
    const y = window.scrollY, EPS = 6;
    const endPin = M.trackTop + M.trackLen;
    let target = null;
    if (y > EPS && y < M.trackTop - EPS) target = dir > 0 ? M.trackTop : 0;
    else if (y > endPin + EPS && y < M.practiceTop - EPS) target = dir > 0 ? M.practiceTop : endPin;
    if (target == null) return;
    snapping = true;
    window.scrollTo({ top: Math.round(target), behavior: 'smooth' });
    const t0 = performance.now();
    (function arrive() {
      if (Math.abs(window.scrollY - target) < 2 || performance.now() - t0 > 1400) { snapping = false; return; }
      requestAnimationFrame(arrive);
    })();
  }

  // the user taking over (wheel/touch) cancels a snap in flight
  ['wheel', 'touchstart'].forEach((ev) =>
    addEventListener(ev, () => { snapping = false; }, { passive: true }));

  let ticking = false;
  addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; }
    if (!snapping) { clearTimeout(snapT); snapT = setTimeout(maybeSnap, 150); }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; apply(); });
  }, { passive: true });

  /* ============ navigation ============ */
  const smooth = () => reduced.matches ? 'auto' : 'smooth';

  function scrollToSection(key, animate) {
    const behavior = animate === false ? 'auto' : smooth();
    if (key === 'about') { window.scrollTo({ top: 0, behavior }); return; }
    const el = document.getElementById(key);
    if (!el) return;
    measure();
    if (M && !isStatic()) {
      const top = key === 'research' ? M.trackTop : M.practiceTop;
      window.scrollTo({ top: Math.round(top), behavior });
    } else {
      el.scrollIntoView({ behavior });
    }
  }
  function scrollToPaper(i, animate) {
    if (!wheelAPI) return;
    measure();
    if (!M) return;
    const top = M.trackTop + (i / Math.max(1, wheelAPI.count - 1)) * M.trackLen;
    window.scrollTo({ top: Math.round(top), behavior: animate === false ? 'auto' : smooth() });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const key = a.getAttribute('href').slice(1);
      if (key === 'about' || key === 'research' || key === 'practice') {
        e.preventDefault();
        scrollToSection(key);
        return;
      }
    }
    const card = e.target.closest('.wheel-card');
    if (card && wheelAPI && !isStatic() && track.dataset.view === 'wheel') {
      scrollToPaper(parseInt(card.dataset.card, 10));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { window.scrollTo({ top: 0, behavior: smooth() }); return; }
    if (!wheelAPI || isStatic() || !M || track.dataset.view !== 'wheel') return;
    const y = window.scrollY;
    if (y < M.trackTop - M.vh * 0.5 || y > M.trackTop + M.trackLen + M.vh * 0.5) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); scrollToPaper(wheelAPI.focal() + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); scrollToPaper(wheelAPI.focal() - 1); }
  });

  addEventListener('popstate', () => {
    lastHash = location.hash;
    const m = location.hash.match(/^#\/?(about|research|practice)(?:\/([\w-]+))?/);
    if (!m) { window.scrollTo({ top: 0 }); return; }
    if (m[1] === 'research' && m[2] && wheelAPI && !isStatic()) {
      const i = wheelAPI.slugIndex(m[2]);
      if (i >= 0) { scrollToPaper(i, false); return; }
    }
    scrollToSection(m[1], false);
  });

  /* ============ LIST / WHEEL toggle ============ */
  document.querySelectorAll('[data-view-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.viewSet;
      const focalBefore = wheelAPI ? wheelAPI.focal() : 0;
      track.dataset.view = view;
      track.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      measure();
      if (view === 'list') {
        window.scrollTo({ top: Math.round(M.trackTop), behavior: 'auto' });
      } else if (wheelAPI) {
        scrollToPaper(focalBefore, false);
        requestAnimationFrame(wheelAPI.drawArc);
      }
      apply();
    });
  });

  /* ============ identity panel collapse ============
     The collapsed rail is ONE whole click target that expands the spine. */
  const collapseBtn = document.querySelector('.id-collapse');
  const railBtn = document.querySelector('.id-rail');
  function setCollapsed(on) {
    frame.classList.toggle('is-collapsed', on);
    if (collapseBtn) collapseBtn.setAttribute('aria-expanded', String(!on));
    const target = on ? railBtn : collapseBtn;
    if (target) target.focus({ preventScroll: true });
    setTimeout(() => { measure(); if (wheelAPI) wheelAPI.drawArc(); apply(); }, 620);
  }
  if (collapseBtn) collapseBtn.addEventListener('click', () => setCollapsed(true));
  if (railBtn) railBtn.addEventListener('click', () => setCollapsed(false));

  /* ============ abstract toggles ============ */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.abstract-toggle');
    if (!t) return;
    const open = t.closest('.abstract').classList.toggle('is-open');
    t.setAttribute('aria-expanded', String(open));
    const sign = t.querySelector('.abstract-sign');
    if (sign) sign.textContent = open ? '−' : '+';
  });

  /* ============ research entries (list view): click a title to unfold ============ */
  document.querySelectorAll('.entry-title').forEach((t) => {
    t.setAttribute('tabindex', '0');
    t.setAttribute('role', 'button');
    const toggle = () => t.closest('.entry').classList.toggle('entry-open');
    t.addEventListener('click', toggle);
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ============ the practice shelf: horizontal rail + paging controls ============ */
  (function shelf() {
    const rail = document.querySelector('.lab-cards');
    if (!rail) return;
    const controls = document.querySelector('.shelf-controls');
    const cur = document.querySelector('.shelf-cur');
    const btns = [...document.querySelectorAll('.shelf-btn')];
    const step = () => (rail.firstElementChild ? rail.firstElementChild.offsetWidth : 400) + 24;
    function update() {
      const max = rail.scrollWidth - rail.clientWidth;
      if (controls) controls.classList.toggle('is-idle', max < 8);
      if (cur) {
        const i = Math.min(rail.children.length, Math.round(rail.scrollLeft / step()) + 1);
        cur.textContent = String(i).padStart(2, '0');
      }
      btns.forEach((b) => {
        b.disabled = parseInt(b.dataset.shelf, 10) < 0
          ? rail.scrollLeft <= 2
          : rail.scrollLeft >= max - 2;
      });
    }
    let paging = null;   // pending paging target (index), so rapid clicks accumulate
    let st = false;
    rail.addEventListener('scroll', () => {
      if (st) return;
      st = true;
      requestAnimationFrame(() => {
        st = false;
        if (paging != null && Math.abs(rail.scrollLeft - paging * step()) < 4) paging = null;
        update();
      });
    }, { passive: true });
    ['wheel', 'touchstart'].forEach((ev) =>
      rail.addEventListener(ev, () => { paging = null; }, { passive: true }));
    btns.forEach((b) => b.addEventListener('click', () => {
      const from = paging != null ? paging : Math.round(rail.scrollLeft / step());
      paging = Math.max(0, Math.min(rail.children.length - 1, from + parseInt(b.dataset.shelf, 10)));
      rail.scrollTo({ left: paging * step(), behavior: smooth() });
    }));
    addEventListener('resize', () => setTimeout(update, 150));
    update();
  })();

  /* ============ scroll reveals (reveal-once) ============ */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    // the wheel's entrance the first time the track shows
    if (wheelAPI && pin && !isStatic()) {
      const wio = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting && track.dataset.view === 'wheel') { wheelAPI.enter(); wio.disconnect(); }
        });
      }, { threshold: 0.2 });
      wio.observe(pin);
    }
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }

  /* ============ boot ============ */
  measure();
  // the hash the page ARRIVED with — never the ones our own scrollspy writes later
  const bootHash = location.hash;
  const gotoBootTarget = (animate) => {
    const m = bootHash.match(/^#\/?(about|research|practice)(?:\/([\w-]+))?/);
    if (!m) return;
    if (m[1] === 'research' && m[2] && wheelAPI && !isStatic()) {
      const i = wheelAPI.slugIndex(m[2]);
      if (i >= 0) { scrollToPaper(i, false); return; }
    }
    scrollToSection(m[1], false);
  };
  gotoBootTarget(false);
  apply();
  if (wheelAPI) requestAnimationFrame(wheelAPI.drawArc);

  // font loading reflows the page: re-measure, and re-land any deep link the
  // user hasn't scrolled away from yet
  let userScrolled = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) =>
    addEventListener(ev, () => { userScrolled = true; }, { passive: true, once: true }));
  const remeasure = () => {
    measure();
    if (wheelAPI) wheelAPI.drawArc();
    if (!userScrolled) gotoBootTarget(false);
    apply();
  };
  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(remeasure, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(remeasure, 0));
  addEventListener('load', remeasure);
})();
