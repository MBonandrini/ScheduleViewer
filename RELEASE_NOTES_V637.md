# Schedule Studio Professional v6.3.7

## Activities / Gantt
- Activity Start/Finish columns display calendar dates only; time-of-day remains available in the date/time editor.
- Editing Original Duration recalculates Finish using the assigned activity calendar while retaining Start.
- Editing Finish recalculates Original/Remaining Duration using the assigned activity calendar. Network dates still require F9 for CPM recalculation.
- Activity Columns dialog Add, Remove, Move Up, Move Down, Reset and Apply controls were rebuilt and browser-acceptance tested.

## Activity Details
- Rebuilt the lower Activity Details pane around the six requested P6-style tabs only: General, Status, Resources, Codes, Relationships and Notebook.
- General contains activity type, duration type, percent-complete type, calendar, WBS, responsible manager and primary resource controls.
- Status contains duration, status/actual dates, expected finish, suspend/resume, constraints, float and labour-unit fields.
- Resources, Codes, Relationships and Notebook use P6-style tabular panes and assignment/edit controls.

## Dashboard
- Removed the dashboard Gantt chart.
- Added a DCMA-style 14-point Schedule Health dashboard with Current, Threshold, Result and Basis columns.
- Added threshold graphics below the table for all fourteen checks.
- Baseline-dependent measures are shown as N/A until a Primary baseline is available.

## Validation
- Tested XER and Microsoft Project XML import paths.
- Tested Activity Columns add/remove/reorder workflow in Chromium.
- Tested date-only grid display with date/time picker preservation.
- Tested Duration -> Finish and Finish -> Duration synchronization against the activity calendar.
- Tested the exact six Activity Detail tabs and the 14-row/14-graphic health dashboard.
