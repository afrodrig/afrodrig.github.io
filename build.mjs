#!/usr/bin/env node
// build.mjs — assembles index.html from content/ + assets/. Zero dependencies.
// Edit CONTENT in content/*.yml|md (text lives there, never here).
// Edit STRUCTURE in the render functions below. Run: node build.mjs

import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
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

// Wheel display order: the featured paper sits mid-arc (one neighbor above, the rest
// below) so the circle reads immediately — see DESIGN.md §8.
const featured = papers.find(p => p.featured) ?? papers[0];
const others = papers.filter(p => p !== featured);
const wheelPapers = others.length ? [others[0], featured, ...others.slice(1)] : [featured];
const wheelIndex = (p) => wheelPapers.indexOf(p);
const yearLabel = (p) => p.status === 'In design' ? 'now' : (p.year ?? '');
const labDir = C('lab');
const labItems = readdirSync(labDir).filter(f => f.endsWith('.md') && f !== 'README.md')
  .map(f => parseDoc(join(labDir, f))).map(d => ({ ...d.meta, body: d.body }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const STAMP = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
const V = Date.now().toString(36); // asset cache-buster, refreshed every build
const authorsLine = (a) => (Array.isArray(a) && a.length) ? `with ${a.join(', ')}` : '';

/* ---------- shared bits ---------- */
const colophon = `
<div class="colophon">
  <div class="colophon-links">
    <a class="accent" href="mailto:${site.email}">EMAIL</a>
    ${site.links.scholar ? `<a href="${site.links.scholar}">SCHOLAR</a>` : ''}
    ${site.links.github ? `<a href="${site.links.github}">GITHUB</a>` : ''}
    <a href="${site.links.cv}">CV</a>
  </div>
  <div>UPDATED ${STAMP}</div>
</div>`;

// Every section panel carries its own sliver face (shown when another section is open).
const sliverFace = (num, key, title) => `
  <button class="sliver-face" data-open="${key}" aria-label="Open ${esc(title)}">
    <span class="mono">${num}</span><span class="sliver-title">${esc(title)}</span>
  </button>`;

/* ---------- section renderers ---------- */
function identityPanel() {
  return `
<section class="panel panel-identity" id="panel-identity">
  <div class="identity-full">
    <h1 class="display">${esc(site.name).replace(' F. ', ' F.<br>')}</h1>
    <div class="role">${esc(site.role)}</div>
    <img class="portrait" src="assets/portrait.jpg" alt="Portrait of ${esc(site.name)}">
    <p class="statement">${band(bio.body, bio.meta.highlight)}</p>
    <div class="nowline mono"><span class="nowrule"></span>NOW: ${esc(bio.meta.now).toUpperCase()}</div>
    <div class="identity-foot">
      <a class="accent" href="mailto:${site.email}">${esc(site.email)}</a>
      <div class="identity-links">
        ${site.links.scholar ? `<a href="${site.links.scholar}">Scholar</a>` : ''}
        ${site.links.github ? `<a href="${site.links.github}">GitHub</a>` : ''}
        <a href="${site.links.cv}">CV (PDF)</a>
      </div>
    </div>
  </div>
  <div class="identity-rail">
    <img src="assets/portrait.jpg" alt="" class="rail-photo">
    <div class="rail-name">${esc(site.name)}</div>
    <button class="rail-back" data-open="landing" aria-label="Back to landing">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 8H3M7 4L3 8l4 4"/></svg>
    </button>
  </div>
</section>`;
}

// Optional full abstract, shown behind a mono toggle (grid-rows unfold — DESIGN.md §6 exception).
const abstractBlock = (p) => !p.abstract ? '' : `
          <div class="abstract">
            <button class="abstract-toggle mono" aria-expanded="false">ABSTRACT <span class="abstract-sign" aria-hidden="true">+</span></button>
            <div class="abstract-wrap"><div><div class="abstract-body">${mdLite(p.abstract)}</div></div></div>
          </div>`;

const enterBtn = (key, label) => `
    <button class="enter mono" data-open="${key}" aria-label="Open ${esc(label)}">ENTER
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h11M9 4l4 4-4 4"/></svg>
    </button>`;

// resting chevron on clickable rows — clickability must be visible before hover
const rowGo = `<span class="row-go" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h11M9 4l4 4-4 4"/></svg></span>`;

function researchPanel() {
  const preview = `
  <div class="preview-block">
    <div class="preview-papers">
      ${papers.map(p => `
      <button class="preview-paper" data-focus-paper="${wheelIndex(p)}" aria-label="Open ${esc(p.title)} in the wheel">
        <span class="pp-title">${esc(p.short ?? p.title.split(':')[0])}</span>
        <span class="row-meta mono">${esc((Array.isArray(p.keywords) && p.keywords.length ? p.keywords : [p.status, p.country].filter(Boolean)).join(' · ')).toUpperCase()}</span>
        ${rowGo}
      </button>`).join('')}
    </div>
    <div class="ledger-fill" aria-hidden="true"></div>
  </div>
  ${enterBtn('research', 'Research')}`;
  const entries = papers.map((p, i) => `
    <article class="entry ${i === 0 ? 'entry-open' : ''}" data-paper="${i}">
      <div class="entry-year mono">${esc(yearLabel(p))}</div>
      <div class="entry-main">
        <h3 class="entry-title">${esc(p.title)}</h3>
        <div class="entry-meta">${esc([authorsLine(p.authors), p.method, p.country].filter(Boolean).join(' · '))}</div>
        <div class="entry-more">
          <p class="takeaway">${band(p.takeaway, p.highlight)}</p>
          <div class="entry-links mono">
            ${p.links?.pdf ? `<a class="accent" href="${p.links.pdf}">PAPER</a>` : ''}
            ${p.links?.slides ? `<a href="${p.links.slides}">SLIDES</a>` : ''}
            ${p.links?.data ? `<a href="${p.links.data}">DATA</a>` : ''}
          </div>
          ${abstractBlock(p)}
        </div>
      </div>
    </article>`).join('');
  return `
<section class="panel panel-section" id="panel-research" data-key="research">
  ${sliverFace('01', 'research', 'Research')}
  <div class="section-preview" data-open="research">
    <div class="eyebrow mono">01 · ${esc(site.sections.find(s => s.key === 'research').eyebrow).toUpperCase()}</div>
    <h2 class="display-2">Research</h2>
    <p class="section-desc">Governance, public goods and beliefs — Sierra Leone, Zambia, Colombia.</p>
    ${preview}
  </div>
  <div class="section-full" data-view="wheel">
    <header class="section-head">
      <div class="head-stack">
        <div class="eyebrow mono">01 · ${esc(site.sections.find(s => s.key === 'research').eyebrow).toUpperCase()} · 2019–PRESENT</div>
        <h2 class="display-2">Research</h2>
      </div>
      <div class="view-toggle mono">
        <button class="view-btn" data-view-set="list">LIST</button>
        <span class="muted">/</span>
        <button class="view-btn is-active" data-view-set="wheel">WHEEL</button>
      </div>
    </header>

    <div class="wheel-view">
      <div class="wheel-details">
        ${wheelPapers.map((p, i) => `
        <article class="wheel-detail ${p === featured ? 'is-current' : ''}" data-detail="${i}">
          <div class="wd-eyebrow mono">${esc([p.status, p.method, p.country, p.year].filter(Boolean).join(' · ')).toUpperCase()}</div>
          <h3 class="wd-title">${esc(p.title)}</h3>
          ${authorsLine(p.authors) ? `<div class="wd-authors">${esc(authorsLine(p.authors))}</div>` : ''}
          <p class="takeaway">${band(p.takeaway, p.highlight)}</p>
          <div class="entry-links mono">
            ${p.links?.pdf ? `<a class="accent" href="${p.links.pdf}">PAPER</a>` : ''}
            ${p.links?.slides ? `<a href="${p.links.slides}">SLIDES</a>` : ''}
            ${p.links?.data ? `<a href="${p.links.data}">DATA</a>` : ''}
          </div>
          ${abstractBlock(p)}
        </article>`).join('')}
      </div>
      <div class="wheel" data-initial="${wheelIndex(featured)}" aria-label="Papers — scroll or use arrow keys to rotate">
        <svg class="wheel-arc" fill="none" aria-hidden="true">
          <path d="" stroke="#669bbc" stroke-width="1" stroke-dasharray="3 6" opacity="0.55"/>
        </svg>
        ${wheelPapers.map((p, i) => `
        <button class="wheel-card" data-card="${i}" data-slug="${esc(p.slug)}">
          <span class="wc-title">${esc(p.short ?? p.title.split(':')[0])}</span>
          <span class="wc-tag mono">${esc(p.status ?? '').toUpperCase()}</span>
        </button>`).join('')}
        <div class="wheel-hint mono">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 2v11M4 9l4 4 4-4"/></svg>
          SCROLL ROTATES THE WHEEL
        </div>
      </div>
    </div>

    <div class="entry-list">${entries}</div>
    ${colophon}
  </div>
</section>`;
}

function practicePanel() {
  // Practice absorbed The Lab (2026-08-23): case studies + essays + artifact cards.
  const items = practice.meta.items ?? [];
  const cards = labItems.length ? labItems : [
    { title: 'Portfolio learning dashboard', kind: 'interactive dashboard', status: 'in-progress',
      pitch: 'Every investment in one live view: what each project proposed, what it has produced, and what that means for the next decision.', keyline: 'what changed, project by project', link: '' },
  ];
  const previewRows = [
    ...items.map(it => typeof it === 'string' ? { title: it } : it),
    ...cards.map(c => ({ title: c.title, kind: [c.kind, c.status === 'in-progress' ? 'in progress' : c.status].filter(Boolean).join(' · ') })),
  ].slice(0, 4);
  return `
<section class="panel panel-section" id="panel-practice" data-key="practice">
  ${sliverFace('02', 'practice', 'Practice')}
  <div class="section-preview" data-open="practice">
    <div class="eyebrow mono">02 · ${esc(practice.meta.eyebrow).toUpperCase()}</div>
    <h2 class="display-2">Practice</h2>
    <p class="section-desc">How impact measurement works in the field — and the tools I build doing it.</p>
    <div class="preview-block">
      <div class="preview-list">
        ${previewRows.map(it => `
        <button class="preview-row" data-open="practice" aria-label="Open Practice">
          <span class="pr-title">${esc(it.title)}</span>
          ${it.kind ? `<span class="row-meta mono">${esc(it.kind).toUpperCase()}</span>` : ''}
          ${rowGo}
        </button>`).join('')}
      </div>
      <div class="ledger-fill" aria-hidden="true"></div>
    </div>
    ${enterBtn('practice', 'Practice')}
  </div>
  <div class="section-full">
    <header class="section-head">
      <div class="head-stack">
        <div class="eyebrow mono">02 · ${esc(practice.meta.eyebrow).toUpperCase()}</div>
        <h2 class="display-2">Practice</h2>
      </div>
    </header>
    <p class="section-intro">${band(practice.meta.intro, practice.meta.highlight)}</p>
    <div class="card-stream">
      ${cards.map((c, i) => `
      <article class="lab-card">
        <div class="lab-cover lab-cover-${(c.kind ?? 'tool').split(' ').pop()}" aria-hidden="true"></div>
        <div class="lab-body">
          <div class="eyebrow mono">0${i + 1} · ${esc(c.kind ?? '').toUpperCase()}</div>
          <h3 class="lab-title">${esc(c.title)}</h3>
          <p class="lab-pitch">${esc(c.pitch ?? c.body ?? '')}</p>
          ${/* no band here: the Practice intro already carries this screen's one marigold band */''}
          ${c.keyline ? `<div class="lab-keyline mono">${esc(c.keyline)}</div>` : ''}
          <div class="lab-foot">
            <span class="mono muted">${esc(c.status ?? '').toUpperCase()}</span>
            ${c.link ? `<a class="accent mono" href="${c.link}">OPEN &nearr;</a>` : `<span class="mono muted">COMING SOON</span>`}
          </div>
        </div>
      </article>`).join('')}
    </div>
    ${cards.length > 1 ? `<div class="stream-hint mono">SCROLL FOR MORE &rarr;</div>` : ''}
    <div class="coming">
      <div class="coming-label eyebrow mono">IN PROGRESS — CASE STUDIES AND ESSAYS LAND HERE</div>
      ${items.map(it => `
      <div class="coming-row">
        <span>${esc(typeof it === 'string' ? it : it.title)}</span>
        ${it.kind ? `<span class="row-meta mono">${esc(it.kind).toUpperCase()}</span>` : ''}
      </div>`).join('')}
    </div>
    ${colophon}
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
<main class="stage" data-state="landing">
${identityPanel()}
${researchPanel()}
${practicePanel()}
</main>
<script src="assets/site.js?v=${V}"></script>
</body>
</html>`;

writeFileSync(join(ROOT, 'index.html'), html);
if (!existsSync(join(ROOT, 'assets'))) mkdirSync(join(ROOT, 'assets'));
console.log(`built index.html — ${papers.length} papers, ${labItems.length} lab items, stamp ${STAMP}`);
