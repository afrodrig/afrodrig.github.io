# The Lab — content folder

One file per artifact Andrés builds and shares: interactive dashboards, frameworks,
rubric kits, open datasets. **All current items are placeholders** — the real first
Lab artifacts are still to be defined with Andrés.

Schema (front matter per item):

```yaml
---
title: "Portfolio learning dashboard"
kind: dashboard | framework | dataset | tool
status: live | in-progress | planned
pitch: "One line: what it is and who it's for."
link: ""          # live URL once it exists
repo: ""          # source, if open
order: 1
---
Optional longer description in markdown.
```

Landing-panel previews show `title` + a kind icon (hand-drawn SVG per DESIGN.md §7 —
chart bars = dashboard, stacked rows = framework, cylinder = dataset).
