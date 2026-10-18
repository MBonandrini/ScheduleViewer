# Schedule Studio Professional v8.5.0 — website release

Upload the CONTENTS of this ZIP to the root of the ScheduleViewer public repository. Preserve .github/workflows/pages.yml and .nojekyll. Choose GitHub Actions under repository Settings > Pages. The included workflow deploys main.

The website runs in the browser; end users do not install Node.js. This is a complete release, not a patch. Keep readable PRIVATE_SOURCE in your private repository.

To enable OneDrive, put your Application (client) ID into microsoftClientId in deployment-config.js before publishing. Keep auth.html and vendor authentication scripts. Do not add client secrets. The separate Entra_OneDrive_Setup_Guide_v8.5.0.html gives exact steps.

New: Assessment / Quality Centre, 17 configurable checks, named criteria profiles, WBS heatmap, Gantt drill-down, revision comparison, review actions, captured submissions, local portfolio and downloadable review reports.

Review history is stored in the browser and is not included automatically in OneDrive schedule shares. Export review backups before clearing browser data. Obfuscated browser code remains inspectable; obfuscation is not secrecy.

The release was prepared and tested locally; uploading this package does not itself configure Microsoft Entra or publish a repository.
