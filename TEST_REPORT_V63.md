# Schedule Studio Professional v6.3 — Validation Report

## Automated regression

- **185 / 185 automated tests passed.**
- Node test runner completed with 0 failures, 0 skipped and 0 cancelled.
- **83 JavaScript/test/support files** syntax-checked; all relative ES-module imports resolve.

## v6.3-specific regression coverage

New/updated tests cover:

- WBS parent-child hierarchy when identifier types differ.
- Exact shared Activities/Gantt row ordering.
- WBS collapse semantics without schedule-data mutation.
- Direct Start/Finish/% edits and calendar-aware duration recalculation.
- F9 separation: direct planning edits preserve calculated early dates.
- Duration-percent remaining-duration behaviour.
- XER/XML project-folder file filtering and folder-first sorting.
- File/folder write helpers used by Ctrl+S and Projects-folder saving.
- Menubar outside-click dismissal architecture.
- Gantt selection path does not call `renderGantt`.
- Always-visible resource audit table, Excel copy and cumulative variance data.
- Service-worker inclusion of v6.3 modules.

## Static package checks

- Duplicate HTML IDs: **0**
- Missing HTML assets: **0**
- Missing service-worker assets: **0**
- CSS brace imbalance: **0**
- Static HTTP asset checks: **PASS**

## Real P6 XER validation

All three supplied XERs were exercised through parsing, WBS hierarchy reconstruction, shared activity-row generation, resource profiles, calendar decoding, relationship labels, CPM preflight, direct planning edit, and XER serialize/reparse. See `REAL_XER_VALIDATION_V63.md`.

## CPM stress

| Activities | Relationships | Cycles | Results | Cycle detect | CPM |
|---:|---:|---:|---:|---:|---:|
| 50,000 | 49,999 | 0 | 50,000 | ~43 ms | ~0.97 s |
| 100,000 | 99,999 | 0 | 100,000 | ~112 ms | ~1.90 s |

Timings are container-specific and are not browser performance guarantees.

## Browser visual smoke limitation

A Chromium headless smoke run was attempted. The container Chromium process hangs on unavailable system D-Bus services and was terminated by timeout. This is an environment limitation and is **not recorded as a pass**. Final UI qualification should therefore still be performed in current Chrome/Edge at the intended desktop resolutions, particularly for File System Access permission flows and visual splitter/scroll behaviour.
