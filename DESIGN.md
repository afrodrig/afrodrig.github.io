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

**Sections**: Research (01), Practice (02). Practice absorbs the former Lab — case studies,
essays, and shareable artifacts live in one section (decided 2026-08-23; the `content/lab/`
folder still feeds the artifact cards). There is NO About/CV pane — the identity panel
already carries the short bio, contact, and the CV (PDF) link (decided 2026-08-22; the
web-CV content in `content/cv.yml` is parked for future use).

**State: LANDING** (grid at 1440px: `39fr / 33fr / 28fr`)
- Panel 1 — identity (tinted `--color-panel`): name (display serif, two lines), role line,
  then the **hero portrait** — a full-width rectangular block that absorbs the panel's
  leftover vertical space (flex-grow, object-fit crop; decided 2026-08-23: the photo is
  the panel's anchor, not a badge) — then the bridge statement (~65ch max, with one
  marigold-banded phrase), a `NOW:` line in accent mono, contact links at the bottom.
- Panels 2–3 — Research / Practice. Each: mono eyebrow (`01 · FOUR FIELD EXPERIMENTS`)
  stacked ABOVE a serif title (never beside it), 1–2 line description, then the preview
  as a **ruled ledger block** (amended 2026-08-23; the earlier bottom-anchored preview
  left a dead middle): hairline-separated entry rows flow down from the description
  (Research: short serif title over a mono keyword line from the paper's `keywords:` —
  years live in the section, not the landing; Practice: muted teaser title over a mono
  kind label), and **blank ruled lines at the same rhythm fill the remaining height,
  fading out** — the panel reads as a ledger page being filled in. No fanned/stacked
  cards (replaced 2026-08-23 — the mixed card states read as inconsistent).
- Hover on a section panel: background tints to `--color-panel-hover`; the `ENTER →`
  arrow nudges right. The `ENTER →` button is **always visible** (amended 2026-08-23:
  hover-reveal hid the affordance — discoverability beats minimalism). **Nothing moves
  on panel hover** — the earlier 8px preview rise moved click targets under the cursor
  and caused missed clicks (removed 2026-08-23).
- Every preview row is a real button with a **resting chevron** at its right edge
  (muted at rest — clickability is visible before hover). Hovering or focusing a row
  pops a **full-bleed card** behind it (near-white surface, strong hairline border,
  opacity-only) and turns the title + chevron accent; the chevron nudges right via
  transform. Research rows open the Wheel at that paper; Practice rows open Practice.
- The Research preview rows are INDIVIDUALLY clickable: each opens Research with the
  Wheel focused on that paper (hover: accent). The panel itself and ENTER open Research
  at the featured paper. Papers carry a `short:` display title so rows never truncate.

**State: SECTION OPEN** (e.g. Research; grid: `96 / expanded / 82`)
- Identity compresses to a 96px rail: monogram, vertical name (writing-mode: vertical-rl),
  back affordance at bottom. ESC or back restores LANDING.
- The opened section expands; the other sections compress to labeled slivers (number +
  vertical title) that remain clickable.
- Transition: panel widths spring to the new grid (interruptible); content crossfades in
  ~220ms AFTER the geometry lands. Never animate width via CSS transitions on layout
  properties — use transforms/FLIP or the spring library (§6).

**Research section anatomy**: header row (eyebrow + serif title left, `LIST / WHEEL`
toggle right; WHEEL is default on desktop). Wheel view: detail spread left (~60%),
**vertically centered on the focal card's axis** (the wheel's focal card sits at
mid-height; the detail shares that axis — amended 2026-08-23), the wheel at the right
edge (§8). List view: hairline-separated entries, year in a mono side column.

**Practice section anatomy** (amended 2026-08-23 — absorbs the former Lab; card stream
moved first and the word "artifact" retired from the UI per Andrés): intro line (one
banded phrase allowed), then immediately the **card stream** — a horizontally scrolling
row (`overflow-x: auto`, scroll-snap card by card, uniform ~520px cards, next card
peeking; a mono `SCROLL FOR MORE →` hint appears once there are 2+ cards; same
horizontal swipe on mobile at ~86vw per card). Card anatomy, top to bottom: **cover
image** (full-bleed top; original SVG art in the palette — never stock or borrowed
illustration), mono eyebrow (`01 · INTERACTIVE DASHBOARD` — number + kind, no category
word), serif title, 2–3 line description, mono key line (unbanded — the intro holds
this screen's band), attribution line, and `OPEN THE <THING> →` in accent linking to
the live deliverable. Below the stream, anchored above the colophon: **simple ruled
text lines** — a mono `IN PROGRESS` label plus one line per upcoming case study/essay
(title + mono kind). The content folder keeps its `content/lab/` name; only the
user-facing label is gone. Ends with the colophon.

**Photo**: the editorial portrait (`portrait.jpg`, 805×951, warm terracotta setting that
echoes the accent red) is the identity panel's hero block on the landing — full inner
width, hairline border, square corners, flex-grown to fill the panel's spare height
(`object-position` keeps the face as it crops; mobile fixes it at 4:5). It repeats as a
small **circle** (~40px, face-biased crop) at the top of the compressed rail in every
open-section state — the photo becomes the identity mark when the panel compresses.
Circles are for the small mark only; the hero is always a rectangle (amended 2026-08-23).

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
  **Conscious exception (amended 2026-08-23)**: the panel machine may transition
  `grid-template-columns`, and the list-entry/abstract unfolds may transition
  `grid-template-rows`, both with the spring-flavored `linear()` curve — a FLIP
  implementation over text-filled columns distorts type mid-flight and isn't worth it.
  These two cases only; everything else stays transform/opacity.
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
  slight rotation following the arc). The featured paper starts **mid-arc** (a neighbor
  above, the rest below) so the circle reads immediately — never top-of-stack.
- Scroll/arrow keys rotate the wheel, snapping card-by-card with the spring curve. The
  `SCROLL ROTATES THE WHEEL` hint fades out after the first rotation.
- The detail spread (takeaway, links, abstract behind an `ABSTRACT` toggle) crossfades
  with each rotation. The focused paper is deep-linkable: `#/research/<slug>` (slug =
  paper filename, minus any year prefix).
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
