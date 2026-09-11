# Unified Schedule Studio v5.2 — Validation Report

## Summary

- Automated regression tests: **148 / 148 passing**
- JavaScript syntax/import gate: **PASS — 69 JS files**
- New v5.2 layout/label/Gantt tests: **9 passing**
- Static HTML/CSS/service-worker validation: **PASS**
- Production CPM stress test: **PASS**

## v5.2 regression coverage

New tests verify:

- the sidebar is divided into navigation sections
- the sidebar navigation is independently scrollable
- the shell uses dynamic viewport height rather than page overflow
- legacy premature sidebar-collapse rules are neutralised
- Activities display WBS descriptions/codes rather than raw internal WBS IDs
- WBS group labels use the same planner-facing representation
- calendar labels prefer calendar descriptions
- Activity-table and Gantt WBS group rows are synchronised
- undated activities retain a corresponding Gantt row
- the redesigned Dashboard contains the intended professional information hierarchy

## Full inherited coverage

The complete suite continues to cover parsers, XER/MSP conversion, deterministic export, integrity gates, WBS/activity/relationship/resource CRUD, undo/redo, calendars, every relationship type, positive/negative lag, constraints, OOS progress modes, Expected Finish, resource curves/leveling, baselines, BIM links/GLB, layouts/filters, EVM/productivity, scenarios/history, forensic revision comparison, stable activity/relationship identity, health/risk analysis, forecast intelligence, package checksums, import hardening and project-controls reporting.

## Performance

A generated production-model FS chain was run through the actual CPM implementation:

- Activities: **50,000**
- Relationships: **49,999**
- Cycles: **0**
- Calculated results: **50,000**
- Cycle detection: approximately **260.8 ms**
- CPM calculation: approximately **2.60 s**

These measurements are environment-specific and are not browser performance guarantees.

## Browser visual smoke note

The container's Chromium process is unreliable for local-host screenshot automation because of its sandbox/DBus/network environment. The layout was therefore validated through source-level DOM/CSS assertions plus the full automated regression suite. Final visual acceptance should still be performed in the target Chrome/Edge browser at the organisation's standard laptop resolutions.
