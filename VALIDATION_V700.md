# Schedule Studio Professional v7.0.0 — Validation Report

Validation date: 16 September 2026

## Release gate
`npm run test:exhaustive` — **PASS**

## Static/module contracts
- 71 JavaScript modules pass Node syntax validation.
- 0 missing local module paths.
- 68 modules imported by `src/app.js` checked for named-export compatibility; 0 missing named exports.
- 57 IDs in `index.html`; all unique.
- `styles.css` structural brace check passes.
- Service worker JavaScript syntax passes.
- 75 service-worker cached assets resolve to real files.
- 33 visible menu/toolbar commands resolve through the command catalogue/handler surface.
- 35 visible views resolve to registered renderer targets.
- GitHub Pages deployment is blocked until the V7 exhaustive test job passes.

## Functional regression
18/18 Node functional/stress tests pass, including:
- XER parse and semantic XER round-trip.
- Deterministic CPM smoke calculation and cycle screen.
- 250 fuzzed XER record-value cases.
- Schedule Assurance catalogue (50+ checks) and explicit integrity defect detection.
- Advanced/nested filters and text/list/numeric/range/date/blank/regex operators.
- V7 Gantt/layout bar settings and layout JSON round-trip.
- Network components, merge/divergence hotspots and float paths.
- Progress intelligence and WBS performance.
- Revision history, throughput, categorized changes and direct date-movement evidence.
- Triangular, Beta-PERT, Uniform and Normal QSRA distributions.
- Fixed-seed Monte Carlo determinism and percentile ordering.
- Command-registry semantics.

## Stress / volume
- **50,000 activities / 99,997 relationships:** Schedule Assurance + Network Intelligence — PASS.
- **5,000 QSRA iterations / 180 activities:** volume and fixed-seed determinism — PASS.

## Format validation
- Bundled sample P6 XER loads and round-trips without semantic mutation.
- Microsoft Project XML export generated from the sample is well-formed XML and contains the expected Project/Task/Resource structures (validated with Python's XML parser).

## Browser acceptance limitation
A local HTTP server was successfully started and the application was reachable by HTTP. The container's installed headless Chromium process did not complete navigation/dump-DOM within the test timeout and emitted environment-level DBus/browser errors. Therefore this report **does not claim mouse-driven/headless browser acceptance**. Browser-sensitive contracts are instead covered by static UI wiring, module/export contracts, format tests, and the application’s startup/import error reporting.

## Release position
The package is suitable as the V7 single-user GitHub/local release candidate. Cloud collaboration, multi-user progress requests/approvals, and portfolio-trained forecasting remain deliberately deferred because they require authenticated server-side infrastructure.
