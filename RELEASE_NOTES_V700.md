# Schedule Studio Professional v7.0.0

## Purpose
V7 moves Schedule Studio from a P6-style viewer/editor toward a broader project-controls intelligence workbench. The existing XER/MSP import, editor, Gantt, resource, baseline, calculation and forensic features are retained while a new analytical layer is added around them.

## New primary workspaces
- **Progress Intelligence** — duration-weighted planned/actual progress, SPI-style indicator, start/finish adherence, duration accuracy, revision throughput and WBS performance.
- **Schedule Health / Assurance** — 50+ transparent deterministic checks covering logic, constraints, float, duration, progress, dates, identity, WBS, calendars, resources and network structure. Findings can drill back into Activities.
- **Revision Intelligence** — named revision repository, change explorer, category filtering and per-activity history across revisions.
- **Paths & Delay Navigator** — top path analysis to any selected activity/milestone, network components, merge/divergence hotspots and a direct-evidence “Why Did My Date Move?” comparison.
- **QSRA / Risk** — seeded local Monte Carlo simulation with Triangular, Beta-PERT, Uniform and Normal uncertainty models, P10/P50/P80/P90 outcomes, histogram and criticality drivers.
- **Dashboard Designer** — configurable local widget catalogue, drag-to-reorder, width toggle, add/remove/reorder and browser print support.
- **Report Studio** — composable report blocks for project metadata, executive summary, assurance, progress, revision changes, paths, QSRA and lookahead; designed for browser Print/PDF.

## Activities / P6-style layout improvements
- Saved layouts now retain configurable Gantt bar settings in addition to columns, widths, grouping, sorting, row height and timescale.
- Layout definitions can be exported/imported as JSON.
- Advanced filter engine supports nested AND/OR groups and text, list, numeric, range, date, blank and regex operators. The existing layout screen exposes the common operators while the engine supports nested programmatic groups.
- Gantt rendering accepts configurable normal/critical/baseline/progress colours, bar height, labels and data-date visibility.

## Network and revision intelligence
- Network density, connected components, isolated activities, merge hotspots and divergence hotspots.
- Activity revision history tracks finish movement, duration, remaining duration, float, progress, calendar, predecessor count, resource count and criticality.
- Change Explorer categorises changes into Activities, Progress, Dates, Durations, Logic, Calendars, Constraints, Resources, Codes, WBS and Other.
- Date-movement evidence reports confirmed direct changes to finish/start, duration, calendar, constraints, actual dates and predecessor logic. It deliberately does not claim contractual causation.

## Command architecture
V7 introduces a central command registry foundation. Existing menus, toolbar controls and keyboard shortcuts still use the proven command catalogue, while executable handlers are registered through one command bus to reduce duplicate UI wiring.

## Deployment safety
The included GitHub Pages workflow now runs the complete V7 regression suite before deployment. Pages deployment is blocked if the tests fail.

## Test coverage used for this release
The release suite includes:
- syntax validation for every JavaScript module;
- local import-path validation;
- named import/export contract validation for `app.js`;
- XER parser and XER semantic round-trip tests;
- deterministic CPM smoke testing;
- 250 fuzzed XER record-value cases;
- 50+ schedule-assurance catalogue and defect-detection tests;
- all advanced filter operator families plus nested filters;
- network hotspot, component and path tests;
- progress, WBS performance and revision-throughput tests;
- revision history and categorised change tests;
- date-movement evidence tests;
- all four QSRA distributions and fixed-seed determinism;
- **50,000 activities / 99,997 relationships** assurance + network stress test;
- **5,000-iteration** QSRA volume/determinism test;
- service-worker asset existence checks;
- visible menu/toolbar command wiring checks;
- visible view-to-renderer wiring checks;
- test-gated GitHub Pages workflow contract.

## Important limitations / deliberately deferred items
- The V7 QSRA uses a local CPM/network simulation with a 24-hour-equivalent duration basis. It is useful for comparative uncertainty analysis but is not yet a full calendar-by-calendar probabilistic P6 calculation engine.
- “Why Did My Date Move?” reports confirmed schedule-data differences and path evidence. Exact forensic causal apportionment still requires replay/window analysis and contemporaneous project evidence.
- Cloud collaboration features such as multi-user progress requests, comments/mentions, approvals and portfolio-trained ML forecasts are **not** included in this single-user GitHub/local release because they require authentication, a backend database and controlled server-side permissions.
- Microsoft Project XML import is browser-DOM based. Automated Node tests validate MSP export structure and the shared format adapter contracts; the container’s Chromium installation could not complete a headless navigation session, so no mouse-driven browser acceptance test is claimed for this release.

## Version
**Schedule Studio Professional v7.0.0**
