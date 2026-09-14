# v6.2 Release Notes

## Planner-facing improvements

1. Dashboard uses the Primary baseline for Baseline Finish and Finish Variance. Positive/later variance is shown as a risk/red condition.
2. Activities show WBS description/code, support field selection through Columns, and use matched grid/Gantt row heights.
3. Relationships use friendly relationship names and provide a selected-logic mini Gantt.
4. Resource Sheet is now a hierarchical Resource Dictionary with CRUD, parent movement, rates and assignment-aware deletion.
5. Resources & Costs assignments are directly editable.
6. Calendars have an editable standard workweek and project-range calendar view with date exceptions.
7. Activity Codes and task UDF definitions/assignments are editable/addable.
8. Schedule Analysis displays issue graphics for each selected rule.
9. Resource Profiles now include comprehensive filtering, date clipping, true calendar buckets, units/cost modes, series toggles, compression and CSV export.
10. P6 toolbar remains part of the persistent desktop shell.

## Additional defect found during real-XER testing

Native P6 calendars encode weekdays as `(0||1()...)` through `(0||7()...)`. The old decoder handled a shorter synthetic form more reliably than the real export structure. v6.2 now decodes the native structure and numeric/OLE-style calendar exception dates. This is covered by regression tests and the three real XER validation files.
