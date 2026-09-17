# Installing or upgrading v7.0.1

1. In the existing app, export a project package and save copies of any edited XER/XML schedules. Browser-only workspaces should not be your only backup.
2. Keep a copy of the old website folder or GitHub commit for rollback.
3. Extract this ZIP to a new folder. The ZIP contains the complete application, not just changed files.
4. For local use, open a terminal in that folder and run:

   ```bash
   python3 -m http.server 8080
   ```

   On Windows with the Python launcher, use `py -m http.server 8080` instead.
5. Open `http://localhost:8080`. Use HTTP hosting rather than double-clicking index.html; risk module workers need a supported origin.
6. For GitHub Pages, copy the complete extracted contents into the existing repository root, including `src`, `sample`, `.github`, `sw.js` and `.nojekyll`. Commit and push. The included workflow runs the automated release gate before deployment.
7. Close existing app tabs, reopen the website and reload. Check that the title shows v7.0.1. If stale content remains, use a hard refresh. Avoid clearing all browser site data unless your local workspaces have been exported.
8. Open a schedule copy and follow the acceptance checklist at the end of VALIDATION_V701.md before replacing production scheduling outputs.

## Running the tests

Node.js 22 or later is required. The automated Node suite has no npm package dependencies:

```bash
npm run test:exhaustive
```

The existing script name "exhaustive" denotes the release gate; it does not mean every possible behavior is verified.

An optional browser acceptance script is included but was not run successfully in the review environment. To attempt it on a machine with browser download access:

```bash
npm install --no-save playwright
npx playwright install chromium
```

Keep the local HTTP server running in one terminal. In a second terminal, run:

```bash
npm run test:browser
```

The script checks sample import, navigation, risk worker completion and search, then saves screenshots in `test-artifacts`. It does not replace manual printing, folder permission, offline, or P6 comparison checks. Playwright is a development/test dependency only; do not upload node_modules or generated test screenshots to your live website.

To repeat the comparative benchmark, extract the original v7.0.0 ZIP separately and run:

```bash
node tests/benchmark.mjs /path/to/original-extracted-folder
```

On Windows, quote the folder path if it contains spaces. Benchmark results vary with hardware and other running processes.
