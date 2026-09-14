# Schedule Studio Professional v6.3.1

> Menu-state hotfix over the v6.3 P6 hierarchy/projects/resource-audit release.

# Schedule Studio Professional v6.3 — P6 Hierarchy, Projects Folder & Resource Audit

Full GitHub Pages source release for the single-user, browser-based Primavera P6 20.x-style schedule workbench.

## v6.3 highlights

- P6-style menu bar now dismisses on outside click or when another menu is opened.
- Activities and Gantt share one exact row model; selecting an activity no longer causes bar reflow or vertical drift.
- WBS grouping follows the true `parent_wbs_id` hierarchy and supports expand/collapse.
- Projects replaces the traditional EPS with a persistent user-selected local folder tree containing XER/XML schedules.
- Ctrl+S can write back to an opened schedule file or the selected Projects folder where browser permission allows.
- Start, Finish and % Complete are directly editable planning inputs; duration is recalculated, but F9 remains authoritative for network dates and float.
- Activity Details provide editable P6-style General, Status, Dates, Relationships, Resources, Codes and Constraints tabs.
- Resource Profiles provide detailed Histogram and S-Curve auditing by resource, WBS, activity code, status, date range, period, units/cost and Planned/Actual/Remaining/Forecast series.
- The time-phased audit table is always visible below the charts and can be copied as tab-separated data directly into Excel.

## Run locally

```bash
npm run verify
python3 -m http.server 8080
```

Open `http://localhost:8080` in a current Chrome or Edge browser. Folder access uses the File System Access API and therefore requires a secure context; localhost and GitHub Pages satisfy that requirement in supported Chromium browsers.

## Deploy

No build step is required. Upload the contents of this directory to a static HTTPS host such as GitHub Pages.

## Validation

See:

- `TEST_REPORT_V63.md`
- `REAL_XER_VALIDATION_V63.md`
- `P6_STYLE_FEATURE_MATRIX_V63.md`
- `RELEASE_NOTES_V63.md`

All schedule/model processing remains browser-side/local-first. For contractual use, continue validating calculated schedules against approved Primavera P6 golden schedules.


## v6.3.1 menu fix
Top-level application menus are mutually exclusive and close on outside click, command selection, repeat click, or Escape. See `RELEASE_NOTES_V631.md`.
