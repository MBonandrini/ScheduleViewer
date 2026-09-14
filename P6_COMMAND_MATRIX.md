# P6 Command Matrix — v6.1 Functional Command Layer

This matrix records the current single-user Primavera P6 20.x-style command surface. All active commands are routed through one command dispatcher so menu, toolbar and keyboard behavior stay consistent.

| Area | Command | Shortcut | Status | Current behavior |
|---|---|---:|---|---|
| File | Open Schedule | Ctrl+O | Functional | File dialog for XER/MSP XML with import diagnostics |
| File | Save Schedule | Ctrl+S | Functional | Saves in current source format via browser download |
| File | Save as XER | — | Functional | Integrity + conversion audit before XER export |
| File | Save as MSP XML | — | Functional | Integrity + conversion audit before XML export |
| File | Open/Save Project Package | — | Functional | Local portable project package |
| File | Export Current View | — | Functional | CSV export appropriate to active view |
| File | Print | Ctrl+P | Functional | Browser print of active view |
| Edit | Undo / Redo | Ctrl+Z / Ctrl+Y | Functional | Model snapshot history |
| Edit | Copy / Paste Activity | Ctrl+C / Ctrl+V | Functional | Copies activity plus assignments/codes/UDFs/notebooks; actual dates cleared on pasted activity |
| Edit | Find | Ctrl+F | Functional | Focuses global activity find/search |
| Edit | Add / Delete Activity | Insert / Delete | Functional | Cascade-safe activity CRUD |
| Edit | Relationships | — | Functional | FS/SS/FF/SF + lag; predecessor may be in another loaded project |
| Edit | Assign Resources | — | Functional | Assignment editor for units and costs |
| View | Columns | — | Functional | Opens layout definition / column manager |
| View | Group & Sort | — | Functional | Opens layout/group/sort manager |
| View | Filters | — | Functional | Opens P6-style filter manager |
| View | Zoom In / Out | Ctrl++ / Ctrl+- | Functional | Gantt zoom |
| Project | Schedule | F9 | Functional | CPM engine using P6 20.x compatibility defaults |
| Project | Schedule Options | — | Functional | P6-style options dialog: OOS, lag calendar, expected finish, suspend/resume, float, external logic, leveling |
| Project | Imported P6 vs Calculated | — | Functional | Preserves imported dates/float and reports calculation differences after F9 |
| Project | Update Progress / EVM | — | Functional | Progress update workflow + validation + EVM |
| Project | Level Resources | — | Functional | Finite-capacity leveling pass followed by recalculation |
| Project | Leveling Options | — | Functional | Opens resource-leveling section in Schedule Options |
| Project | Maintain Baselines | — | Functional | Project/Primary/Secondary/Tertiary baseline roles |
| Tools | Trace Logic / Float Paths | — | Functional | Calculation diagnostics and multiple float paths |
| Tools | Global Change / Schedule Editor | — | Functional | Structured schedule/table editor |
| Tools | Compare Revisions | — | Functional | Current vs previous schedule comparison |
| Resources | Resource Profiles | — | Functional | Histogram/S-curve/resource profiles |

## Prepared command IDs

The central registry also reserves stable IDs for future completion against the supplied P6 reference workflow: New Project, Close Project, Cut Activity, Find & Replace, Activity Steps, Expenses, Risks and Issues. Existing Risks/Issues/Steps data can already be viewed/edited through the canonical/raw and inspector surfaces; the prepared IDs allow P6-equivalent dedicated commands to be added without changing the command architecture.
