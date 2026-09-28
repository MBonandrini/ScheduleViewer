# Validation — 7.1.0

Executed in this workspace on 28 September 2026.

- `npm run test:exhaustive`: 123 passing Node tests, no failures or skips; module syntax/import checks, static UI checks and release/service-worker/menu contracts pass.
- Includes 22 new 7.1 feature tests covering checkbox unions, WBS names/ancestors, cyclic/orphan/deep WBS data, percent types, resource unit/cost conservation, daily-to-weekly/monthly aggregation, data-date joins, SVG grids, alternate-plan precision and business-key matching across different internal IDs.
- Existing stress coverage includes 50,000 activities / approximately 100,000 relationships and a 5,000-iteration risk simulation.
- The 22 new feature tests also pass in Europe/Dublin and America/New_York timezones.
- Real headless Chromium acceptance: 74 assertions, all 17 report selections, file import, rounded displays, filter unions/empty result, wrap/Gantt row alignment, red dashed data-date toggle, WBS hierarchy and column resizing, EVM/productivity/lookahead summaries, chart intervals/grids/compression, alternate planned-file import with budget substitution and unchanged actuals, full-precision CSV and selected-cell copy, menu removals and Save As extension/cancel.
- Three screenshots were inspected: Activities, Level 4 Progress and resource reports.

Commands and raw outputs: `validation/v710/`. Browser test: `tests/browser-v710.mjs`, exposed as `npm run test:browser`. It starts its own local HTTP server. Install Playwright and its Chromium runtime to reproduce (`npm install --no-save playwright`, `npx playwright install chromium`). This environment used a packaged Chromium binary after the normal browser download failed; runtime paths can be supplied through PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE.

The browser run caught and led to a fix for a CSS fixed-height rule overriding wrapped Gantt rows. A further empty-filter guard prevents observing a nonexistent table. These checks are regression evidence, not a claim of exhaustive browser/platform coverage or exact Primavera P6 numerical equivalence. See RELEASE_NOTES_V710.md for time-phasing and persistence limits.
