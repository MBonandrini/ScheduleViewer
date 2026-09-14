# P6 20.x Golden-File Validation Plan

The product target is Primavera P6 Professional 20.x behavior for a single user. Development continues without real files, but production parity will be qualified when the user supplies representative P6 schedules.

## Inputs requested when available

1. A representative P6 20.x XER containing WBS, multiple calendars, milestones, constraints, progress, resources, costs, activity codes and UDFs.
2. A later revision of the same schedule.
3. A contractual/approved baseline if available.
4. A difficult schedule with out-of-sequence progress, negative float, Expected Finish, suspend/resume, external relationships or unusual calendars.
5. A short recording or written sequence of the user's normal P6 update workflow.

## Golden comparisons

For the same Data Date and calculation options compare, activity by activity:

- Early Start / Early Finish
- Late Start / Late Finish
- Total Float / Free Float
- Remaining Start / Remaining Finish
- Expected Finish behavior
- Suspend / Resume behavior
- Retained Logic / Progress Override / Actual Dates
- FS / SS / FF / SF relationships and signed lag
- Relationship lag calendar selection
- Multiple activity calendars and exceptions
- Primary/secondary constraints
- External relationships
- Longest/driving path
- Multiple float paths
- Resource-leveling results and priority ordering

Discrepancies remain visible through the Imported P6 vs Schedule Studio Calculation report. They are never silently described as Oracle-equivalent.
