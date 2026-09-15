# Schedule Studio Professional v6.3.8

## A3 printing
- Added a dedicated **Print A3** control to the Activities/Gantt view.
- Gantt printing uses A3 landscape, hides the normal application chrome and Activity Details pane, adds a professional report header, expands scrollable content for print, and automatically scales the current filtered/visible activity layout to a single sheet.
- Added a dedicated **Print A3** control to the Project Dashboard.
- Dashboard printing uses A3 portrait, adds a report header, tightens the DCMA table/graphics for print, and automatically scales the dashboard to a single sheet.
- File → Print Current View and Ctrl+P now route to the dedicated A3 layout when the current view is Dashboard or Activities; other views retain normal browser printing.

## Menu bar verification
- Audited every visible menu command, view target and raw-table target.
- Added a runtime menu wiring audit so missing command/view targets are reported immediately in the browser console during development.
- Corrected Undo/Redo/Paste enablement so both toolbar and menu entries reflect actual availability.
- Enterprise raw-table shortcuts now show the requested table or an explicit “not present in this schedule” message instead of silently falling back to TASK.
- Print Current View now uses the new view-aware print handler.
