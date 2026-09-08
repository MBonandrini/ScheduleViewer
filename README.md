# Unified Schedule Studio v4.1 — Quality-Hardened Build

Unified Schedule Studio is a local-first, GitHub Pages-ready project-controls application for **Primavera P6 XER** and **Microsoft Project XML**. v4.1 deliberately adds **no new user-facing features**; it hardens the existing v4.0 capability for integrity, determinism, maintainability, usability and scheduling fidelity.

## What changed in v4.1

### 1. Structural integrity gate
A new `src/integrity.js` validates cross-table references before critical operations. It checks duplicate/blank IDs, WBS parent integrity and cycles, activity→WBS/calendar references, relationship endpoints/types/lag, resource assignments and basic duration/progress validity.

Exports now stop rather than emitting a structurally broken schedule.

### 2. Atomic critical operations
`src/transaction.js` snapshots the canonical tables before a critical mutation and rolls back automatically if the operation throws or leaves new integrity errors. CPM result application now uses this rollback path.

### 3. Deterministic/non-mutating exports
`src/determinism.js` supplies stable row ordering and semantic fingerprints. XER and MSP XML exports now produce deterministic ordering where the domain has stable keys, and the UI verifies that exporting did not mutate the open schedule.

### 4. Safer schedule-local date handling
`src/date-local.js` avoids unnecessary UTC conversion for schedule timestamps. `p6Date()` now parses ISO-looking schedule dates explicitly as local project wall-clock values before using JavaScript's generic Date parser. This reduces DST/timezone-related date drift.

### 5. Clearer failure messages
`src/error-reporting.js` converts integrity/transaction failures into actionable messages and makes rollback behavior explicit.

### 6. Better conversion fidelity scoring
The existing XER↔MSP conversion audit now scores structure, logic, calendars, resources, custom fields and baselines with weighted category scores rather than subtracting a flat value per warning.

### 7. UI consistency/performance polish
Large table rows use browser rendering containment (`content-visibility`) to reduce off-screen rendering cost. Keyboard focus states, disabled controls, tabular numerics and reduced-motion behavior are now consistent across the application. Unsaved schedules also trigger the browser's close/navigation warning.

### 8. Code-quality gate
Run:

```bash
npm run verify
```

This performs JavaScript syntax checks, validates every relative module import and runs the complete automated regression suite.

## Architecture

The quality modules remain outside the feature domains:

```text
src/
├── integrity.js
├── transaction.js
├── determinism.js
├── date-local.js
├── error-reporting.js
├── format-adapters.js
├── parser.js / serializer.js
├── cpm.js / scheduling-options.js
├── editor.js / wbs-tools.js
├── resource-*.js
├── baseline / comparison / diagnostics modules
├── BIM / 4D modules
└── app.js
```

The underlying v4 capabilities remain unchanged: XER/MSP import/export, WBS/activity/logic editing, CPM/settings, resources, baselines, layouts/filters, diagnostics, EVM/productivity, history/scenarios, local workspace/project packages, BIM/4D and tutorial.

## GitHub Pages deployment

1. Extract the project into a GitHub repository.
2. Push to `main`.
3. Enable GitHub Pages for the repository.
4. Chrome or Edge is recommended for the broadest local-file and IndexedDB support.

The app remains static and browser-side. No schedule or BIM data is uploaded by the application.

## Verification status

- **115 / 115 automated tests passing**
- JavaScript syntax/import gate: **PASS**
- XER deterministic semantic round-trip: **PASS**
- MSP XML deterministic/non-mutating export: **PASS**
- integrity rollback test: **PASS**
- schedule-local DST/timezone regression checks: **PASS**
- 50,000-activity CPM benchmark: **PASS**
- static GitHub-style HTTP asset test: **PASS**

See `TEST_REPORT.md` for details.

## Production-use note

This remains an independent scheduling engine. For contractual use, maintain a controlled library of approved Oracle P6 and Microsoft Project golden schedules and compare Early/Late dates, float, project finish, leveling shifts and format round-trips whenever calculation logic changes.


## Final verification (2026-09-08)

- Edition: **Recommended Hardened Edition**
- Automated Node tests: **139/139 passing**
- JavaScript syntax/import gate: **67 JS files parsed; all relative imports resolved**
- HTML asset/ID validation: no duplicate IDs; no missing local index/service-worker assets
- Production CPM stress: 50,000 activities / 49,999 relationships: cycles 0, results 50,000, cycle 221.8 ms, CPM 2729.2 ms
- Additional production CPM stress: 100,000 activities / 99,999 relationships: cycles 0, results 100,000, cycle 430.3 ms, CPM 5866.9 ms
