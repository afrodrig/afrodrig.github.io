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

## 2. Architecture — the "Ledger × Index" hybrid

One page-level state machine. The viewport is divided into vertical panels; **no top nav bar
exists anywhere**.

**Sections**: Research (01), Practice (02), The Lab (03). There is NO About/CV pane —
the identity panel already carries the short bio, contact, and the CV (PDF) link
(decided 2026-08-22; the web-CV content in `content/cv.yml` is parked for future use).

**State: LANDING** (grid at 1440px: `560 / 380 / 260 / 240`)
- Panel 1 — identity (tinted `--color-panel`): name (display serif, ~62px, two lines),
  role line, bridge statement (~65ch max, with one marigold-banded phrase), a `NOW:` line
  in accent mono, contact links anchored at the bottom.
- Panels 2–4 — Research / Practice / The Lab. Each: mono eyebrow (`01 · FOUR FIELD
  EXPERIMENTS`) stacked ABOVE a serif title (never beside it), 1–2 line description,
  bottom-anchored preview (Research: fanned paper cards; others: hairline-separated lists).
- Hover on a section panel: background tints to `--color-panel-hover`, preview rises 8px,
  `ENTER →` affordance appears. All springs (§6).
- The Research preview's stacked paper cards are INDIVIDUALLY clickable: each opens
  Research with the Wheel focused on that paper (hover: accent border). The panel
  itself and ENTER open Research at the featured paper.

**State: SECTION OPEN** (e.g. Research; grid: `96 / expanded / 82 / 82`)
- Identity compresses to a 96px rail: monogram, vertical name (writing-mode: vertical-rl),
  back affordance at bottom. ESC or back restores LANDING.
- The opened section expands; the other sections compress to labeled slivers (number +
  vertical title) that remain clickable.
- Transition: panel widths spring to the new grid (interruptible); content crossfades in
  ~220ms AFTER the geometry lands. Never animate width via CSS transitions on layout
  properties — use transforms/FLIP or the spring library (§6).

**Research section anatomy**: header row (eyebrow + serif title left, `LIST / WHEEL`
toggle right; WHEEL is default on desktop). Wheel view: detail spread left (~60%),
the wheel at the right edge (§8). List view: hairline-separated entries, year in a
mono side column.

**Practice section anatomy** (settled: case studies + essays — NOT a services page):
intro line (one banded phrase allowed), then two streams in an uneven grid (~1.25fr/1fr):
CASE STUDIES — serif-titled entries using the expanded-entry pattern (title, 1–2 line
context, mono links; may cross-link into Lab artifacts, e.g. `THE RUBRIC → LAB`);
ESSAYS — dated list rows (title + mono year). Ends with the colophon.

**Lab section anatomy** (settled: card carousel): intro clause in the header row, then a
carousel of artifact cards — focal card centered (~600px), neighbors peeking from the
panel edges, prev/next hairline-square buttons, numbered mono pagination (active number
on a small red square) + `NN / NN` counter. Card anatomy, top to bottom: **cover image**
(full-bleed top; original SVG art in the palette — never stock or borrowed illustration),
mono eyebrow (`ARTIFACT · 02 · INTERACTIVE DASHBOARD`), serif title, 2–3 line
description, ONE marigold-banded key line (focal card only), attribution line, and
`OPEN THE <THING> →` in accent linking to the live deliverable (external or self-hosted).
Cards spring across on navigation; on mobile the carousel becomes a swipeable
single-card column.

**Photo**: the real portrait (`avatar.jpg`, 270×270 from the current site) lives in the
identity panel on the landing (~128px square, hairline border), and repeats small
(~40px) at the top of the compressed rail in every open-section state — the photo
becomes the identity mark when the panel compresses.

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
| Display | **Instrument Serif** (400) | Name, section titles, paper titles. Tight leading 1.0–1.12. |
| Body | **Geist** (300/400/500) | Prose, UI, descriptions. Body 15–17px, line-height 1.55–1.6. |
| Meta | **Geist Mono** (400/500) | Eyebrows, labels, link rows, years. 10–12px, letter-spacing 0.06–0.14em, uppercase. |

- Scale ratio 1.25 (major third). Max ~5 sizes per page. Display max 62px.
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
- One orchestrated page-load reveal (staggered ≤500ms total, 60ms steps). No scroll-driven
  scrubbing; IntersectionObserver reveal-once only. No parallax. No infinite loops.
- `@media (prefers-reduced-motion: reduce)`: all spatial motion collapses to opacity
  crossfade; the wheel renders as the list.

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
- **Sliver panel**: mono number top, vertical serif title, optional 6px accent dot bottom.
- **Icons**: hand-drawn inline SVG, stroke-based, 1.5–1.7px stroke, one style site-wide.
  Emoji are banned as icons.

## 8. The Paper Wheel

Papers orbit ONE real circle — cards and the dashed arc share the same geometry, or the
wheel reads as fake. Spec: radius R = 900px, circle center off-screen LEFT of the wheel
column at (focal-anchor-x − R, mid-height); the focal card sits at the circle's rightmost
point; each step is 6° along the circle (x = −R(1−cosθ), y = R·sinθ, tilt ≈ 5.1°/step).
The arc path is drawn by JS through the cards' anchors at the current container size
(redrawn on open and on resize) — never a static decorative curve.
- At rest: focal card inked (`--color-ink` fill), neighbors recede (scale .92, 60% ink,
  slight rotation following the arc).
- Scroll/drag/arrow keys rotate the wheel; it carries momentum and snaps card-by-card
  with a spring (slight overshoot, natural settle, interruptible).
- Click unfolds the focal card into the detail spread: takeaway + key figure animate in,
  links row. ESC or scroll folds back.
- Accessibility: the wheel is a progressive enhancement over a semantic `<ul>` of papers.
  Keyboard operable; reduced-motion and mobile get the list.

## 9. Anti-slop gates (enforced subset — full source: github.com/Nutlope/hallmark)

Run before shipping any page. Every answer must be NO:
1. Top nav bar with wordmark-left + links-right + hairline? (Navigation is vertical panels.)
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

- Breakpoint ~880px: panels become stacked full-width rows (identity first, as a compact
  header card); slivers become rows; the wheel becomes the list; the LIST/WHEEL toggle hides.
- Panel-grid springs don't run on mobile — plain section navigation.
- Test at 320 / 375 / 768 / 1280 / 1440. No horizontal scroll ever.

## 12. References

- Design canvas (all mockups + decisions): https://claude.ai/code/artifact/31b5185e-11e5-4f76-bccf-dc8b74d29c00
- Anti-slop source rules: https://github.com/Nutlope/hallmark (skills/hallmark/references/)
- Spring presets: https://kinetics.colorion.co · Animation engine: https://motion.dev
- Style-guide format inspiration: https://styles.refero.design
