# Schedule Studio Professional v6.2 — P6 Editors & Resource Analytics

Single-user browser-based Primavera P6-style scheduling, editing, analysis and forensic project-controls workbench. All schedule processing remains local in the browser and the application is suitable for GitHub Pages/static hosting.

## v6.2 highlights

- Dashboard baseline finish + variance comparison, with late variance highlighted red.
- Activities use planner-facing WBS descriptions/codes rather than internal WBS IDs.
- P6-style Activity Columns chooser and saved-layout integration.
- Hardened Activity table/Gantt row-height alignment and synchronized scrolling.
- Relationship workspace with friendly Finish-to-Start / Start-to-Start / Finish-to-Finish / Start-to-Finish terminology plus local logic preview.
- Editable Resource Dictionary using native P6 `parent_rsrc_id` hierarchy.
- Add/edit/delete/move resources, resource rates and assignment-aware delete safeguards.
- Editable Resources & Costs assignment workspace.
- Resource Histograms/S-curves with resource hierarchy, type, role, WBS, status, activity-code and date filters; day/week/month/quarter buckets; units/cost; series toggles; horizontal compression; CSV export and underlying data.
- Weekly/monthly/quarterly resource periods align to true calendar boundaries.
- Editable calendar workbench with standard workweek, project-date calendar display and clickable exceptions.
- Native P6 numeric calendar exception dates are decoded correctly.
- Editable Activity Code and Task UDF definitions/values/assignments.
- Schedule Analysis graphics: severity distribution, WBS concentration and affected-activity timeline.
- Persistent P6-style command toolbar retained.

## Run

Serve the folder from any static web server or GitHub Pages. For local development:

```bash
npm run serve
```

Then open `http://localhost:8080`.

## Verify

```bash
npm run verify
```

This runs module syntax/import checks followed by the complete Node regression suite.

## Important parity note

The calculation engine is independent of Oracle Primavera P6. Imported P6 calculations remain available for comparison, and Schedule Studio surfaces calculation differences rather than silently claiming Oracle-equivalent results. The supplied real XER files were used as validation inputs but are not redistributed with this package.
