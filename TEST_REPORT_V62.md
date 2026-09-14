# v6.2 Software Validation Report

## Automated regression

- **175 / 175 tests passed.**
- **79 JavaScript/test/support files** passed syntax validation.
- All relative ES-module imports resolve.
- `npm run verify` completed successfully.

## Static package validation

- Duplicate HTML IDs: **0**
- Missing HTML/CSS local assets: **0**
- Missing service-worker precache assets: **0**
- CSS brace imbalance: **0**
- Static HTTP smoke: `index.html`, `app.js`, resource/calendar modules, CSS and service worker all returned HTTP **200**.

## Real Primavera XER validation

Three supplied XER schedules were parsed and exercised through resource, calendar, relationship, code/UDF, round-trip and CPM-preflight paths. See `REAL_XER_VALIDATION.md`.

- All 3: zero detected logic cycles.
- All 3: CPM calculation completed without warnings in non-strict validation mode.
- All 3: XER serialize → reparse preserved per-table row counts.
- All real calendars decoded, including numeric P6 exception dates.
- All relationships received planner-friendly relationship names.

## Performance stress

Production CPM engine, synthetic linear schedule:

- 50,000 activities / 49,999 relationships: cycle detection ~39 ms; CPM ~974 ms.
- 100,000 activities / 99,999 relationships: cycle detection ~61 ms; CPM ~1,966 ms.

Timings are container-specific and are not browser guarantees.

## Browser qualification

The package has source/static/HTTP validation in this environment. Final visual qualification should still be performed in current Chrome/Edge at common business-laptop resolutions because this environment cannot provide a fully reliable desktop browser rendering qualification.

## Release status

**Release candidate suitable for GitHub Pages/static deployment and further P6 golden-file parity testing.**
