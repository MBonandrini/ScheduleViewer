# Schedule Studio Professional v7.0.1 — review and validation

Review date: 17 September 2026. Input: Schedule_Studio_Professional_v7.0.0_LEAN.zip.

## Result and scope

The supplied application was reviewed and selectively refactored, preserving its static hosting architecture and existing interface. The final automated release gate passes **101 tests, zero failures and zero skips**. This is a tested maintenance release, not certification of exhaustive correctness or Primavera P6 equivalence. No user production schedules or P6-calculated reference outputs were supplied.

The original 18 tests passed before changes. Of the first 24 targeted hardening tests added during this review, 23 failed against the original code. Several failures cover variants of the same defect; this is not a claim of 23 independent bugs.

## Corrections

- CPM: zero-hour lag no longer snaps a finish endpoint into the next shift, correcting finish-to-finish and finish milestone calculations.
- CPM: 24-hour calendars no longer skip a day after a midnight endpoint. Backward calculations no longer lose one millisecond at midnight.
- CPM: explicitly nonworking calendars raise an actionable error instead of silently substituting weekdays. Calendar search/calculation horizons raise errors instead of returning partial results.
- XER: repeated sections merge field declarations, retaining earlier columns on export.
- Editing: newly introduced task, relationship, resource assignment and WBS fields are added to export schemas. New project data dates and calendar definition edits are preserved.
- WBS: batch reassignment validates all activities before changing any of them. Corrupt parent cycles are broken in the display tree only; original data remains available for diagnostics and export.
- Dates: impossible ISO-style project dates are rejected; explicit timezone offsets are respected. Invalid Date objects no longer produce malformed CPM output.
- QSRA: true Beta-PERT sampling replaces the clipped-normal approximation. Zero uncertainty produces constant results; completed activities and numeric zero remaining durations are handled correctly. Invalid factors, iterations, targets, duplicate task IDs and empty projects produce explicit errors.
- QSRA: simulation runs in a cancellable module worker. Results are cleared on edits, undo/redo, project changes and file/package loads. Completion while another view is open does not forcibly change that view.
- UI: global search retains focus after its results refresh; a stored null V7 UI preference no longer prevents startup; zero risk factors and seed zero are preserved.
- Offline cache: caches are scoped to this application and URL scope; unrelated app caches are retained, external traffic is ignored, and cache quota failures do not discard successful network responses.

## Editing and Save As follow-up

The follow-up request adds tested edit → F9 → XER export/reopen behavior, independent Physical/Duration % handling, existing-constraint protection, duplicate-code validation and per-project pending-calculation state. The calculation coordinator commits only successful results; failure does not pop a previous edit's undo entry.

Schedule Options now offers manual F9 (default) or automatic selected-project recalculation. All edit checkpoints conservatively invalidate calculated results, including resource/calendar changes. Nonimplemented advanced checkboxes in the schedule-options dialog are disabled and labelled.

Save As now has filename, format, explicit scope, pending-calculation choice, native picker and download fallback. Tests cover successful close, cancellation, write abort, extension mismatch and invalid filenames. Native browser picker interaction itself remains unverified. Saving a converted XML copy or requesting a download does not falsely clear the complete-workspace unsaved indicator. See EDITING_AND_SAVE_AS.md.

## Performance measurements

Linux, Node v24.19.0, median of three measured runs after one warm-up. Both versions ran in the same environment. These are computational benchmarks, not browser load times.

| Workload | Original | v7.0.1 | Measured speedup |
|---|---:|---:|---:|
| 180 activities, 179 links, 5,000 triangular QSRA iterations | 1,706.36 ms | 50.63 ms | 33.7× |
| 10,000 activities, 100-level WBS row construction | 808.33 ms | 29.63 ms | 27.3× |

The triangular risk benchmark retained its P80 result; WBS row counts were unchanged. PERT output intentionally changes because its distribution was corrected. See `validation/benchmarks.json` and `tests/benchmark.mjs` for reproducibility.

Changes remove repeated whole-network scans, repeated finish sorting, recursive WBS traversal, descendant array copying and repeatedly constructed sort collators. Gantt relationship endpoint lookup uses one DOM scan; date extrema no longer spread huge arrays into function arguments. The large application controller was not mechanically rewritten wholesale.

