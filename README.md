# Unified Schedule Studio v5.2 — Professional Layout

Full GitHub Pages source release. This package contains the entire application, not only the v5.2 layout deltas.

## v5.2 layout corrections

- Sidebar is full-height and independently scrollable; navigation no longer spills into the content canvas.
- Navigation is reorganised into professional planner-oriented groups.
- Activities display WBS description + WBS code rather than raw internal `wbs_id`.
- Calendar labels use calendar name + ID.
- Grouped Activity table and Gantt now render matching WBS/group rows to preserve vertical alignment.
- Undated activities retain an empty aligned Gantt row.
- Dashboard information hierarchy, spacing, command bar, cards and planner-attention panel were tightened for business-laptop use.
- Responsive sidebar behavior is retained for narrower screens.

## Run locally

```bash
npm install
npm run verify
npm run serve
```

No build step is required for GitHub Pages.

## Deploy

Upload the contents of this directory to a GitHub Pages repository and publish from the repository root (or the configured Pages branch).

## Important

All schedule/model processing remains browser-side/local-first. Validate calculated schedules against your approved Primavera P6 / Microsoft Project golden files before contractual use.
