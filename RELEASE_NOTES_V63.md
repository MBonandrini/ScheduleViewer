# Release Notes — v6.3

## P6 menu behaviour
- File/Edit/View/Project/etc. menus close when the user clicks outside the menubar.
- Opening another top-level menu closes the previously open menu.
- Executing a menu command closes all menus.

## Activities / Gantt
- Rebuilt WBS grouping around true recursive `parent_wbs_id` hierarchy.
- WBS identity is normalized across numeric/string IDs to prevent false roots.
- Grid and Gantt consume the exact same row model.
- Activity selection no longer rerenders or reorders Gantt bars.
- Fixed row/header heights and stable scrollbar gutters improve vertical alignment.
- Added inline Start, Finish and % Complete editing.
- Planning date edits recalculate working duration using the activity calendar but require F9 for network calculation.
- Bottom Activity Details now provides editable P6-style fields and dropdowns for WBS, Calendar, Status, Relationships, Resources, Codes and Constraints.

## Projects replaces EPS
- Added persistent user-selected schedule folder using the File System Access API.
- Recursive tree view of folders and XER/XML files.
- Directory handle stored in IndexedDB.
- Open directly from the project tree.
- Ctrl+S writes back to the opened file when permission is available.
- Schedules opened outside the tree can save to the selected project-folder root.

## Resource analytics
- Resource selection follows the actual resource hierarchy.
- Resource, descendants, Resource Type, Role, WBS, Status, Activity Code, date range and interval filters.
- Daily, weekly, monthly and quarterly aggregation.
- Units/Hours and Cost modes.
- Planned, Actual, Remaining and Forecast visibility toggles.
- Horizontal chart compression.
- Always-visible time-phased audit table beneath charts.
- Excel-ready TSV clipboard copy.
- CSV export includes cumulative values and Forecast-vs-Plan variance.

## Toolbar
- P6-style command toolbar remains permanently available.
- Added generic Save command to the toolbar while retaining explicit XER/XML download options.

## Compatibility
- P6 Professional 20.x remains the default scheduling-compatibility profile.
