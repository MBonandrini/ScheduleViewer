# Schedule Studio Professional 7.1.0

This release implements the requested Activities, Progress and Reports changes. Version 8 and 8.1 have not been built.

## Activities
- Checkbox dropdown: All, Critical, In progress and Not yet started. Specific selections combine with OR. All resets the selection; deselecting every option shows no rows. Existing advanced filters remain additional restrictions.
- Original Duration rounds upward in the grid; Activity % Complete rounds to an integer without a percent sign. Grid edits are still supported. Unedited source values retain their precision in the detail form and exports. Duration units remain the application's existing hours.
- Wrap description checkbox, clipped Activity IDs and synchronized variable row heights between the grid and Gantt, including after column resizing.
- Show Data-Date checkbox controls a full-height red dashed line, saved with the active layout.

## Progress and WBS
- WBS Performance displays names and indented parent/child relationships. Parent totals include descendants; parent and child rows must not be added together.
- Columns resize by dragging their right edges or focusing the resize handle and using Left/Right arrow keys.
- Percent calculations respect Physical, Duration and Units Percent Complete Type.

## Reports
- Reports now offers a selector and quick tabs rather than only the builder.
- Progress Intelligence Levels 2, 3 and 4 include the hierarchy through the selected level. Project WBS root is level 1. Existing arithmetic-average WBS progress remains clearly labelled; project progress remains duration-weighted.
- Separate Histogram and S-Curve reports, combined resource report, WBS-indented six-week lookahead, and WBS summaries for EVM and productivity.
- Paths & Delay displays path durations, float and movement at zero decimal places; raw values remain available in exports.
- Dashboard entries and the main Resources & Cost tab are removed. Resource assignment editing remains available under View and the Resources toolbar button.

## Resource reports
- Alternate planned values can come from a separately loaded XER/XML, another project in the current file, a loaded comparison schedule or a loaded baseline. The selected project is explicit.
- Without filters, the alternate planned schedule contributes all its planned assignments. Filtered comparisons match Activity ID and, where selected, resource code/name or role code/name across exports; internal database IDs are not assumed stable. Unmatched entries do not acquire fabricated values.
- Daily distribution is the common basis for daily, weekly and monthly reports. Partial-day overlap and imported curve weights are applied before rollup. Actual and remaining totals are preserved. Remaining work is placed at or after the data date.
- Actual curves stop at the data date and forecast curves start at the same cumulative-actual point. Forecast then includes remaining work.
- Horizontal and vertical compression, independently selectable dotted grey gridlines, rounded audit display, full-precision Copy for Excel, selected-cell copy and CSV export.

## Scope and limitations
- Resource time-phasing is derived from assignment totals, dates and curve weights. It does not reproduce P6 stored financial-period actuals or every calendar-specific resource spreading rule. It is not certified as exact P6 parity.
- The previous release's CPM and Save As protections remain. Tests are synthetic regression/acceptance cases and the bundled sample, not a P6 comparison against the user's production schedules.
- Alternate planned-file selection and chart presentation controls are session state. Save As saves the current schedule/project package; loading an alternate plan does not overwrite it or silently bundle that additional source file.
- Browser acceptance was run in headless Chromium. Firefox/Safari and native operating-system file picker write permissions have not been visually verified in this environment.
