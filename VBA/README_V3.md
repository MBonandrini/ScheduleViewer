# Excel Schedule Studio VBA v3.0 — Forensic Intelligence Edition

This release integrates the existing dual-format schedule editor/CPM toolkit with a forensic project-controls intelligence layer.

## Core workflow

1. Import Primavera P6 XER or Microsoft Project XML.
2. Inspect/edit WBS, activities, logic, calendars, resources, assignments and BIM links.
3. Calculate/F9 where required.
4. Store named revisions in the local in-memory repository.
5. Compare revisions and generate the Change Register / What Changed dashboard.
6. Trace critical/driving paths and explain date movement.
7. Run schedule health/risk/progress/resource analyses.
8. Build trends, forecast stability, lookaheads, narrative and reports.
9. Export XER, MSP XML, analysis workbook or PDF report pack.
10. Backup/restore repository revisions to a portable folder package.

## New forensic/intelligence modules

- `modRepository.bas`
- `modComparison.bas`
- `modMateriality.bas`
- `modCriticalIntelligence.bas`
- `modDateMove.bas`
- `modScheduleHealth.bas`
- `modTrendForecast.bas`
- `modResourceIntelligence.bas`
- `modDashboards.bas`
- `modNarrative.bas`
- `modLookahead.bas`
- `modReports.bas`
- `modGlobalSearch.bas`
- `modBackupRestore.bas`
- `modImportDiagnostics.bas`
- `modRawData.bas`
- `modAIContext.bas`
- `modForensicCommands.bas`
- `clsRevision.cls`
- `clsChangeRecord.cls`

## Raw vs calculated data

All XER records are now captured into `RawRecords` separately from the editable/calculated canonical model. Unknown/non-core XER tables remain in `ExtendedRecords` for round-trip preservation and dedicated extended-data views.

## Ribbon

The supplied `ribbon/customUI14.xml` adds Schedule, Calculate, Views, Intelligence, Reports, Repository and Quality groups. Ribbon callbacks remain thin adapters; business logic lives in reusable service modules.

## Installation

1. Create/open a macro-enabled `.xlsm` workbook in 64-bit Excel.
2. Import every `.bas` and `.cls` file from `src`.
3. Paste `ThisWorkbook.txt` into `ThisWorkbook`.
4. Run **Debug > Compile VBAProject**.
5. Run `InitializeScheduleStudio`.
6. Run `RunAllSelfTests`; the Tests sheet should report 40 tests with zero failures.
7. Embed `ribbon/customUI14.xml` with an Office RibbonX editor if desired.

## Important qualification

This environment does not contain desktop Microsoft Excel/VBE. The source has been extensively statically and independently tested, but the final authoritative release gate is Excel compilation plus the included Excel-runtime self-test suite on your target Windows/Office build.
