# Unified Schedule Studio v5.2 — Professional Layout Review

## 1. Sidebar visibility defect

### Problem
The navigation list was taller than the sidebar but the `nav` element itself was not scrollable. On shorter screens the later navigation buttons overflowed outside the dark sidebar and appeared over the light application background.

### Correction
- The application shell now uses `100dvh` and a fixed-height working area below the top command bar.
- The sidebar remains fully painted for the entire application viewport.
- The navigation list is the scrolling region (`overflow-y:auto`).
- The file/browser status footer stays pinned at the bottom of the sidebar.
- Navigation is divided into task-oriented sections: Plan, Analyse, Progress & Resources, Compare & Report, Models & Data, Workspace.
- The legacy early-collapse rules are overridden. Labels remain visible until the genuinely narrow 980px breakpoint, after which the sidebar becomes a compact icon rail.

## 2. Activities grouped by WBS

### Problem
The Activities viewer grouped rows by the internal P6 `wbs_id`, which is useful to the database but is not the description a planner expects to read.

### Correction
- WBS grouping now displays **WBS Description · WBS Code**.
- The WBS column uses the same planner-facing representation rather than the raw internal identifier.
- Calendar grouping/columns similarly prefer the calendar name while retaining its identifier.
- Layout settings now label the option as **WBS Description** rather than exposing `wbs_id` to ordinary users.

### Gantt alignment correction
The previous grouped Activities table inserted WBS group-header rows on the left, while the Gantt on the right rendered activity rows only. After each WBS group the vertical row alignment could drift.

v5.2 adds matching Gantt group rows and also retains an empty Gantt row for activities with invalid/missing dates. The table and Gantt therefore maintain a one-to-one visual row structure.

## 3. Dashboard / application-shell redesign

The layout was reviewed using current enterprise information-design principles: reduce command clutter, group functions by user task, maintain strong hierarchy, keep high-frequency information visible first, and reserve colour for meaning.

### Global command bar
Commands are grouped into:
- Project selection
- File/schedule actions
- Schedule calculation
- Undo/redo
- Secondary package/compare/theme actions

The command bar no longer wraps unpredictably. On constrained widths it scrolls horizontally rather than increasing its height and breaking the workspace geometry.

### Dashboard hierarchy
The dashboard now reads top-to-bottom as:
1. Current project identity and key dates
2. Four decision-oriented KPI cards
3. Project Snapshot and Planner Attention panels
4. Full-project schedule timeline

The primary KPIs are:
- Forecast Completion
- Baseline Variance
- Critical / ≤0 Float
- Logic Density

Schedule Health is presented as a status pill next to the project heading, while the Planner Attention panel surfaces the highest-volume schedule-health findings.

### Visual system
- Consistent 8–16px spacing rhythm
- Softer panel borders and shadows
- 10px panel radius
- Tabular numerics for schedule metrics
- Focus-visible states for keyboard navigation
- Semantic status colours for healthy / warning / risk states
- Reduced unnecessary decorative colour
- More consistent responsive behaviour for standard business laptops

## Remaining design principle
The application deliberately remains information-dense. It is a project-controls workstation, not a marketing dashboard. The objective is to make dense schedule information easier to scan without hiding underlying records or reducing analytical transparency.
