# Schedule Studio Professional v8.0.1

Integrated source release: corrected Studio 7.1.0 plus Schedule AI Toolkit 3.0.1.
Local, single-user operation. No AI is selected by default. No Docker or account is required for the scheduling, reports or calibrated measurement functions.

## Publish on GitHub Pages

1. Extract this ZIP and put its contents at the root of your GitHub repository, including `.github/workflows/pages.yml`.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Push to `main`, or run **Test and Deploy GitHub Pages** from Actions. The workflow tests the source, prepares the pinned browser DWG decoder, builds the public `dist` folder, and deploys it.
4. Open the Pages URL shown by the deployment, normally `https://YOUR-NAME.github.io/YOUR-REPOSITORY/`.

Visitors only need a modern web browser. They do not install Node.js, Ollama, a converter or this ZIP. GitHub's build runner uses Node.js to prepare the website. No application backend or central AI key is required. This archive has not been deployed to your repository automatically.

## Personal AI settings

Open **AI Studio → AI Settings**, choose a provider, enter your own key and a model available to your account, save locally, test, then apply the model. No AI is selected by default. Keys remain in that browser profile, are excluded from exported project packages, and are sent only to the configured provider. Selected evidence is sent to that provider when you invoke AI. Model presets are editable; account availability and browser CORS support must be checked with the connection test. A valid key cannot override a provider's CORS restrictions.

Ollama is optional for users already running it with the site's origin permitted. Normal website use and personal cloud keys do not require it. Browser AI models may download model files on first use. No central login or cross-device data synchronization is provided.

## Drawings and schedule formats

PDF.js is bundled. The GitHub build prepares LibreDWG WebAssembly, so DWG decoding runs in the browser with no visitor setup. Supported 2D entities can be measured after calibration. Complex 3D/proxy entities may need a PDF export. The decoder's upstream source and GPL notice accompany the deployment.

Schedules use **XER or Microsoft Project XML**. Native MPP conversion has been removed; export XML from the originating application instead.

## Optional developer preview

Developers with Node.js 20+ can run `npm run setup:dwg`, `npm run build:pages` and `npm start`. This is a development workflow, not a requirement for hosted-site visitors.

## Working with schedules and baselines

- Use **Open** to select one or more XER/XML files. Each file is parsed separately; choose a file using **File**, then its project using **Project**. Matching IDs in different files stay separate. Invalid files are reported without stopping valid imports. Save each edited file before closing the browser; Save As exports the selected file, not every open file.
- **AI Studio** references the viewer's current schedules, loaded baseline files, comparison model and saved revision snapshots. Editing stays in Studio; opening an AI tool refreshes its analysis snapshot.
- Select the reference/baseline explicitly in the AI repository or individual comparison report. Project names and data dates are not proof of approved baseline status. P6 target dates are not silently treated as an approved baseline.
- Repository **Open selected schedule in Activities** transfers that source into the viewer. Each opened file retains its own edits and undo history during the session.
- Use **File → Save As → Schedule Studio Project Package (.ussproj)** for a portable workspace including the current AI repository's evidence, risks, claims, measurement register and authoring preferences. Native file handles, AI credentials and downloaded model weights are excluded. Linked evidence must be readable when saving.
- XER preserves loaded schedule tables; MSP XML is a selected-project conversion. Neither format can hold the AI evidence repository. The AI repository also has separate backup/restore controls. Restoring AI content creates a new workspace rather than overwriting an existing one.
- Keep downloaded backups: browser-local IndexedDB/localStorage is not an external backup. Use the same address and browser profile between sessions to see existing local data.

## Navigation

**Reports** uses one dropdown, without the removed duplicate button row. It includes the existing 7.1.0 reports plus Contractual Compliance, Progress Integrity, Float Paths, DCMA 14-Point, Why Date Moved, Delay Analysis, Forensic Review, Window Analysis, Calendar Analyser, Forecast Confidence, Nodes, Time Machine, Milestone Control and Resource Forensics.

**AI Studio**, immediately beside Reports, contains Contract Manager, Drawing Measurement, Manpower Breakout, Risk Analysis, Claims & Forensics, Schedule Builder and AI Settings. There is no Dashboard or standalone NotebookLM+ menu.

**Contract Manager** retains all four Toolkit 3.0.1 output types: HTML report, SVG graphic, CSV data extract and spoken briefing/script. Without AI, content is deterministic schedule content; it is not an AI interpretation of the contract. Checked PDF text layers can be included in AI context with page markers. Scanned PDFs need an external OCR/text conversion first. Audio uses the browser's installed voices; the downloadable output is its text script, not an MP3.

**Contractual Compliance** is separate from DCMA. Create/adopt a project-specific profile, enter source/revision/clause, threshold, severity and evidence notes. Five supported rule families cover negative lags, open ends, duration thresholds, negative float and manual evidence. Approval/document obligations remain “Review required”; documents supplied as examples are not automatically governing contracts. Import/export profiles as JSON.

**Nodes** supports saved drag positions and explicit dependency addition/update/deletion. It rejects self-links, duplicates and cycles before editing. Lag is in hours. Undo/Redo and F9 use Studio's existing model and scheduler. Large diagrams display up to 300 filtered nodes; all project activities remain available in the dependency controls.

**Drawing Measurement**: add PDF/DWG files to the repository, select a drawing/page, enter the requested metric, calibrate two points against a known distance, then trace/count. Length, count, area and area × depth volume are supported. Enter size/type, service, specification, revision and activity allocation. Measurements preserve source SHA-256, page, points, scale, timestamp and full precision. Export CSV for quantities and JSON for the complete audit. Manual quantity overrides are marked. This is user-confirmed take-off, not autonomous object recognition or 3D concrete extraction.

**Schedule Builder** retains the guided toolkit wizard. A no-AI draft scaffold is available as well as configured AI generation. Review the editable rows and transfer the draft into Activities. Transfer currently uses a declared standard 5-day/8-hour calendar; review actual project calendars, constraints and requirements before use. Invalid IDs, predecessor references and cycles are rejected. F9 uses Studio's deterministic engine.

## Validation and calculation limits

See **VALIDATION_V801.md**, **RELEASE_NOTES_V801.md**, **VALIDATION_V800.md**, **RELEASE_NOTES_V800.md** and **ARCHITECTURE_V8.md**. This release is not certified as numerically identical to Oracle P6. Use the existing imported-vs-calculated audit against your P6 exports. Toolkit forensic/path/forecast outputs are analytical indicators; their simplified network calculations are not a second scheduling authority or a contractual entitlement determination.

Version 8.1 has not been started. The next gate is acceptance with your actual drawing types, chosen AI provider and project-approved contractual profiles.

## Reproduce tests

- `npm run test:exhaustive` — syntax/import/package checks and all Node tests.
- Install Playwright/Chromium in your test environment, then `npm run test:browser` and `npm run test:browser:v8`.
- `XER_FIXTURE="/path/to/P3379-7 - B2-1.xer" npm run test:reference` — supplied four-project reference validation.
- After DWG setup: `DWG_FIXTURE="/path/to/2D.dwg" npm run test:cad`.

Browser runners accept `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` and JSON `CHROMIUM_ARGS` when using an existing browser installation. Your confidential XER and reference PDFs are not embedded in the distribution.
