/* site.js — the Ledger Scroll engine: identity morph, pinned wheel track, index nav.
   Behavior only. Scrubbed properties are transform/opacity ONLY (DESIGN.md §6). */
(function () {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = matchMedia('(max-width: 880px)');
  const isStatic = () => reduced.matches || mqMobile.matches;

  const frame = document.getElementById('frame');
  const aside = document.getElementById('identity');
  const hero = document.getElementById('top');
  const track = document.getElementById('research');
  const pin = track ? track.querySelector('.pin') : null;
  const practiceSec = document.getElementById('practice');
  const portrait = aside ? aside.querySelector('.portrait') : null;
  const idxLinks = [...document.querySelectorAll('.idx')];

  /* ============ the Paper Wheel ============
     Cards ride one real circle (R = 900px, 6°/step); the dashed arc is drawn
     through the same geometry. Page scroll through the pinned track rotates it. */
  const wheelAPI = (function () {
    const wheelEl = document.querySelector('.wheel');
    if (!wheelEl) return null;
    const cards = [...wheelEl.querySelectorAll('.wheel-card')];
    const details = [...document.querySelectorAll('.wheel-detail')];
    const arcSvg = wheelEl.querySelector('.wheel-arc');
    const arcPath = arcSvg.querySelector('path');
    const hint = wheelEl.querySelector('.wheel-hint');
    const counters = [...document.querySelectorAll('.count-cur, .idx-cur')];
    const R = 900;                    // circle radius (px)
    const STEP = 6 * Math.PI / 180;   // 6° between cards
    let focal = 0;
    let rotated = false;              // first scroll rotation dismisses the hint

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
      const label = String(focal + 1).padStart(2, '0');
      counters.forEach((el) => { el.textContent = label; });
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
    if (!hero) return;
    M = { vh: window.innerHeight, mob: mqMobile.matches, trackTop: null, trackLen: 1 };
    if (track && pin) {
      M.trackTop = track.offsetTop;
      M.trackLen = Math.max(1, track.offsetHeight - pin.offsetHeight);
    }
    M.morphEnd = Math.max(240, (M.trackTop ?? hero.offsetHeight) - 120);
    if (portrait) {
      const dock = aside.querySelector('.portrait-dock');
      if (M.mob || !dock) { portrait.style.transform = ''; portrait.style.opacity = ''; M.morph = null; }
      else {
        portrait.style.transform = '';          // measure at rest
        portrait.style.opacity = '';
        const a = portrait.getBoundingClientRect();
        const b = dock.getBoundingClientRect();
        if (a.width) {
          // uniform scale, centers mapped: the rectangle shrinks onto the round mark
          const s = b.width / a.width;
          M.morph = {
            s,
            dx: (b.left + b.width / 2) - (a.left + a.width * s / 2),
            dy: (b.top + b.height / 2) - (a.top + a.height * s / 2),
          };
        } else M.morph = null;
      }
    }
  }

  /* ============ the scroll engine (rAF-throttled) ============ */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  let lastHash = location.hash;
  function setHash(h) {
    if (h === lastHash) return;
    lastHash = h;
    history.replaceState(null, '', h || location.pathname + location.search);
  }

  function apply() {
    if (!M) return;
    const y = window.scrollY;

    // 1) identity morph: portrait travels to its dock, faces crossfade
    if (!M.mob) {
      let p = clamp01(y / M.morphEnd);
      if (reduced.matches) p = p < 0.5 ? 0 : 1;
      aside.style.setProperty('--p', p.toFixed(4));
      aside.classList.toggle('is-scrolled', p > 0.02);
      aside.classList.toggle('is-compact', p > 0.5);
      aside.classList.toggle('is-docked', p > 0.98);
      if (M.morph && portrait) {
        const e = easeInOut(p);
        portrait.style.transform = 'translate3d(' + (M.morph.dx * e).toFixed(2) + 'px, ' +
          (M.morph.dy * e).toFixed(2) + 'px, 0) scale(' + (1 + (M.morph.s - 1) * e).toFixed(4) + ')';
        // the rectangle hands off to the round mark at the very end of the travel
        portrait.style.opacity = p < 0.82 ? '1' : Math.max(0, 1 - (p - 0.82) / 0.16).toFixed(3);
      }
    }

    // 2) track progress → wheel rotation (quantized: snaps card-by-card)
    if (track && M.trackTop != null && wheelAPI && !isStatic() && track.dataset.view === 'wheel') {
      const prog = clamp01((y - M.trackTop) / M.trackLen);
      wheelAPI.setFocal(Math.round(prog * (wheelAPI.count - 1)), true);
    }

    // 3) active section (spine index) + shareable hash
    let section = 'top';
    if (track && M.trackTop != null) {
      const mid = y + M.vh * 0.5;
      if (mid >= M.trackTop) section = 'research';
      if (practiceSec && mid >= practiceSec.offsetTop) section = 'practice';
    }
    idxLinks.forEach((el) => el.classList.toggle('is-active', el.dataset.idx === section));
    if (section === 'research') {
      const slug = (wheelAPI && !isStatic() && track.dataset.view === 'wheel') ? wheelAPI.slug() : null;
      setHash(slug ? '#/research/' + slug : '#research');
    } else if (section === 'practice') setHash('#practice');
    else setHash('');
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; apply(); });
  }, { passive: true });

  // once settled, load animations are removed so the morph owns opacity/transform
  setTimeout(() => doc.classList.add('settled'), 800);
  addEventListener('scroll', () => doc.classList.add('settled'), { once: true, passive: true });

  /* ============ navigation ============ */
  const smooth = () => reduced.matches ? 'auto' : 'smooth';

  function scrollToSection(key, animate) {
    const el = document.getElementById(key);
    if (!el) return;
    if (key === 'research' && M && M.trackTop != null && !isStatic()) {
      window.scrollTo({ top: M.trackTop, behavior: animate === false ? 'auto' : smooth() });
    } else {
      el.scrollIntoView({ behavior: animate === false ? 'auto' : smooth() });
    }
  }
  function scrollToPaper(i, animate) {
    if (!M || M.trackTop == null || !wheelAPI) return;
    const top = M.trackTop + (i / Math.max(1, wheelAPI.count - 1)) * M.trackLen;
    window.scrollTo({ top: Math.round(top), behavior: animate === false ? 'auto' : smooth() });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const href = a.getAttribute('href');
      if (href === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: smooth() });
        return;
      }
      const key = href.slice(1);
      if (key === 'research' || key === 'practice') {
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
    if (!wheelAPI || isStatic() || !M || M.trackTop == null || track.dataset.view !== 'wheel') return;
    const y = window.scrollY;
    if (y < M.trackTop - M.vh * 0.5 || y > M.trackTop + M.trackLen + M.vh * 0.5) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); scrollToPaper(wheelAPI.focal() + 1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); scrollToPaper(wheelAPI.focal() - 1); }
  });

  addEventListener('popstate', () => {
    lastHash = location.hash;
    const m = location.hash.match(/^#\/?(research|practice)(?:\/([\w-]+))?/);
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
        window.scrollTo({ top: track.offsetTop, behavior: 'auto' });
      } else if (wheelAPI) {
        scrollToPaper(focalBefore, false);
        requestAnimationFrame(wheelAPI.drawArc);
      }
      apply();
    });
  });

  /* ============ identity panel collapse ============ */
  const collapseBtn = document.querySelector('.id-collapse');
  const expandBtn = document.querySelector('.id-expand');
  function setCollapsed(on) {
    frame.classList.toggle('is-collapsed', on);
    if (collapseBtn) collapseBtn.setAttribute('aria-expanded', String(!on));
    const target = on ? expandBtn : collapseBtn;
    if (target) target.focus({ preventScroll: true });
    setTimeout(() => { measure(); if (wheelAPI) wheelAPI.drawArc(); apply(); }, 620);
  }
  if (collapseBtn) collapseBtn.addEventListener('click', () => setCollapsed(true));
  if (expandBtn) expandBtn.addEventListener('click', () => setCollapsed(false));

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
  const gotoBootTarget = (animate) => {
    const m = location.hash.match(/^#\/?(research|practice)(?:\/([\w-]+))?/);
    if (!m) return;
    doc.classList.add('settled');   // deep link: skip the landing reveal entirely
    if (m[1] === 'research' && m[2] && wheelAPI && !isStatic()) {
      const i = wheelAPI.slugIndex(m[2]);
      if (i >= 0) { scrollToPaper(i, animate); return; }
    }
    scrollToSection(m[1], animate);
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
