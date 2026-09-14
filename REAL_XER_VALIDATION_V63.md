# Real XER Validation — v6.3

The three user-supplied schedules were used as golden real-world inputs. The XER files themselves are not included in the release package.

| File | Activities | WBS | WBS roots | Hierarchy errors | Relationships | Resources | Assignments | Calendars | Cycles | XER round-trip |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| P3379-8.xer | 3,815 | 782 | 1 | 0 | 6,609 | 7 | 912 | 18 | 0 | PASS |
| NEWPROJ-1.xer | 412 | 68 | 1 | 0 | 278 | 2 | 291 | 2 | 0 | PASS |
| P3347-5.xer | 860 | 453 | 1 | 0 | 1,223 | 8 | 131 | 3 | 0 | PASS |

## WBS / Activities alignment validation

- **P3379-8.xer**: WBS tree reconstructed 782/782 WBS nodes; shared Activities/Gantt row model contained 3,815 activity rows with 3,815 unique activities; parent-child depth errors: **0**.
- **NEWPROJ-1.xer**: WBS tree reconstructed 68/68 WBS nodes; shared Activities/Gantt row model contained 412 activity rows with 412 unique activities; parent-child depth errors: **0**.
- **P3347-5.xer**: WBS tree reconstructed 453/453 WBS nodes; shared Activities/Gantt row model contained 860 activity rows with 860 unique activities; parent-child depth errors: **0**.

The Activities view intentionally omits empty leaf WBS bands when they contain no visible activity and are not an ancestor of a visible activity. Parent/ancestor bands required to preserve hierarchy remain visible.

## Resource profile validation

- **P3379-8.xer**: 832 daily / 126 weekly / 32 monthly / 13 quarterly buckets. Resource roots: 2.
- **NEWPROJ-1.xer**: 460 daily / 67 weekly / 17 monthly / 6 quarterly buckets. Resource roots: 1.
- **P3347-5.xer**: 0 daily / 0 weekly / 0 monthly / 0 quarterly buckets. Resource roots: 1.

P3347-5.xer contains resource assignment rows whose exported time-phased quantity/cost totals are zero, so zero histogram/S-curve buckets are expected rather than synthesized.

## Calendars / relationships

- **P3379-8.xer**: 18/18 calendars decoded; 1,916 exceptions; 6,609/6,609 relationships mapped to planner-friendly labels.
- **NEWPROJ-1.xer**: 2/2 calendars decoded; 145 exceptions; 278/278 relationships mapped to planner-friendly labels.
- **P3347-5.xer**: 3/3 calendars decoded; 225 exceptions; 1,223/1,223 relationships mapped to planner-friendly labels.

## Direct edit / F9 separation

- **P3379-8.xer**: direct planning edit **OK**; requires F9: `True`; imported/calculated early dates preserved before F9: `True`; working duration remained finite (120 h in the sampled activity).
- **NEWPROJ-1.xer**: direct planning edit **OK**; requires F9: `True`; imported/calculated early dates preserved before F9: `True`; working duration remained finite (8 h in the sampled activity).
- **P3347-5.xer**: direct planning edit **OK**; requires F9: `True`; imported/calculated early dates preserved before F9: `True`; working duration remained finite (112 h in the sampled activity).

## CPM / round-trip

- **P3379-8.xer**: cycles = 0; CPM preflight = **OK**; project finish = `2027-12-14T17:00:00.000Z`; warnings = 0; XER table row-count differences after serialize/reparse = 0.
- **NEWPROJ-1.xer**: cycles = 0; CPM preflight = **OK**; project finish = `2026-04-17T17:00:00.000Z`; warnings = 0; XER table row-count differences after serialize/reparse = 0.
- **P3347-5.xer**: cycles = 0; CPM preflight = **OK**; project finish = `2026-12-23T08:00:00.000Z`; warnings = 0; XER table row-count differences after serialize/reparse = 0.
