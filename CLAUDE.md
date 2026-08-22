# CLAUDE.md — afrodrig.github.io

Personal site of Andrés F. Rodríguez: development economist + impact-measurement
practitioner (Stanford Impact Labs). Full redesign in progress on this branch; the old
Hugo Academic rendered output in the repo root is legacy and will be replaced at launch —
don't extend it, don't imitate it.

## The two files that govern everything

- **DESIGN.md** — the binding visual contract (structure, tokens, typography, motion,
  anti-slop gates). Read it before writing any HTML/CSS/JS. If a change conflicts with
  DESIGN.md, the change is wrong or DESIGN.md must be consciously amended first.
- **content/** — all site content as data (below). Pages are rendered FROM these files;
  never hard-code bio text, paper titles, or links into HTML.

## Content model (how Andrés updates the site)

```
content/
  site.yml              # name, role, email, external links, section order
  bio.md                # landing identity panel: bridge statement + NOW line
  practice.md           # Practice section copy
  papers/*.md           # one file per paper (front-matter schema inside each file)
  lab/*.md              # one file per Lab artifact (dashboards, frameworks, datasets)
```

- **Add a paper**: copy an existing `content/papers/*.md`, edit the front matter
  (title, authors, year, status, country, method, takeaway, links), drop the PDF in
  `files/`. The `takeaway` is the 1–2 plain-language sentences shown in the Wheel —
  it is required; the abstract (markdown body) is optional.
- **Update the bio**: edit `content/bio.md` only.
- **Add a Lab item**: new file in `content/lab/` with title, status, link, one-line pitch.

## Working rules

- **Stack**: plain HTML/CSS/JS, zero dependencies. `node build.mjs` reads `content/` and
  generates `index.html` (NEVER edit index.html by hand — it's build output). Styles:
  `assets/tokens.css` (design tokens) + `assets/site.css` (layout/states). Behavior:
  `assets/site.js` (the panel state machine, hash routing, entry unfold).
  Preview locally: `python3 -m http.server 4173` (or the `site` entry in .claude/launch.json).
  After ANY content edit: run `node build.mjs` and commit both the content file and index.html.
- Hosted on GitHub Pages from this repo (afrodrig.github.io). The repo is public — nothing
  confidential ever goes in it.
- Before shipping any page, run the anti-slop checklist in DESIGN.md §9. All answers no.
- Never introduce: top nav bars, italic headings, cream/warm backgrounds, pure #FFF/#000,
  emoji icons, `transition: all`, animated layout properties, more than one marigold
  band per screen.
- Design changes are explored on the design canvas first, not in production code:
  https://claude.ai/code/artifact/31b5185e-11e5-4f76-bccf-dc8b74d29c00

## Current status (2026-08)

- DONE: design direction (Ledger × Index hybrid), palette (Atlas Cooled + marigold band),
  typography, motion rules, Paper Wheel spec — all in DESIGN.md.
- TODO: build script + real pages; content pass (bio and paper metadata below are seeded
  from the OLD site and need Andrés's updates — grep for `TODO(update)`); Lab items are
  placeholders pending real artifacts; launch swap (remove legacy Hugo output).
