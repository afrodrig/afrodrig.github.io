#!/usr/bin/env node
// build.mjs — assembles index.html from content/ + assets/. Zero dependencies.
// Edit CONTENT in content/*.yml|md (text lives there, never here).
// Edit STRUCTURE in the render functions below. Run: node build.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const C = (p) => join(ROOT, 'content', p);

/* ---------- tiny YAML-subset parser (scalars, quoted strings, inline lists,
   block lists of scalars/maps at any nesting depth, folded `>` scalars) ---------- */
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
  // Assigns target[key] from a `key: rawVal` line already consumed at column `fieldInd`
  // (folded `>` text, or a nested map/list read via parseBlock, or a plain scalar).
  // Shared by top-level keys AND list-item fields, so a list nested inside a list-of-maps
  // entry (e.g. one `items:` entry with its own `extra_links:` list) parses correctly.
  function consumeField(key, rawVal, fieldInd, target) {
    if (rawVal === '>' || rawVal === '>-' || rawVal === '|') {
      const buf = [];
      while (i < lines.length && indentOf(lines[i]) > fieldInd) { buf.push(lines[i].trim()); i++; }
      target[key] = buf.join(' ').trim();
    } else if (rawVal === '') {
      const child = {};
      parseBlock(fieldInd + 1, child);
      target[key] = Array.isArray(child._list) ? child._list : child;
    } else {
      target[key] = parseScalar(rawVal);
    }
  }
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
        const dm = rest.match(/^([\w-]+):\s*(.*)$/);
        if (dm) {
          // list of maps: first key on the dash line, siblings (any depth) indented deeper
          const item = {};
          i++;
          consumeField(dm[1], dm[2], ind + 2, item);
          while (i < lines.length && indentOf(lines[i]) > ind && !lines[i].trim().startsWith('- ')) {
            const fieldInd = indentOf(lines[i]);
            const mm = lines[i].trim().match(/^([\w-]+):\s*(.*)$/);
            i++;
            if (mm) consumeField(mm[1], mm[2], fieldInd, item);
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
      i++;
      consumeField(m[1], m[2], ind, target);
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
// Also supports inline [text](url) links — same lite-markdown syntax as mdLite().
function band(text, phrase) {
  const e = esc(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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

const STAMP = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
const V = Date.now().toString(36); // asset cache-buster, refreshed every build
const authorsLine = (a) => (Array.isArray(a) && a.length) ? `with ${a.join(', ')}` : '';

// Section context line under the Research head (structural copy, not bio content).
const RESEARCH_DESC = 'Governance, public goods and beliefs — Sierra Leone, Zambia, Colombia.';

/* ---------- shared bits ---------- */
// Email shown obfuscated (the mailto link still works).
const emailLabel = (() => {
  const [local, domain] = String(site.email).split('@');
  return `${local} [at] ${domain.split('.').join(' [dot] ')}`;
})();
// Credential segments never break mid-phrase — each wraps as a unit.
const credline = String(site.credentials ?? '').split('·').map(s => s.trim()).filter(Boolean)
  .map(s => `<span class="cred-seg">${esc(s)}</span>`).join(' · ');

/* ---------- identity spine (sticky left panel) ---------- */
function identityAside() {
  return `
<aside class="identity" id="identity">
  <div class="id-full">
    <h1 class="display id-name">${esc(site.name).replace(' F. ', ' F.<br>')}</h1>
    <div class="role">${esc(site.role)}</div>
    ${credline ? `<div class="credline mono">${credline}</div>` : ''}
    <img class="portrait" src="assets/portrait.jpg" alt="Portrait of ${esc(site.name)}">
    <div class="id-loc">Based in ${esc(site.location)}</div>
  </div>
  <div class="id-foot">
    <div class="id-contacts">
      <a class="accent" href="mailto:${site.email}">${esc(emailLabel)}</a>
      <div class="identity-links">
        ${site.links.scholar ? `<a href="${site.links.scholar}">Scholar</a>` : ''}
        ${site.links.github ? `<a href="${site.links.github}">GitHub</a>` : ''}
        ${site.links.linkedin ? `<a href="${site.links.linkedin}">LinkedIn</a>` : ''}
        <a href="${site.links.cv}">CV (PDF)</a>
      </div>
      <div class="id-updated mono">UPDATED ${STAMP}</div>
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
    { key: 'about', title: 'About' },
    ...site.sections.map((s) => ({ key: s.key, title: s.title })),
  ];
  return `
<header class="record-nav-wrap">
  <nav class="record-nav" aria-label="Sections">
    ${items.map(it => `
    <a class="rnav" href="#${it.key}" data-idx="${it.key}">
      <span class="rnav-title">${esc(it.title)}</span>
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
  const interests = Array.isArray(site.interests) ? site.interests : [];
  return `
<section class="about" id="about">
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
      <div class="eyebrow mono">RESEARCH &amp; FIELDWORK</div>
      <p class="vita-line">${esc(interests.join(' · '))}</p>
      <p class="vita-line vita-sub">${esc(countries.join(' · '))}</p>
    </div>
  </div>
</section>`;
}

/* ---------- research: the pinned wheel track ---------- */

// Takeaway (plain-language bullets) is the default description; the full abstract is
// one click away via an inline TAKEAWAY/ABSTRACT toggle (2026-09) — same .view-toggle/
// .view-btn component as LIST/WHEEL, so it reads as the same kind of control. One
// shared state drives every paper at once (.track[data-desc]); a paper with no
// abstract just renders bullets with no toggle, never a dead button.
const paperDesc = (p) => {
  const bullets = Array.isArray(p.takeaway) ? p.takeaway : [p.takeaway].filter(Boolean);
  const toggle = p.abstract ? `
            <div class="view-toggle mono wd-desc-toggle">
              <button class="view-btn is-active" data-desc-set="takeaway">TAKEAWAY</button>
              <span class="muted">/</span>
              <button class="view-btn" data-desc-set="abstract">ABSTRACT</button>
            </div>` : '';
  return `
          <div class="wd-desc">${toggle}
            <ul class="wd-takeaway">${bullets.map(b => `<li>${band(b, p.highlight)}</li>`).join('')}</ul>
            ${p.abstract ? `<div class="wd-abstract">${mdLite(p.abstract)}</div>` : ''}
          </div>`;
};

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
  // List rows start CLOSED and stay minimal; a click unfolds the takeaway (the same
  // plain-language description the Wheel shows) + links.
  const entries = wheelPapers.map((p, i) => `
    <article class="entry" data-paper="${i}">
      <div class="entry-year mono">${esc(yearLabel(p))}</div>
      <div class="entry-main">
        <h3 class="entry-title">${esc(p.title)}</h3>
        ${authorsLine(p.authors) ? `<div class="entry-meta">${esc(authorsLine(p.authors))}</div>` : ''}
        <div class="entry-more"><div class="em-inner">
          ${paperDesc(p)}
          ${paperLinks(p)}
        </div></div>
      </div>
      <span class="entry-sign mono" aria-hidden="true"></span>
    </article>`).join('');
  return `
<section class="track" id="research" style="--steps:${wheelPapers.length - 1}" data-view="wheel" data-desc="takeaway">
  <div class="pin">
    <header class="section-head">
      <div class="head-stack">
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
          <div class="wd-eyebrow mono">${esc(p.status ?? '').toUpperCase()}</div>
          <h3 class="wd-title">${esc(p.title)}</h3>
          ${authorsLine(p.authors) ? `<div class="wd-authors">${esc(authorsLine(p.authors))}</div>` : ''}
          ${paperDesc(p)}
          ${paperLinks(p)}
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
      </div>
      <div class="wheel-hint mono">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 2v11M4 9l4 4 4-4"/></svg>
        SCROLL ROTATES THE WHEEL
      </div>
    </div>

    <div class="entry-list">${entries}</div>
    ${site.supported ? `<div class="supported mono">${esc(site.supported).toUpperCase()}</div>` : ''}
  </div>
</section>`;
}

/* ---------- practice (absorbed The Lab 2026-08-23) ---------- */
function practiceSection() {
  // ONE source (2026-09: folded content/lab/ into practice.md's items — every card on
  // the shelf, full schema, one file) rendered as uniform boxes on a horizontal rail.
  const boxes = (practice.meta.items ?? [])
    .map(it => (typeof it === 'string' ? { title: it } : it))
    .map(it => ({ title: it.title, kind: it.kind ?? 'Piece', status: it.status ?? '',
      pitch: it.pitch ?? '', keyline: it.keyline ?? '', link: it.link ?? '',
      link_label: it.link_label ?? 'Open', extra_links: it.extra_links ?? [], order: it.order ?? 99 }))
    .sort((a, b) => a.order - b.order);
  const kindKey = (k) => String(k).toLowerCase().split(' ').pop().replace(/[^a-z]/g, '');
  return `
<section class="practice-sec" id="practice">
  <header class="section-head" data-reveal style="--i:0">
    <div class="head-stack">
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
        <div class="eyebrow mono">${esc(c.kind).toUpperCase()}</div>
        <h3 class="lab-title">${c.link
          ? `<a href="${c.link}">${esc(c.title)} <span class="lt-mark" aria-hidden="true">&nearr;</span></a>`
          : esc(c.title)}</h3>
        ${c.pitch ? `<p class="lab-pitch">${esc(c.pitch)}</p>` : ''}
        ${/* no band here: the Practice intro already carries this screen's one marigold band */''}
        ${c.keyline ? `<div class="lab-keyline mono">${esc(c.keyline)}</div>` : ''}
        <div class="lab-foot">
          <span class="mono muted">${esc(c.status).toUpperCase()}</span>
          <span class="lab-foot-links">
            ${(c.extra_links ?? []).map(l => `<a class="mono" href="${l.url}">${esc(l.label).toUpperCase()} &nearr;</a>`).join('')}
            ${c.link ? `<a class="accent mono" href="${c.link}">${esc(c.link_label || 'Open').toUpperCase()} &nearr;</a>`
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
</main>
</div>
<script src="assets/site.js?v=${V}"></script>
</body>
</html>`;

writeFileSync(join(ROOT, 'index.html'), html);
console.log(`built index.html — ${papers.length} papers, ${(practice.meta.items ?? []).length} practice items, stamp ${STAMP}`);
