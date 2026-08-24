#!/usr/bin/env node
// build.mjs — assembles index.html from content/ + assets/. Zero dependencies.
// Edit CONTENT in content/*.yml|md (text lives there, never here).
// Edit STRUCTURE in the render functions below. Run: node build.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const C = (p) => join(ROOT, 'content', p);

/* ---------- tiny YAML-subset parser (scalars, quoted strings, inline lists,
   block lists of scalars/maps, one-level nested maps, folded `>` scalars) ---------- */
function parseYaml(src) {
  const lines = src.split('\n').filter(l => !/^\s*#/.test(l) && l.trim() !== '');
  const root = {};
  let i = 0;
  function parseScalar(v) {
    v = v.trim();
    if (v === '') return '';
    if (v.startsWith('[')) {
      const m = v.match(/^\[([^\]]*)\]/);
      const inner = (m ? m[1] : '').trim();
      return inner === '' ? [] : inner.split(',').map(s => parseScalar(s));
    }
    if (v.startsWith('"')) { const m = v.match(/^"([^"]*)"/); if (m) return m[1]; }
    if (v.startsWith("'")) { const m = v.match(/^'([^']*)'/); if (m) return m[1]; }
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    return v.replace(/\s+#.*$/, '');
  }
  function indentOf(l) { return l.match(/^ */)[0].length; }
  function parseBlock(indent, target) {
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < indent) return;
      const t = line.trim();
      if (t.startsWith('- ')) {
        // list item at this indent
        if (!Array.isArray(target._list)) target._list = [];
        const rest = t.slice(2);
        if (/^[\w-]+:\s/.test(rest) || /^[\w-]+:$/.test(rest)) {
          // list of maps: first key on the dash line, siblings indented deeper
          const item = {};
          const m = rest.match(/^([\w-]+):\s*(.*)$/);
          if (m[2] !== '') item[m[1]] = parseScalar(m[2]);
          i++;
          while (i < lines.length && indentOf(lines[i]) > ind && !lines[i].trim().startsWith('- ')) {
            const mm = lines[i].trim().match(/^([\w-]+):\s*(.*)$/);
            if (mm) item[mm[1]] = parseScalar(mm[2]);
            i++;
          }
          target._list.push(item);
        } else {
          target._list.push(parseScalar(rest));
          i++;
        }
        continue;
      }
      const m = t.match(/^([\w-]+):\s*(.*)$/);
      if (!m) { i++; continue; }
      const [, key, rawVal] = m;
      if (rawVal === '>' || rawVal === '>-' || rawVal === '|') {
        i++;
        const buf = [];
        while (i < lines.length && indentOf(lines[i]) > ind) { buf.push(lines[i].trim()); i++; }
        target[key] = buf.join(' ').trim();
      } else if (rawVal === '') {
        i++;
        const child = {};
        parseBlock(ind + 1, child);
        target[key] = Array.isArray(child._list) ? child._list : child;
      } else {
        target[key] = parseScalar(rawVal);
        i++;
      }
    }
  }
  parseBlock(0, root);
  return root;
}

/* ---------- front matter + markdown-lite ---------- */
function parseDoc(path) {
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };
  return { meta: parseYaml(m[1]), body: m[2].replace(/<!--[\s\S]*?-->/g, '').trim() };
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function mdLite(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .split(/\n\s*\n/).map(p => `<p>${p.trim()}</p>`).join('\n');
}
// Wrap `highlight` phrase in the marigold band (one per screen — caller's duty).
function band(text, phrase) {
  const e = esc(text);
  if (!phrase) return e;
  return e.replace(esc(phrase), `<mark class="band">${esc(phrase)}</mark>`);
}

