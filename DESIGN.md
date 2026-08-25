# DESIGN.md — afrodrig.github.io

The binding design contract for this site. Every visual decision below was settled with Andrés
on the design canvas (2026-08): https://claude.ai/code/artifact/31b5185e-11e5-4f76-bccf-dc8b74d29c00
Change this file only when a decision actually changes — the code follows this file, not the
other way around.

---

## 1. Identity & voice

- **Who**: Andrés F. Rodríguez — development economist and impact-measurement practitioner
  (Impact & Learning, Stanford Impact Labs). The site is a **bridge-builder** narrative:
  rigorous research on one side, usable impact practice on the other.
- **Audience**: academics AND philanthropy/social-impact people. Professional, never stuffy.
- **The test every page must pass**: "would any other researcher's site look like this?"
  If yes, it fails. No template energy, no AI-default patterns (see §9).
- **Copy voice**: first person, plain language, short sentences. Every paper gets a
  1–2 sentence plain-language takeaway; abstracts are secondary, behind a toggle.

## 2. Architecture — the "Ledger Scroll" (spine + record)

Rewritten 2026-08-23 (replaces the horizontal panel state machine, which read as "a bit
too much"). One vertical page: a **sticky identity spine** on the left, the **record**
(all content) scrolling on the right. **No global site chrome**: identity lives in the
spine; the record carries its own **section strip** (a column header, not a site nav —
see below). Generic wordmark-plus-links top navs remain banned (§9).

**Sections**: About (00), Research (01), Practice (02). Practice absorbs the former
Lab — case studies, essays, and shareable artifacts live in one section (decided
2026-08-23; the `content/lab/` folder still feeds the shelf boxes). There is NO
separate CV page — the spine carries portrait, role, contact, and the CV (PDF) link,
and `content/cv.yml` feeds the About page's vitae ledger (positions + education;
the rest of the web-CV data stays parked).

