# Schedule Studio Professional v6.0 — P6-style Single-User Edition

A local-first browser project-controls workstation for Primavera P6 XER and Microsoft Project XML schedules. v6.0 reorganises the application into a dense desktop scheduling workflow inspired by professional Primavera usage while retaining the existing deterministic scheduling, forensic, resource, EVM, comparison, BIM and reporting engines.

## Main desktop structure

1. Application title/status bar
2. File / Edit / View / Project / Enterprise / Tools / Reports / Help menu bar
3. Compact command toolbar
4. Primary module tabs
5. Layout/filter strip
6. Activity table + synchronized Gantt
7. Bottom Activity Inspector
8. Project status bar

There is no long scrolling left navigation in v6.0.

## Single-user design

The application is deliberately single-user and local-first. It omits user administration, security profiles, team utilisation by user, workflow approvals, server database administration and concurrent editing. Project/schedule data remains local to the browser unless the user explicitly exports a file or package.

## Activities workspace

The Activities view includes:

- WBS-grouped activity table using WBS descriptions/codes rather than internal WBS IDs
- Activity ID / Activity Name / Original Duration / Remaining Duration / Start / Finish / % Complete / Total Float default layout
- synchronized vertical scrolling between table and Gantt
- draggable table/Gantt splitter
- baseline, actual, progress and current bars
- red critical bars and milestone symbols
- blue Data Date line
- black WBS summary bars
- squared relationship connectors
- Gantt zoom
- Layout / Filter / Group & Sort controls
- bottom Activity Inspector

Activity Inspector tabs include General, Status, Dates, Relationships, Resources, Expenses, Codes, Constraints, Notebooks, Steps, Risks, Trace Logic and Raw Data.

## Major P6-like functional areas exposed

- Projects / EPS
- Activities
- WBS
- Relationships
- Resources and assignments
- Roles
- OBS
- Calendars
- Activity Codes and UDFs
- Cost Accounts
- Resource Curves
- Issues / Risks / Work Products where the source XER contains them
- Baselines
- Schedule (F9)
- Resource Leveling
- Progress / EVM
- Layouts / Filters / Group & Sort
- Schedule Editor / Global Change-style editing workspace
- Logic diagnostics / Trace Logic / Float Paths
- Schedule comparison
- Forensic intelligence
- Schedule health / risk radar
- Trends / forecast intelligence
- Histograms / S-curves
- Reporting / narrative / lookahead
- BIM / 4D links and local viewer
- Project packages / local workspace

## GitHub Pages

Upload the contents of this folder to the root of a GitHub Pages repository. No backend is required.

## Testing

Run:

```bash
npm run verify
```

This performs module/import validation and the complete automated test suite.
