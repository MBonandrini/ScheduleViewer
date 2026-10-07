# Schedule Studio Professional 8.1.1

Complete browser application, source code and automated build/tests. Visitors need only a modern browser. Personal AI keys are optional and AI is off by default. No application backend is required.

## Publish on GitHub Pages

1. Extract this ZIP into the root of your GitHub repository, including `.github/workflows/pages.yml`.
2. In Settings → Pages → Build and deployment, select GitHub Actions.
3. Push to `main`, or run the Test and Deploy GitHub Pages workflow.
4. Open the Pages URL displayed by the deployment.

GitHub's runner installs the browser DWG decoder, runs tests and deploys `dist`. End users do not install Node.js. The archive has not been deployed automatically.

## Local development

Use Node.js 22 or later on a development machine. Run `npm run setup:dwg`, then `npm start`. The start script prints the local address. `npm run test:exhaustive` runs the source and Node checks. Browser tests require Playwright and Chromium on the test machine. `npm run build:pages` prepares the static site.

## Updated controls

- Activities: Hours / Days / Weeks / Months, Days by default, also applied in the Status form. Calendar hours per period determine conversions; missing week/month values use 5 / 21.5 working days. The grid rounds Original Duration up; stored durations remain hours. Large grids use 250 display rows per page; full-project search, exports and printing remain available.
- WBS bands: Yellow (formerly Classic), Mixed, Blue, Green or Grey. Mixed uses eight distinct level colours, repeating for deeper hierarchies. Descriptions only, without codes or activity counts.
- Group and Sort: choose WBS or Activity codes, add code levels, drag to reorder, then Save layout. Missing code assignments appear under Unassigned.
- Reports: full-width workspace with no repository column; analytical reports moved here from Tools. AI execution and its repository remain limited to AI Studio.
- Close all schedules: Save / Save As, Discard or Cancel for changed schedules. Cancelling Save As keeps schedules open. Download-only browsers request confirmation before closing.
- Missing external/EPS root parent: warning on import, cleared in the XER/XML export copy. Genuine internal hierarchy errors still block export.

## Monte Carlo risk register

Paste Excel cells or CSV into the register box and choose Paste register. Required column order (or these headers):

Risk ID | Description | Probability % | Activity codes | Minimum hours | Most likely hours | Maximum hours

Use semicolons between activity codes. Each row is a shared event: occurrence and triangular impact are sampled once per iteration and applied to every linked unfinished activity. Different risk rows and underlying duration uncertainty are independent. This implements scenario-based systemic risk, not a pairwise correlation matrix. Probabilities must be 0–100 and impacts must satisfy 0 ≤ minimum ≤ likely ≤ maximum.

Monte Carlo is accessed from Reports; the duplicate standalone Risk tab has been removed. Results display whole days without changing calculation precision. Gauges and tooltips explain the results and model basis.

The outcome includes frequency and cumulative-probability charts, percentiles, mean, standard deviation, contingency, target confidence, driving-path criticality and event statistics. Download graphic report creates standalone HTML that can be printed to PDF. The last 20 assessments per schedule/project are retained locally and included in project-package saves; XER/XML do not include application-specific risk records.

The Monte Carlo engine uses 24-hour-equivalent duration approximations. It does not simulate calendars, constraints or dated progress and does not reproduce Primavera risk-engine finish dates. Criticality follows one driving path per iteration; tied paths are not all counted. These limitations are shown in the reports.

165 Node tests and 253 browser checks passed, including all 12 embedded report layouts and the standalone Monte Carlo print layout. Third-party license notices and required DWG source are included.
