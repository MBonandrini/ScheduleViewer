# Schedule Studio Professional v7.0.1

A static, single-user Primavera-style schedule viewer/editor and project-controls intelligence workbench for **Primavera P6 XER** and **Microsoft Project XML**.

## Run locally
The application is static. For the most reliable browser behaviour, serve the folder over HTTP rather than opening `index.html` directly.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a modern Chromium/Firefox browser.

## Deploy to GitHub Pages
1. Copy the complete contents of this release into the repository root.
2. Push to `main`.
3. In **Settings → Pages**, select **GitHub Actions**.
4. The included workflow runs `npm run test:exhaustive` before deployment. A failed test prevents deployment.

## Main V7 modules
- Projects / linked local schedule folder
- Activities + editable Gantt
- Progress Intelligence
- 50+ Schedule Assurance checks
- Revision Intelligence / Change Explorer
- Paths & Delay Navigator
- Local QSRA / Monte Carlo
- Resources & Cost profiles
- Dashboard Designer
- Report Studio

## Tests
Requires Node.js 22+.

```bash
npm run test:exhaustive
```

See `RELEASE_NOTES_V701.md`, `VALIDATION_V701.md` and `UPGRADE_V701.md` for changes, measured performance, test coverage, limitations and installation instructions.

The automated release gate passes 101 tests. Browser acceptance and Primavera P6 reference parity remain unverified; see the validation report before relying on recalculated outputs.

## Privacy
Schedule processing is local in the browser. The static GitHub Pages application does not upload opened schedule files to a Schedule Studio server. Browser permissions determine whether linked local folders can be remembered and/or written back.

See `EDITING_AND_SAVE_AS.md` for the new calculation mode, edit rules and Save As workflow.