/* ---------- load content ---------- */
const site = parseYaml(readFileSync(C('site.yml'), 'utf8'));
const bio = parseDoc(C('bio.md'));
const practice = parseDoc(C('practice.md'));
const cv = parseYaml(readFileSync(C('cv.yml'), 'utf8')); // kept for future use (About pane removed)
const papers = readdirSync(C('papers')).filter(f => f.endsWith('.md'))
  .map(f => ({ f, doc: parseDoc(C(join('papers', f))) }))
  .map(({ f, doc }) => ({ ...doc.meta, abstract: doc.body,
    slug: f.replace(/\.md$/, '').replace(/^\d{4}-/, '') }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

// Scroll sequence (Ledger Scroll, 2026-08-23): the featured paper LEADS the wheel —
// it is focal when the Research track pins, and the rest trail below along the arc.
const featured = papers.find(p => p.featured) ?? papers[0];
const wheelPapers = [featured, ...papers.filter(p => p !== featured)];
const yearLabel = (p) => p.status === 'In design' ? 'now' : (p.year ?? '');
const pad2 = (n) => String(n).padStart(2, '0');
const labDir = C('lab');
const labItems = readdirSync(labDir).filter(f => f.endsWith('.md') && f !== 'README.md')
  .map(f => parseDoc(join(labDir, f))).map(d => ({ ...d.meta, body: d.body }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const STAMP = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
const V = Date.now().toString(36); // asset cache-buster, refreshed every build
const authorsLine = (a) => (Array.isArray(a) && a.length) ? `with ${a.join(', ')}` : '';

// Section context line under the Research head (structural copy, not bio content).
const RESEARCH_DESC = 'Governance, public goods and beliefs — Sierra Leone, Zambia, Colombia.';

/* ---------- shared bits ---------- */
const colophon = `
<footer class="record-foot">
  ${site.supported ? `<div class="supported mono">${esc(site.supported).toUpperCase()}</div>` : ''}
  <div class="colophon">
    <div class="colophon-links">
      <a class="accent" href="mailto:${site.email}">EMAIL</a>
      ${site.links.scholar ? `<a href="${site.links.scholar}">SCHOLAR</a>` : ''}
      ${site.links.github ? `<a href="${site.links.github}">GITHUB</a>` : ''}
      ${site.links.linkedin ? `<a href="${site.links.linkedin}">LINKEDIN</a>` : ''}
      <a href="${site.links.cv}">CV</a>
    </div>
    <div>UPDATED ${STAMP}</div>
  </div>
</footer>`;

/* ---------- identity spine (sticky left panel) ---------- */
function identityAside() {
  return `
<aside class="identity" id="identity">
  <div class="id-full">
    <h1 class="display id-name">${esc(site.name).replace(' F. ', ' F.<br>')}</h1>
    <div class="role">${esc(site.role)}</div>
    ${site.credentials ? `<div class="credline mono">${esc(site.credentials).toUpperCase()}</div>` : ''}
    <img class="portrait" src="assets/portrait.jpg" alt="Portrait of ${esc(site.name)}">
    <div class="id-loc mono">${esc(site.location).toUpperCase()}</div>
  </div>
  <div class="id-foot">
    <div class="id-contacts">
      <a class="accent" href="mailto:${site.email}">${esc(site.email)}</a>
      <div class="identity-links">
        ${site.links.scholar ? `<a href="${site.links.scholar}">Scholar</a>` : ''}
        ${site.links.github ? `<a href="${site.links.github}">GitHub</a>` : ''}
        ${site.links.linkedin ? `<a href="${site.links.linkedin}">LinkedIn</a>` : ''}
        <a href="${site.links.cv}">CV (PDF)</a>
      </div>
    </div>
    <button class="id-collapse" aria-label="Collapse the identity panel" aria-expanded="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
    </button>
  </div>
  <button class="id-rail" aria-label="Expand the identity panel">
    <img src="assets/portrait.jpg" alt="" class="rail-photo">
    <span class="rail-name">${esc(site.name)}</span>
    <span class="rail-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3l5 5-5 5"/></svg>
    </span>
  </button>
</aside>`;
}

/* ---------- record nav: the horizontal hero strip that controls navigation ----------
   Sticky at the record's top; every entry returns to that section's start. */
function recordNav() {
  const items = [
    { key: 'about', num: '00', title: 'About' },
    ...site.sections.map((s, i) => ({ key: s.key, num: '0' + (i + 1), title: s.title })),
  ];
  return `
<header class="record-nav-wrap">
  <nav class="record-nav" aria-label="Sections">
    ${items.map(it => `
    <a class="rnav" href="#${it.key}" data-idx="${it.key}">
      <span class="rnav-num mono">${it.num}</span><span class="rnav-title">${esc(it.title)}</span>
    </a>`).join('')}
  </nav>
</header>`;
}

/* ---------- about: a full page — statement on top, vitae ledger at the bottom ----------
   The vitae is DATA: cv.yml (current position, education) + the papers' own countries.
   Nothing here is written by hand — edit cv.yml / papers to change it. */
function aboutSection() {
  const currently = (cv.positions ?? [])[0] ?? {};
  const phd = (cv.education ?? [])[0] ?? {};
  const prior = (cv.education ?? []).slice(1);
  // "M.A. & B.A." from the remaining entries (they share one institution)
  const priorLine = prior.length
    ? `${prior.map(e => String(e.degree).split(',')[0]).join(' & ')} — ${prior[0].org}`
    : '';
  const countries = [...new Set(papers.map(p => p.country).filter(Boolean))];
  const researchEyebrow = site.sections.find(s => s.key === 'research')?.eyebrow ?? '';
  return `
<section class="about" id="about">
  <div class="eyebrow mono">00 · ABOUT</div>
  <p class="lede">${band(bio.body, bio.meta.highlight)}</p>
  <div class="nowline mono"><span class="nowrule"></span>NOW: ${esc(bio.meta.now).toUpperCase()}</div>
  <div class="vitae">
    <div class="vita">
      <div class="eyebrow mono">CURRENTLY</div>
      <p class="vita-line">${esc(currently.role)}</p>
      <p class="vita-line vita-sub">${esc(currently.org)}</p>
      <div class="vita-years mono">${esc(currently.years)}</div>
    </div>
    <div class="vita">
      <div class="eyebrow mono">EDUCATION</div>
      <p class="vita-line">${esc(phd.degree)} — ${esc(phd.org)}</p>
      ${priorLine ? `<p class="vita-line vita-sub">${esc(priorLine)}</p>` : ''}
      <div class="vita-years mono">${esc(phd.years)}</div>
    </div>
    <div class="vita">
      <div class="eyebrow mono">FIELDWORK</div>
      <p class="vita-line">${esc(countries.join(' · '))}</p>
      <p class="vita-line vita-sub">${esc(researchEyebrow)}</p>
      <div class="vita-years mono">2019—</div>
    </div>
  </div>
</section>`;
}

/* ---------- research: the pinned wheel track ---------- */

// Optional full abstract, shown behind a mono toggle (grid-rows unfold — DESIGN.md §6 exception).
const abstractBlock = (p) => !p.abstract ? '' : `
          <div class="abstract">
            <button class="abstract-toggle mono" aria-expanded="false">ABSTRACT <span class="abstract-sign" aria-hidden="true">+</span></button>
            <div class="abstract-wrap"><div><div class="abstract-body">${mdLite(p.abstract)}</div></div></div>
          </div>`;

// Mono links row: primary links + supplemental links (extra_links: [{label, url}]).
// Omitted entirely when a paper has no links at all.
const paperLinks = (p) => {
  const parts = [
    p.links?.pdf ? `<a class="accent" href="${p.links.pdf}">PAPER</a>` : '',
    p.links?.slides ? `<a href="${p.links.slides}">SLIDES</a>` : '',
    p.links?.data ? `<a href="${p.links.data}">DATA</a>` : '',
    ...(p.extra_links ?? []).map(l => `<a href="${l.url}">${esc(l.label).toUpperCase()}</a>`),
  ].filter(Boolean);
  return parts.length ? `
          <div class="entry-links mono">
            ${parts.join('\n            ')}
          </div>` : '';
};

function researchSection() {
  const eyebrow = site.sections.find(s => s.key === 'research').eyebrow;
  const entries = wheelPapers.map((p, i) => `
    <article class="entry ${i === 0 ? 'entry-open' : ''}" data-paper="${i}">
      <div class="entry-year mono">${esc(yearLabel(p))}</div>
      <div class="entry-main">
        <h3 class="entry-title">${esc(p.title)}</h3>
        <div class="entry-meta">${esc([authorsLine(p.authors), p.method, p.country].filter(Boolean).join(' · '))}</div>
        <div class="entry-more">
          <p class="takeaway">${band(p.takeaway, p.highlight)}</p>
          ${paperLinks(p)}
          ${abstractBlock(p)}
        </div>
      </div>
    </article>`).join('');
  return `
<section class="track" id="research" style="--steps:${wheelPapers.length - 1}" data-view="wheel">
  <div class="pin">
    <header class="section-head">
      <div class="head-stack">
        <div class="eyebrow mono">01 · ${esc(eyebrow).toUpperCase()} · 2019–PRESENT</div>
        <h2 class="display-2">Research</h2>
        <p class="section-desc">${esc(RESEARCH_DESC)}</p>
      </div>
      <div class="head-side">
        <div class="view-toggle mono">
          <button class="view-btn" data-view-set="list">LIST</button>
          <span class="muted">/</span>
          <button class="view-btn is-active" data-view-set="wheel">WHEEL</button>
        </div>
        <div class="wheel-count mono" aria-hidden="true"><span class="count-cur">01</span> / ${pad2(wheelPapers.length)}</div>
      </div>
    </header>

    <div class="wheel-view">
      <div class="wheel-details">
        ${wheelPapers.map((p, i) => `
        <article class="wheel-detail ${i === 0 ? 'is-current' : ''}" data-detail="${i}">
          <div class="wd-eyebrow mono">${esc([p.status, p.method, p.country, p.year].filter(Boolean).join(' · ')).toUpperCase()}</div>
          <h3 class="wd-title">${esc(p.title)}</h3>
          ${authorsLine(p.authors) ? `<div class="wd-authors">${esc(authorsLine(p.authors))}</div>` : ''}
          <p class="takeaway">${band(p.takeaway, p.highlight)}</p>
          ${paperLinks(p)}
          ${abstractBlock(p)}
        </article>`).join('')}
      </div>
      <div class="wheel" data-initial="0" aria-label="Papers — scroll to rotate the wheel">
        <svg class="wheel-arc" fill="none" aria-hidden="true">
          <path d="" stroke="#669bbc" stroke-width="1" stroke-dasharray="3 6" opacity="0.55"/>
        </svg>
        ${wheelPapers.map((p, i) => `
        <button class="wheel-card" data-card="${i}" data-slug="${esc(p.slug)}">
          <span class="wc-title">${esc(p.short ?? p.title.split(':')[0])}</span>
          <span class="wc-tag mono">${esc((Array.isArray(p.keywords) && p.keywords.length ? p.keywords : [p.status, p.country].filter(Boolean)).join(' · ')).toUpperCase()}</span>
        </button>`).join('')}
        <div class="wheel-hint mono">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 2v11M4 9l4 4 4-4"/></svg>
          SCROLL ROTATES THE WHEEL
        </div>
      </div>
    </div>

    <div class="entry-list">${entries}</div>
  </div>
</section>`;
}

/* ---------- practice (absorbed The Lab 2026-08-23) ---------- */
function practiceSection() {
  // ONE stream (2026-08-23: content lives only in the boxes) — practice.md items and
  // content/lab/ artifacts render as uniform boxes on a horizontally scrolled shelf.
  const items = (practice.meta.items ?? []).map(it => typeof it === 'string' ? { title: it } : it);
  const labCards = labItems.length ? labItems : [
    { title: 'Portfolio learning dashboard', kind: 'interactive dashboard', status: 'in-progress',
      pitch: 'Every investment in one live view: what each project proposed, what it has produced, and what that means for the next decision.', keyline: 'what changed, project by project', link: '' },
  ];
  // Real pieces lead the shelf; placeholder teasers trail (per main 75a6697:
  // "card stream first, teasers to the bottom").
  const boxes = [
    ...labCards.map(c => ({ title: c.title, kind: c.kind ?? 'tool', status: c.status ?? '',
      pitch: c.pitch ?? c.body ?? '', keyline: c.keyline ?? '', link: c.link ?? '',
      extra_links: c.extra_links ?? [] })),
    ...items.map(it => ({ title: it.title, kind: it.kind ?? 'Piece', status: 'in progress', pitch: '', keyline: '', link: '', extra_links: [] })),
  ];
  const kindKey = (k) => String(k).toLowerCase().split(' ').pop().replace(/[^a-z]/g, '');
  return `
<section class="practice-sec" id="practice">
  <header class="section-head" data-reveal style="--i:0">
    <div class="head-stack">
      <div class="eyebrow mono">02 · ${esc(practice.meta.eyebrow).toUpperCase()}</div>
      <h2 class="display-2">Practice</h2>
    </div>
  </header>
  <p class="section-intro" data-reveal style="--i:1">${band(practice.meta.intro, practice.meta.highlight)}</p>
  <div class="shelf-controls" data-reveal style="--i:2">
    <span class="shelf-count mono" aria-hidden="true"><span class="shelf-cur">01</span> / ${pad2(boxes.length)}</span>
    <div class="shelf-btns">
      <button class="shelf-btn" data-shelf="-1" aria-label="Scroll to the previous piece" disabled>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <button class="shelf-btn" data-shelf="1" aria-label="Scroll to the next piece">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
      </button>
    </div>
  </div>
  <div class="lab-cards" data-reveal style="--i:3" role="region" aria-label="Practice pieces" tabindex="0">
    ${boxes.map((c, i) => `
    <article class="lab-card">
      <div class="lab-cover lab-cover-${kindKey(c.kind)}" aria-hidden="true"></div>
      <div class="lab-body">
        <div class="eyebrow mono">${pad2(i + 1)} · ${esc(c.kind).toUpperCase()}</div>
        <h3 class="lab-title">${esc(c.title)}</h3>
        ${c.pitch ? `<p class="lab-pitch">${esc(c.pitch)}</p>` : ''}
        ${/* no band here: the Practice intro already carries this screen's one marigold band */''}
        ${c.keyline ? `<div class="lab-keyline mono">${esc(c.keyline)}</div>` : ''}
        <div class="lab-foot">
          <span class="mono muted">${esc(c.status).toUpperCase()}</span>
          <span class="lab-foot-links">
            ${(c.extra_links ?? []).map(l => `<a class="mono" href="${l.url}">${esc(l.label).toUpperCase()} &nearr;</a>`).join('')}
            ${c.link ? `<a class="accent mono" href="${c.link}">OPEN &nearr;</a>`
              : (c.extra_links?.length ? '' : `<span class="mono muted">COMING SOON</span>`)}
          </span>
        </div>
      </div>
    </article>`).join('')}
  </div>
</section>`;
}

/* ---------- page shell ---------- */
const sameAs = [site.links.scholar, site.links.github].filter(Boolean);
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Person',
  name: site.name, jobTitle: 'Development economist',
  affiliation: { '@type': 'Organization', name: 'Stanford Impact Labs' },
  email: `mailto:${site.email}`, url: site.url,
  image: `${site.url}assets/portrait.jpg`,
  ...(sameAs.length ? { sameAs } : {}),
});
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.name)}</title>
<meta name="description" content="${esc(site.role)}">
<link rel="canonical" href="${site.url}">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(site.name)}">
<meta property="og:description" content="${esc(site.role)}">
<meta property="og:url" content="${site.url}">
<meta property="og:image" content="${site.url}assets/portrait.jpg">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="assets/tokens.css?v=${V}">
<link rel="stylesheet" href="assets/site.css?v=${V}">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<div class="frame" id="frame">
${identityAside()}
<main class="flow">
${recordNav()}
${aboutSection()}
${researchSection()}
${practiceSection()}
${colophon}
</main>
</div>
<script src="assets/site.js?v=${V}"></script>
</body>
</html>`;

writeFileSync(join(ROOT, 'index.html'), html);
console.log(`built index.html — ${papers.length} papers, ${labItems.length} lab items, stamp ${STAMP}`);
