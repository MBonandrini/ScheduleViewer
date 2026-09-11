# Schedule Studio Professional v6.0 — Validation Report

## Automated regression

- `npm test`: **153 / 153 passed**
- JavaScript syntax/import validation: **70 files checked; all relative imports resolve**

The automated suite covers parser/serializer, CPM, all four relationship types, calendars, negative lag, constraints, cycles, WBS editing, resources, resource curves, baselines, BIM links/viewer, conversion, integrity, transactions, forensic comparison, package checksums, import hardening, diagnostics, EVM/productivity, scenarios, layouts/filters and the v6 P6-style shell.

## v6 UI structural checks

- Duplicate HTML IDs: **0**
- Missing HTML-linked assets: **0**
- CSS brace balance: **0 imbalance**
- Missing service-worker precache assets: **0**
- Menu groups found: File, Edit, View, Project, Enterprise, Tools, Reports, Help
- Primary module tabs include Projects, Activities, WBS, Resources, Analysis, Reports, Issues, Risks, Documents and Dashboard

## Production CPM stress

Using the actual v6 production `calculateCPM()` implementation in this container:

- 50,000 activities / 49,999 FS relationships: **50,000 results, 0 warnings, ~3.4 s**
- 100,000 activities / 99,999 FS relationships: **100,000 results, 0 warnings, ~6.6 s**

These timings are machine/container specific and are not browser performance guarantees.

## Browser visual smoke limitation

A direct headless Chromium screenshot/dump was attempted. Chromium in this container stalled on the environment's D-Bus/headless runtime and was terminated by timeout. This result is **not counted as a passed browser smoke test**. Static DOM/asset validation and the full Node regression suite were used instead.

For release qualification, open the GitHub Pages build in current Chrome/Edge and check Activities at 1920x1080, 1440x900 and 1366x768, including table/Gantt splitter, vertical scroll synchronization, menus and bottom inspector.

## Release status

All executable tests available in this environment are green. Exact Oracle Primavera calculation parity is not claimed; representative real P6 golden schedules remain the final conformance gate for obscure scheduling-option behaviour.
