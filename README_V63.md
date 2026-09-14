# Schedule Studio Professional v6.3

Single-user, browser-based Primavera P6 20.x-style schedule workbench. All schedule parsing, editing, calculation and analysis remains local in the browser. GitHub Pages or another static HTTPS host can serve the application.

## v6.3 focus

- Persistent P6-style menu and toolbar command system.
- Menus close when another menu is opened or the user clicks elsewhere.
- Activities grid and Gantt use one shared display-row model.
- WBS grouping follows `parent_wbs_id` recursively rather than treating WBS values as flat groups.
- Selecting an activity only changes selection state and the detail inspector; it does not rebuild/reorder the Gantt.
- Start, Finish and Activity % Complete are editable in the Activities columns. Start/Finish edits recompute planning duration against the activity calendar but do not overwrite calculated early/late dates until F9 is run.
- P6-like editable activity detail tabs for General, Status, Dates, Relationships, Resources, Codes and Constraints.
- Projects replaces EPS with a user-selected folder of XER/XML schedules. Chrome/Edge File System Access handles are stored in IndexedDB; Ctrl+S writes back when permission is available.
- Resource Profiles provide Resource/WBS/Code/Status/date filters, daily/weekly/monthly/quarterly intervals, units/cost mode, Planned/Actual/Remaining/Forecast series and horizontal compression.
- Time-phased resource audit data is always shown beneath the Histogram and S-Curve and can be copied as tab-separated data directly into Excel.

## Projects folder

Open **Projects** and select a project folder. The application scans subfolders recursively for `.xer` and `.xml` schedule files and renders them as a tree. The directory handle is stored locally in IndexedDB. Browser security can require the user to click **Reconnect Folder** after restarting the browser.

For best results use current Chrome or Edge over HTTPS (GitHub Pages is suitable). No file is uploaded to a server by Schedule Studio.

## Schedule editing

Changing Start, Finish or % Complete creates/updates planning inputs. The UI displays an **F9 required** warning. F9 remains authoritative for early/late dates, float and network-driven dates. Imported P6 calculation values remain available for comparison with Schedule Studio's calculation.

## Resource audit

Resource Histograms and S-Curves share one filter state. The table below the graphics includes:

- Period
- Planned
- Actual
- Remaining
- Forecast
- Forecast vs Plan
- Cumulative Planned
- Cumulative Actual
- Cumulative Forecast
- Cumulative Forecast vs Plan

Use **Copy Table for Excel** for tab-separated clipboard output or export CSV.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Chrome/Edge. Folder access requires a secure context; localhost is treated as secure by modern Chromium browsers.

## Validation

See `TEST_REPORT_V63.md` and `REAL_XER_VALIDATION_V63.md`. Desktop Chromium could not be used as an automated visual harness in the build container because its system D-Bus dependency hangs; this is explicitly reported rather than counted as a passing visual test.
