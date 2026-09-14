# Schedule Studio Professional v6.3.1 — Menu Hotfix

## Fixed
- Top-level File/Edit/View/Project/Enterprise/Tools/Reports/Help menus are now mutually exclusive.
- Opening a second menu closes the currently open menu before the new menu opens.
- Clicking the currently open menu closes it.
- Clicking anywhere outside the menu bar closes all top-level menus.
- Clicking a menu command closes the menu before executing the command.
- Escape continues to close all open menus.
- Native `<details>` toggling is explicitly suppressed for top-level menu summaries, eliminating the previous timing/race condition.
- `aria-expanded` is synchronized with the actual open state.

## Architecture
The menu state machine now lives in `src/menu-controller.js` and is tested independently from the UI shell.

## Validation
- 190/190 automated tests passed.
- 85 JavaScript/test/support files syntax checked.
- All relative imports resolved.
