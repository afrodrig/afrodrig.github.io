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
const cv = parseYaml(readFileSync(C('cv.yml'), 'utf8'));
const papers = readdirSync(C('papers')).filter(f => f.endsWith('.md'))
  .map(f => parseDoc(C(join('papers', f))))
  .map(d => ({ ...d.meta, abstract: d.body }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
const labDir = C('lab');
const labItems = readdirSync(labDir).filter(f => f.endsWith('.md') && f !== 'README.md')
  .map(f => parseDoc(join(labDir, f))).map(d => ({ ...d.meta, body: d.body }))
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const STAMP = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
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
    <img class="portrait" src="assets/avatar.jpg" alt="Portrait of ${esc(site.name)}">
    <h1 class="display">${esc(site.name).replace(' F. ', ' F.<br>')}</h1>
    <div class="role">${esc(site.role)}</div>
    <p class="statement">${band(bio.body, bio.meta.highlight)}</p>
    <div class="nowline mono"><span class="nowrule"></span>NOW: ${esc(bio.meta.now).toUpperCase()}</div>
    <div class="identity-foot">
      <a class="accent" href="mailto:${site.email}">${esc(site.email)}</a>
      <div class="identity-links">
        ${site.links.scholar ? `<a href="${site.links.scholar}">Scholar</a>` : ''}
        ${site.links.github ? `<a href="${site.links.github}">GitHub</a>` : ''}
        <a href="${site.links.cv}">CV (PDF)</a>
        <button class="linklike" data-open="about">About &amp; CV &rarr;</button>
      </div>
    </div>
  </div>
  <div class="identity-rail">
    <img src="assets/avatar.jpg" alt="" class="rail-photo">
    <div class="rail-name">${esc(site.name)}</div>
    <button class="rail-back" data-open="landing" aria-label="Back to landing">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 8H3M7 4L3 8l4 4"/></svg>
    </button>
  </div>
</section>`;
}

function researchPanel() {
  const featured = papers.find(p => p.featured) ?? papers[0];
  const preview = `
  <div class="preview">
    <div class="stack">
      ${papers.filter(p => p !== featured).slice(0, 2).map((p, i) =>
        `<div class="stack-card sc${i}"><span>${esc(p.title.split(':')[0])}</span></div>`).join('')}
      <div class="stack-card stack-focal"><span>${esc(featured.title.split(':')[0])}</span>
        <span class="mono tag-inverse">${esc(featured.status).toUpperCase()}</span></div>
    </div>
    <span class="enter mono">ENTER
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h11M9 4l4 4-4 4"/></svg>
    </span>
  </div>`;
  const entries = papers.map((p, i) => `
    <article class="entry ${i === 0 ? 'entry-open' : ''}" data-paper="${i}">
      <div class="entry-year mono">${esc(p.status === 'In design' ? 'now' : (p.year ?? ''))}</div>
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
  <div class="section-full">
    <header class="section-head">
      <div>
        <div class="eyebrow mono">01 · ${esc(site.sections.find(s => s.key === 'research').eyebrow).toUpperCase()} · 2019–PRESENT</div>
        <h2 class="display-2">Research</h2>
      </div>
    </header>
    <div class="entry-list">${entries}</div>
    ${colophon}
  </div>
</section>`;
}

function practicePanel() {
  const items = practice.meta.items ?? [];
  return `
<section class="panel panel-section" id="panel-practice" data-key="practice">
  ${sliverFace('02', 'practice', 'Practice')}
  <div class="section-preview" data-open="practice">
    <div class="eyebrow mono">02 · ${esc(practice.meta.eyebrow).toUpperCase()}</div>
    <h2 class="display-2">Practice</h2>
    <p class="section-desc">How impact measurement works in the field — and what I learn building it.</p>
    <div class="preview-list">
      ${items.map(it => `<div class="preview-row">${esc(it)}</div>`).join('')}
    </div>
  </div>
  <div class="section-full">
    <header class="section-head">
      <div>
        <div class="eyebrow mono">02 · ${esc(practice.meta.eyebrow).toUpperCase()}</div>
        <h2 class="display-2">Practice</h2>
      </div>
    </header>
    <p class="section-intro">${band(practice.meta.intro, practice.meta.highlight)}</p>
    <div class="practice-note mono">FIRST PIECES IN PROGRESS — CASE STUDIES AND ESSAYS LAND HERE.</div>
    ${colophon}
  </div>
</section>`;
}

function labPanel() {
  const cards = labItems.length ? labItems : [
    { title: 'Portfolio learning dashboard', kind: 'interactive dashboard', status: 'in-progress',
      pitch: 'Every investment in one live view: what each project proposed, what it has produced, and what that means for the next decision.', keyline: 'what changed, project by project', link: '' },
  ];
  return `
<section class="panel panel-section" id="panel-lab" data-key="lab">
  ${sliverFace('03', 'lab', 'The Lab')}
  <div class="section-preview" data-open="lab">
    <div class="eyebrow mono">03 · ${esc(site.sections.find(s => s.key === 'lab').eyebrow).toUpperCase()}</div>
    <h2 class="display-2">The Lab</h2>
    <p class="section-desc">Dashboards, frameworks, open data.</p>
    <div class="preview-list">
      ${cards.slice(0, 3).map(c => `<div class="preview-row">${esc(c.title)}</div>`).join('')}
    </div>
  </div>
  <div class="section-full">
    <header class="section-head">
      <div>
        <div class="eyebrow mono">03 · ${esc(site.sections.find(s => s.key === 'lab').eyebrow).toUpperCase()}</div>
        <h2 class="display-2">The Lab</h2>
      </div>
      <div class="section-aside">Interactive artifacts — every card opens the real thing.</div>
    </header>
    <div class="lab-cards">
      ${cards.map((c, i) => `
      <article class="lab-card ${i === 0 ? 'lab-focal' : ''}">
        <div class="lab-cover lab-cover-${(c.kind ?? 'tool').split(' ').pop()}" aria-hidden="true"></div>
        <div class="lab-body">
          <div class="eyebrow mono">ARTIFACT · 0${i + 1} · ${esc(c.kind ?? '').toUpperCase()}</div>
          <h3 class="lab-title">${esc(c.title)}</h3>
          <p class="lab-pitch">${esc(c.pitch ?? c.body ?? '')}</p>
          ${c.keyline ? `<div class="lab-keyline mono">${i === 0 ? `<mark class="band">${esc(c.keyline)}</mark>` : esc(c.keyline)}</div>` : ''}
          <div class="lab-foot">
            <span class="mono muted">${esc(c.status ?? '').toUpperCase()}</span>
            ${c.link ? `<a class="accent mono" href="${c.link}">OPEN &nearr;</a>` : `<span class="mono muted">COMING SOON</span>`}
          </div>
        </div>
      </article>`).join('')}
    </div>
    ${colophon}
  </div>
</section>`;
}

function aboutPanel() {
  const posRows = (cv.positions ?? []).map(p => `
    <div class="cv-row"><div class="mono cv-year">${esc(p.years)}</div>
      <div>${esc(p.role)}, <span class="muted-strong">${esc(p.org)}</span></div></div>`).join('');
  const eduRows = (cv.education ?? []).map(e => `
    <div class="cv-row"><div class="mono cv-year">${esc(e.years)}</div>
      <div>${esc(e.degree)}, <span class="muted-strong">${esc(e.org)}</span></div></div>`).join('');
  return `
<section class="panel panel-section" id="panel-about" data-key="about">
  ${sliverFace('04', 'about', 'About & CV')}
  <div class="section-preview" data-open="about">
    <div class="eyebrow mono">04</div>
    <h2 class="display-2">About &amp; CV</h2>
  </div>
  <div class="section-full">
    <header class="section-head">
      <div>
        <div class="eyebrow mono">04 · ABOUT &amp; CV</div>
        <h2 class="display-2">About</h2>
      </div>
      <a class="accent mono" href="${site.links.cv}">CV (PDF) &darr;</a>
    </header>
    <div class="about-grid">
      <div class="about-side">
        <img class="about-photo" src="assets/avatar.jpg" alt="Portrait of ${esc(site.name)}">
        <div class="about-contact">
          <a class="accent" href="mailto:${site.email}">${esc(site.email)}</a>
          <div class="identity-links">
            ${site.links.scholar ? `<a href="${site.links.scholar}">Google Scholar</a>` : ''}
            ${site.links.github ? `<a href="${site.links.github}">GitHub</a>` : ''}
          </div>
          <div class="mono muted">${esc(site.location).toUpperCase()}</div>
        </div>
      </div>
      <div class="about-main">
        <p>I&rsquo;m a development economist working on governance and public goods in West Africa and Latin America. As Impact &amp; Learning Manager at Stanford Impact Labs, I design how a funder learns from a portfolio of applied social science &mdash; my job is to <mark class="band">make evidence usable</mark>, not just rigorous.</p>
        <p>Before Stanford Impact Labs, my fieldwork took me to Sierra Leone, Zambia and Colombia, working with chiefs, councils and entrepreneurs on how institutions shape everyday economic life.</p>
        <div class="cv-block">
          <div class="cv-head mono">POSITIONS</div>${posRows}
          <div class="cv-head mono">EDUCATION</div>${eduRows}
          <div class="cv-more"><a class="accent" href="${site.links.cv}">Grants, fellowships &amp; the full vita in the PDF &rarr;</a></div>
        </div>
      </div>
    </div>
    ${colophon}
  </div>
</section>`;
}

/* ---------- page shell ---------- */
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.name)}</title>
<meta name="description" content="${esc(site.role)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="assets/tokens.css">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
<main class="stage" data-state="landing">
${identityPanel()}
${researchPanel()}
${practicePanel()}
${labPanel()}
${aboutPanel()}
</main>
<script src="assets/site.js"></script>
</body>
</html>`;

writeFileSync(join(ROOT, 'index.html'), html);
if (!existsSync(join(ROOT, 'assets'))) mkdirSync(join(ROOT, 'assets'));
if (existsSync(join(ROOT, 'design/avatar.jpg'))) copyFileSync(join(ROOT, 'design/avatar.jpg'), join(ROOT, 'assets/avatar.jpg'));
console.log(`built index.html — ${papers.length} papers, ${labItems.length} lab items, stamp ${STAMP}`);
