# Schedule Studio Professional v6.3.2 — Direct Open & Project Folder Persistence Hotfix

## Fixed

- **File → Open**, toolbar **Open**, welcome-screen **Open schedule file**, and **Ctrl+O** now use a dedicated schedule-file picker that is completely independent of the Projects workspace.
- Where the File System Access API is available, direct Open retains a writable file handle so **Ctrl+S** can write back to that same file after permission is granted.
- Where that API is unavailable or fails, Open falls back to the standard browser file input and can still load `.xer` and `.xml` files.
- Re-opening the same schedule file now works because the file input is cleared after each selection.

## Projects / EPS folder fallback

Projects now supports three modes:

1. **Persistent workspace** — directory handle is stored successfully in IndexedDB and can be recovered in a later browser session (subject to browser permission).
2. **Session workspace (directory handle)** — browser lets the user choose/read the directory but cannot persist the handle. The workspace remains usable until the page/browser session ends.
3. **Session/read-only workspace (directory file list)** — for browsers without `showDirectoryPicker`, Schedule Studio uses a directory file-input fallback (`webkitdirectory`). XER/XML files are available for the current session; direct in-place folder writes are unavailable, so Save falls back to a normal download.

The Projects screen now reports which workspace mode is active and explains the fallback behaviour.

## Important

Projects is no longer a prerequisite for opening an individual schedule file. A user can work entirely from **File → Open** without ever selecting a Projects folder.
