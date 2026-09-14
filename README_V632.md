# Schedule Studio Professional v6.3.2

This is the v6.3.2 hotfix baseline.

Key behaviour:

- Open any `.xer` or Microsoft Project `.xml` directly from **File → Open**, the toolbar, the welcome button, or **Ctrl+O**.
- Direct Open does **not** require a Projects/EPS workspace.
- Projects uses a user-selected local folder tree where browser capabilities permit it.
- Folder persistence is best-effort: if a browser cannot persist the directory handle, the selected folder remains available for the current session instead.
- Browsers without direct directory-handle support use a session/read-only directory-file fallback.

See `RELEASE_NOTES_V632.md` and `TEST_REPORT_V632.md` for details.