**The spine** (left column, `clamp(300px, 32vw, 430px)`, tinted `--color-panel`,
`position: sticky; top: 0; height: 100dvh`) — **STATIC** (amended 2026-08-23 evening:
Andrés cut the scroll-shrink morph; the photo stays prominent at every scroll depth):
- Name in display serif (two lines), role line, a mono **credentials line**
  (`site.yml credentials`; each `·`-separated segment wraps as a unit — never
  mid-phrase), then the **hero portrait** — a full-width RECTANGULAR block that
  absorbs the panel's leftover vertical space (flex-grow, `object-fit` crop at
  `50% 30%`, hairline border, square corners; the photo is the panel's anchor, not a
  badge) — then a casual location caption in body type ("Based in the Bay Area,
  California" — 2026-08-24, replacing the mono STANFORD, CALIFORNIA). Contacts
  anchored at the bottom, always visible: email displayed OBFUSCATED
  ("afrodrig [at] stanford [dot] edu"; the mailto link still works), the
  Scholar/GitHub/LinkedIn/CV row, and the tiny mono `UPDATED <stamp>` line
  (moved here from the retired colophon — a static home, 2026-08-24).
- **Manual collapse**: a 44px hairline-square button (chevron) beside the contacts
  collapses the spine to a 76px rail — small photo (40px circle, face-biased crop
  `50% 22%` — circles are for the small mark only), vertical name, chevron mark. The
  rail is **one whole click target** that expands the spine (merged from main c6aba8f),
  and it uses the shared vertical-bar hover language: **the accent edge** — a 3px
  `--color-accent` bar on its left edge, surface darkened one step to `--color-rule`,
  name to ink (merged from main 8c839f2). **Collapse motion simplified 2026-08-24**
  (the spring squeeze read as clunky): the faces keep their expanded layout (fixed
  width — no mid-flight text rewrap) and fade out fast (120ms) while the columns
  transition with plain ease-out (§6 conscious exception, no spring here); the rail
  crossfades in after the geometry lands.
- Retired with the morph (2026-08-23 evening): the compact masthead, the spine's
  section index, and the spine ledger-fill. Navigation now lives in the record's
  section strip.

**The record** (right column), top to bottom:
- **THE SECTION STRIP** (replaces the oversized typographic index, 2026-08-23 evening:
  "the hero headings were too big — a normal horizontal hero controlling navigation").
  Sticky at the record's top (`--nav-h` = 64px, paper background, hairline bottom):
  one serif title (20px) per section — `About · Research · Practice`. **No section
  numbers anywhere** (dropped 2026-08-24: the 00/01/02 ledger numbering read as
  clutter — in the strip, in section heads, and on shelf boxes alike). The entries
  are **ruled cells** — full-height hairline separators between them, like a
  ledger's column headers — and the active cell carries a **2px accent tab bar**
  that interrupts the strip's bottom hairline (amended 2026-08-24: the accent
  square read as noise; this shares the LIST/WHEEL toggle's underline convention).
  Hover is color-only — **nothing moves on targets you're about to click**
  (principle merged from main d0c41fe). Every entry returns to its section's START,
  from anywhere. Static (non-sticky) on mobile.
- **ABOUT** — a FULL PAGE of the record (amended 2026-08-23 late: "feels like a
  separate page" — nothing peeks from Research on landing). It fills the viewport
  below the strip (`min-height: 100dvh − --nav-h`), composed as a title page:
  the bridge statement as a display-serif lede (one marigold-banded phrase, no
  eyebrow, no heading) and the `NOW:` line anchored at the top; the **vitae
  ledger** anchored at the bottom — a ruled three-column strip of facts rendered
  from DATA (never hand-written copy): CURRENTLY (cv.yml positions[0]),
  EDUCATION (cv.yml education), FIELDWORK (the papers' own `country` fields +
  the Research eyebrow). The space between the two masses is deliberate.
- **RESEARCH** — a pinned track: the section wrapper is `100dvh + (papers − 1) × 55dvh`
  tall (ONE viewport basis everywhere — mixing vh and dvh made landings drift); its
  inner pane docks beneath the strip while page scroll rotates the Paper Wheel
  card-by-card (§8). Header is JUST the serif title over one context line
  ("Governance, public goods and beliefs — …") — **no eyebrow, no numbering, no date
  range** (cut 2026-08-24: "too much useless info around the title"); the
  `LIST / WHEEL` toggle + mono `01 / 05` pager sit right. Pin top padding is tight
  (28px). The detail spread is **vertically centered on the focal card's axis**. The
  mono **funder line** (`site.yml supported`) rides the pin's foot — it applies to
  all projects (moved from the page end, 2026-08-24). List view unpins the track and
  shows hairline-separated entries, year in a mono side column.
- **PRACTICE** — a full page (min-height 100dvh − --nav-h — a shorter last section
  can never scroll flush beneath the strip, max-scroll clamps short): bare serif
  title (no eyebrow), intro, then **THE SHELF** — one horizontally scrolled rail of
  uniform boxes sized so the whole composition (title → cards) sits inside one
  laptop fold; every piece (case study, essay, tool) is a box, and NOTHING in the
  section is loose text (decided 2026-08-23 late). Content reveals once on entry.
- **There is NO page footer** (colophon retired 2026-08-24: the EMAIL/GITHUB/… row
  duplicated the spine contacts). The `UPDATED <stamp>` line lives statically in the
  spine's contact block; the funder line lives in Research.

**Magnetic snap** (2026-08-23 evening — "the scrolling should fall into the right
place"): the page has exactly four desktop rest states — About (y = 0), the pinned
Research track (paper by paper), and Practice. The two transition zones between them
(About → track start; last paper → Practice) resolve automatically: when scrolling
goes idle inside a zone, the page glides to the boundary in the direction of travel.
No scroll hijacking — native scrolling is never intercepted, and a new gesture cancels
a glide in flight. Off on mobile, in list view, and under reduced motion.

**Deep links**: `#about`, `#research`, `#practice`, and per-paper `#/research/<slug>`
all work; scrolling updates the hash (replaceState) so the current paper is always
shareable. ESC returns to the top.

**Practice section anatomy** (re-amended 2026-08-23 late — content lives ONLY in the
boxes, and the section is sized as ONE PAGE: 48px top padding, 180px covers, so
head → shelf fits a laptop fold after the snap): intro line (one banded phrase
allowed), then **the shelf** — a horizontal scroll rail (`overflow-x: auto`,
snap-start, hidden scrollbar) of uniform boxes, ~400px wide, equal height. One box per piece, whatever its stream: `content/lab/`
pieces and `practice.md` items render identically, **real pieces first, placeholder
teasers last** (merged from main 75a6697). A box foot carries status left and links
right: any `extra_links:` (mono, muted → accent on hover) plus `OPEN →` in accent
when a live deliverable exists; `COMING SOON` only when there is nothing to link. Controls row above the rail:
hairline top rule, mono `01 / 04` counter left, hairline-square prev/next buttons
right (disabled at the ends; the whole row hides when everything fits). Box anatomy,
top to bottom: **cover art** (full-bleed top; original CSS/SVG art in the palette,
one composition per `kind` — dashboard bars, case-study timeline, essay manuscript
lines — never stock or borrowed illustration), mono eyebrow (`02 · ESSAY`), serif
title, optional 2–3 line description and mono key line, and a foot with status +
`OPEN →` in accent when a live deliverable exists (else `COMING SOON`). No marigold
inside boxes — the intro carries the section's one band. On mobile the shelf stays
horizontal (full-bleed gutters, ~86vw cards, next box peeking). Ends with the colophon.

**Photo**: the editorial portrait (`portrait.jpg`, recropped on main 2026-08-23 —
face + torso, hands kept; warm terracotta setting that echoes the accent red;
`avatar.jpg` retired) is the spine's hero block — full inner width, hairline border,
square corners, flex-grown to fill the panel's spare height (`object-position: 50% 30%`
keeps the face as it crops; mobile fixes it at 4:5). It is STATIC at every scroll
depth (the shrink-on-scroll morph was cut 2026-08-23 evening). The collapsed rail
repeats it as a 40px circle (face-biased crop `50% 22%`). **Circles are for the small
mark only; the hero is always a rectangle** (merged from main 2026-08-23).

**Colophon (the footer)**: there is NO global footer chrome. Contact lives permanently
in the identity panel/rail. Every scrolling section pane ends with a colophon row:
hairline top border, then `EMAIL · SCHOLAR · GITHUB · CV` in mono (EMAIL in accent) left,
and an `UPDATED <MON YYYY>` stamp right — the stamp is generated at build time, never
hand-maintained (the anti-staleness signal).

## 3. Typography

Exactly three families (2+1 rule), all Google Fonts, all roman — **italic headings are
banned**; italics only for emphasis inside body prose.

| Role | Family | Usage |
| --- | --- | --- |
| Display | **Lora** (400) | Name, section titles, paper titles. Leading 1.05–1.15. (Replaced Instrument Serif 2026-08-23 — too condensed/vertically stretched.) |
| Body | **Geist** (300/400/500) | Prose, UI, descriptions. Body 15–17px, line-height 1.55–1.6. |
| Meta | **Geist Mono** (400/500) | Eyebrows, labels, link rows, years. 10–12px, letter-spacing 0.06–0.14em, uppercase. |

- Scale ratio 1.25 (major third). Max ~5 sizes per page. Display max 56px (Lora runs
  wider than Instrument did — sizes trimmed accordingly).
- Measure: body text 45–75ch (`max-width: 65ch` default).
- Eyebrow/label + heading always stack vertically in one column — never label-left/title-right.
- Tabular numerals (`font-variant-numeric: tabular-nums`) on any data display.
- Real punctuation: " " — … never straight quotes or `--`.

## 4. Color — "Atlas Cooled" + marigold band

OKLCH-derived, cool-neutral paper. **No pure #FFF, no pure #000, no cream/warm paper**
(cream was explicitly rejected — nothing that reads orange/brown).

```css
:root {
  /* surfaces */
  --color-paper:        #FAFBFC;  /* page background */
  --color-panel:        #EEF1F4;  /* identity panel / rail tint */
  --color-panel-hover:  #F3F6F8;  /* section-panel hover tint */
  --color-rule:         #DFE4E8;  /* hairlines (1px) */
  --color-rule-strong:  #C8D1D8;

  /* ink (Deep Space Blue — no black anywhere) */
  --color-ink:          #0E2E42;  /* headings, titles, dark card fill */
  --color-ink-body:     #2C4356;  /* body prose */
  --color-muted:        #5B6C7A;  /* meta, descriptions (4.5:1 on paper — do not lighten) */
  --color-ink-inverse:  #EDF3F7;  /* text on dark cards */
  --color-muted-inverse:#B8C6CE;  /* meta on dark cards */

  /* roles */
  --color-accent:       #C1121F;  /* INTERACTIVE ONLY: links, active states, ENTER, focus */
  --color-accent-deep:  #780000;  /* pressed / deep-hover states only */
  --color-data:         #669BBC;  /* DATA ONLY: chart bars, wheel arc, map marks */
  --color-data-strong:  #4E7FA3;  /* data marks that need 3:1 (small icons, strokes) */
  --color-highlight:    #FFE38F;  /* MARIGOLD BAND DEVICE ONLY — see rules */
  --color-focus:        #C1121F;  /* focus rings: outline 2px, offset 1px, instant */
}
```

**Role rules (hard):**
- **Brick red = interactive.** Links, active nav marks, toggle underlines, focus rings.
  Never a background fill, never decorative. Under 5% of any viewport.
- **Steel = data.** Charts, the wheel's arc, figure marks, maps. Never for text under 24px
  (use `--color-data-strong` for small marks needing 3:1).
- **Marigold = the highlighter band.** At most ONE banded phrase per screen, inside body
  or lede text, marking the sentence that matters. Implementation — a band behind the
  x-height, never a fat underline, never a text color, never a fill:
  ```css
  .band { background: linear-gradient(180deg, transparent 38%, var(--color-highlight) 38%,
          var(--color-highlight) 92%, transparent 92%); }
  ```
- **Oxblood = pressed.** `:active` states of red elements. Nothing else.
- Dark surfaces (`--color-ink` fills) always pair with `--color-ink-inverse` text in the
  same rule. Key-figure convention: steel bars, ONE red standout bar.
- Contrast floors: body 4.5:1, large text/icons/focus 3:1. `--color-muted` is tuned to the
  floor — never lighten it.

## 5. Layout & space

- 4pt spacing scale only: 2/4/8/12/16/24/40/64/96/144. No arbitrary values.
- Hairlines are 1px `--color-rule`. Depth = weight and scale, never drop shadows.
  (One exception: the scroll-fade gradient at a scrolling pane's bottom edge.)
- Asymmetry is the default: uneven panel widths, bottom-anchored previews, varied section
  padding. Nothing centered-everything.
- No card-in-card. No rounded-corner + left-accent-stripe containers. Square corners
  throughout (radius 0) — the aesthetic is typeset print, not app UI.
- `html, body { overflow-x: clip; }` always.

## 6. Motion

Physics for geometry, easing for everything else. Engine: motion.dev springs (vanilla JS)
or hand-rolled FLIP; kinetics.colorion.co presets are approved sources.

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:  cubic-bezier(0.7, 0, 0.84, 0);
  --dur-micro: 120ms;  /* hovers, color shifts */
  --dur-short: 220ms;  /* content crossfade, previews */
  --dur-long:  420ms;  /* panel state changes (spring-driven) */
}
```

- **Springs** (interruptible, slight settle, no cartoon bounce): panel expand/compress,
  wheel rotation snap, preview rise. Reference: stiffness ~170, damping ~24.
- **Easing** (`--ease-out`): link hovers, crossfades, menu-row nudges (translateX 7px).
- Animate ONLY `transform` and `opacity`. Never width/height/top/left/margin/padding.
  **Conscious exception (amended 2026-08-23)**: the spine collapse may transition
  `grid-template-columns`, and the list-entry/abstract unfolds may transition
  `grid-template-rows`, both with the spring-flavored `linear()` curve — a FLIP
  implementation over text-filled columns distorts type mid-flight and isn't worth it.
  These two cases only; everything else stays transform/opacity.
- One orchestrated page-load reveal (staggered ≤500ms total, 60ms steps).
  IntersectionObserver reveal-once for sections entering the viewport. No parallax.
  No infinite loops.
- **Scroll-linked motion (the Ledger Scroll exception, 2026-08-23; identity morph
  REMOVED the same evening — the spine is static)** — exactly TWO scroll-driven
  behaviors exist:
  1. the **research track** — scroll progress through the pinned track sets the wheel's
     focal index, QUANTIZED card-by-card (the spring transition animates each snap;
     card positions are never raw-scrubbed; rAF-throttled, transform/opacity only);
  2. the **magnetic snap** — after scrolling goes idle inside a transition zone
     (About↔track, last-paper↔Practice), the page glides to the boundary in the
     direction of travel via native `scrollTo({behavior:'smooth'})`. Never intercepts
     a gesture; a new gesture cancels the glide.
  Nothing else may scrub or move on scroll. No decorative parallax, ever.
- **Nothing moves on hover on the thing you're about to click** (merged from main
  d0c41fe: moving click targets caused missed clicks). Hover states are color and
  background only; secondary glyphs (an arrow beside a row) may nudge via transform,
  the target itself never does.
- **All vertical bars share one hover language: the accent edge** (merged from main
  8c839f2 — a plain tint is invisible on a narrow bar, a full ink flood too heavy):
  3px `--color-accent` bar on the left edge + surface darkened one step. Currently
  applies to the collapsed spine rail.
- `@media (prefers-reduced-motion: reduce)`: all spatial motion collapses to opacity
  crossfade; the research track does not pin; the wheel renders as the list; the
  magnetic snap is off.

## 7. Components

- **Menu row (identity panel)**: serif entry ~29px + hairline top border on a wrapper div;
  hover transform lives on an INNER div (the rule must not move). Active: 6px accent
  square + accent-colored text.
- **Paper entry (list)**: year in mono side column · serif title · muted meta line
  (coauthors, method, country) · expanded state adds takeaway (≤60ch), key figure block,
  mono link row (`PAPER` in accent, rest muted).
- **Focal/dark card**: `--color-ink` fill, inverse text, mono tag with a 16–18px standout
  tick. Square corners.
- **Key figure block**: hairline border box, inline SVG chart (steel bars + one red),
  mono caption `KEY FIGURE — ANIMATES ON OPEN`. Every decorative SVG: `aria-hidden="true"`.
- **Collapsed rail**: small round photo top, vertical serif name, hairline-square expand
  button bottom.
- **Icons**: hand-drawn inline SVG, stroke-based, 1.5–1.7px stroke, one style site-wide.
  Emoji are banned as icons.

## 8. The Paper Wheel

Papers orbit ONE real circle — cards and the dashed arc share the same geometry, or the
wheel reads as fake. Spec (FLIPPED 2026-08-24 at Andrés's request — the wheel should
hug the OUTSIDE of the browser): radius R = 900px, circle center OFF-SCREEN RIGHT at
(focal-anchor-x + R, mid-height) — the wheel reads as physically mounted just beyond
the browser's right edge. The focal card sits at the circle's LEFTMOST point; each
step is 6° along the circle (x = +R(1−cosθ), y = R·sinθ, tilt ≈ −5.1°/step), so
receding cards drift toward the edge and may clip past it — that clipping is the
point. The arc path is drawn by JS through the cards' anchors at the current
container size (redrawn on open and on resize) — never a static decorative curve.
- At rest: focal card inked (`--color-ink` fill), neighbors recede (scale .94, reduced
  opacity, slight rotation following the arc). **The featured paper LEADS the sequence**
  (amended 2026-08-23 for the Ledger Scroll: the wheel is now a scroll narrative, so the
  featured paper is focal when the track pins and the rest trail below along the arc —
  the fan of trailing cards makes the circle read immediately).
- **Rotation driver**: page scroll through the pinned track (quantized snaps, §6), card
  clicks, and arrow keys — each jumps the page to that paper's scroll offset, so scroll
  position and wheel state never disagree. The wheel rolls into place (an arc-following
  entrance) the first time the track shows. The `SCROLL ROTATES THE WHEEL` hint fades
  out after the first rotation.
- Cards carry the paper's `short:` title (up to two lines) over a mono line of its
  `keywords:` (fallback: status · country). **Both track the real paper** (amended
  2026-08-24): `short:` is the paper title itself, or its pre-colon main clause when
  the full title is long; keywords echo the title's own terms.
- **The dissolve** (2026-08-24 — "the wheel should disappear so it doesn't clash"):
  the wheel is masked with a vertical fade (96px bands at the track's top and bottom),
  so receding cards dissolve before they can collide with the section head, the
  LIST/WHEEL toggle, or the funder line — while `mask-repeat: repeat-x` still lets
  cards ride out past the browser's right edge. The scroll hint sits OUTSIDE the
  masked element, anchored to the wheel column's foot.
- **Links row**: PAPER (accent, only when a PDF is actually hosted) · SLIDES · DATA,
  then any `extra_links:` (`[{label, url}]` — IGC blogs, policy briefs, project pages;
  merged from main 2026-08-24). Papers may legitimately have NO links (drafts marked
  do-not-disseminate stay unlinked); the row is omitted entirely then — never a dead
  or placeholder link.
- The detail spread (takeaway + links ONLY — the abstract toggle was cut from the
  wheel 2026-08-24, the unfold read poorly there; abstracts live in the LIST view)
  crossfades with each rotation, **vertically centered on the focal card's axis**.
  The focused paper is deep-linkable: `#/research/<slug>` (slug = paper filename,
  minus any year prefix).
- Accessibility: the wheel is a progressive enhancement over a semantic `<ul>` of papers.
  Keyboard operable; reduced-motion and mobile get the list.

## 9. Anti-slop gates (enforced subset — full source: github.com/Nutlope/hallmark)

Run before shipping any page. Every answer must be NO:
1. Generic top nav bar — wordmark-left + links-right + CTA button? (The record's
   section strip is the one sanctioned strip: numbered serif section entries in the
   record column only; identity stays in the spine, no wordmark, no buttons.)
2. Any italic heading or italic display type?
3. Pure #FFF/#000, cream/warm paper, or purple-blue gradient anywhere?
4. Eyebrow/label rendered BESIDE a heading (same row)?
5. Accent covering >5% of a viewport, or accent used as a background fill?
6. More than 3 font families? Outlier face in >2 slots?
7. `transition: all`, hover-scale on unrelated elements, or bouncy easing on UI state?
8. Animating layout properties (width/height/top/left/margin/padding)?
9. Centered-everything hero / `min-height: 100vh` with one centered sentence?
10. Fabricated metrics, placeholder names, lorem ipsum?
11. 3-equal-column icon-card grid? Card-in-card? Left-stripe accent cards?
12. Missing `:focus-visible`/`:active` states, or focus ring that fades in?
13. Horizontal scroll at any width 320–1920px? Clickable text wrapping to two lines?
14. More than one marigold band per screen?

## 10. Accessibility

- Semantic HTML first; the panel machine is an enhancement over real `<nav>` + `<section>`.
- Focus rings: `outline: 2px solid var(--color-focus); outline-offset: 1px;` — instant.
- All interactive targets ≥ 44px. Email visible in plain text.
- Contrast per §4. `prefers-reduced-motion` per §6. Decorative SVGs `aria-hidden`.

## 11. Responsive

- Breakpoint ~880px: the spine becomes a static header block (full-width 4:5 portrait,
  no collapse); the section strip goes static (non-sticky); the record follows as a
  plain vertical page; the research track does not pin; the wheel becomes the list;
  the LIST/WHEEL toggle hides; the magnetic snap is off.
- Grid-column springs don't run on mobile.
- Test at 320 / 375 / 768 / 1280 / 1440. No horizontal scroll ever.

## 12. References

- Design canvas (all mockups + decisions): https://claude.ai/code/artifact/31b5185e-11e5-4f76-bccf-dc8b74d29c00
- Anti-slop source rules: https://github.com/Nutlope/hallmark (skills/hallmark/references/)
- Spring presets: https://kinetics.colorion.co · Animation engine: https://motion.dev
- Style-guide format inspiration: https://styles.refero.design