## Executed validation

- `npm run test:exhaustive`: 76/101 tests pass; 75 JavaScript modules pass syntax/import-path checks; 70 controller imports pass named-export checks.
- 34 visible commands and 35 visible views pass static wiring contracts. These checks do not establish that every click works.
- 79 cached assets exist; 57 static HTML IDs are unique; CSS structural and service-worker syntax checks pass.
- Independent forward-pass oracle: 200 generated DAGs, 12 tasks each, mixed FS/SS/FF/SF relationships with positive and negative lags. CPM dates and deterministic zero-uncertainty QSRA finishes match under 24-hour calendars.
- Calendar/scheduling cases: split shifts, weekends, holidays, partial working exceptions, zero-lag milestones, negative float, retained logic/progress override, external predecessors, constraints, suspension/resume, completed actuals and a simple capacity-constrained leveling case.
- 73 targeted date/scheduling/edit-save tests pass under `TZ=Europe/Dublin` and `TZ=America/New_York` in addition to the normal release run. This is not an exhaustive DST transition matrix.
- Stress: 50,000 activities / 99,997 relationships for assurance/network analysis; repeated 5,000-iteration risk runs; 20,000-level WBS row construction; 100,000-activity Gantt HTML generation. The last two test computation, not live DOM layout.
- Production risk-worker module executes in a real Node worker thread and matches synchronous results. Client cancellation, stale-result suppression and worker startup failures are covered by controlled worker doubles. This does not substitute for a browser module-worker test.
- Service-worker behavior is exercised in an isolated VM with mocked cache/network APIs, including cache ownership and quota failure.
- XER semantic round-trip, parser fuzz cases, filter operations, layouts, revisions, assurance, progress, editing/history and dependent deletion remain covered.
- Bundled sample exports to well-formed MSP XML and retains five non-summary activities, checked independently with Python ElementTree. Actual Microsoft Project import and XML browser import were not executed.

Evidence: `validation/test-run.log`, both timezone logs, and benchmark JSON. Historical V700 documentation is retained for reference and is not the current validation statement.

## Remaining limitations and follow-up priorities

1. **No live browser acceptance was completed here.** No browser binary was installed; Playwright's Chromium download repeatedly timed out. The optional `tests/browser-acceptance.mjs` was syntax-checked only and has not been certified to pass. Mouse/keyboard interactions, file/folder permissions, IndexedDB, offline reload, visual Gantt alignment, printing and mobile behavior require browser acceptance.
2. **P6 parity is unverified.** The engine is a custom scheduler. Complex multi-calendar relationships, leveling interactions, native calendar inheritance, shift/DST edge cases and version-specific P6 options require real reference schedules and expected outputs. Some existing settings, including open-end modes, activity splitting, leveling only within float and multiple-float-path calculation options, are not fully implemented in the CPM engine. Separate diagnostic path tools do not establish P6 multiple-float-path parity.
3. **QSRA remains an approximation.** It uses independent duration samples and 24-hour-equivalent arithmetic. Calendars, dated progress, constraints and external/unresolved relationships are not simulated. The UI discloses these assumptions. Criticality traces one driving path per iteration; tied paths are not all counted.
4. **Format conversion is not lossless.** XER/MSP conversion has existing semantic limitations, particularly calendars and product-specific fields. Validate exports in the target scheduling product before relying on them.
5. **Large live grids are not virtualized.** Better computation and 100k HTML generation tests do not guarantee smooth live-browser rendering at that size. DOM virtualization and incremental import would be the next substantial performance project.
6. The controller remains large. Further modularisation should follow a runnable browser acceptance baseline, especially around edit dialogs, persistence and rendering.

## Recommended user acceptance

Use copies of representative schedules. Compare imported activity counts, WBS, milestones, dates, calendars, relationships and resources. Exercise all required toolbar commands, editing/undo/redo, comparison, baseline, export/reimport and workspace restore. Compare F9 results to P6, particularly FF links and 24-hour calendars, because corrected calculations can differ from v7.0.0. Inspect A3 landscape Gantt and A3 portrait dashboard print previews. Confirm QSRA cancellation/navigation and offline reload. Keep the previous deployment until these checks pass.
