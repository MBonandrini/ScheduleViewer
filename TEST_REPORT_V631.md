# Schedule Studio Professional v6.3.1 Validation

## Regression Suite
- Tests: 190
- Passed: 190
- Failed: 0
- Skipped: 0

## Module Gate
- JavaScript/test/support files syntax checked: 85
- Broken relative imports: 0

## Menu Regression Coverage
The v6.3.1 suite explicitly verifies:
1. Opening Edit after File closes File.
2. Opening any menu closes every sibling menu.
3. Clicking the already-open menu closes it.
4. Closing all menus works with no exception.
5. `open` property, `open` attribute and `aria-expanded` remain synchronized.
6. Top-level summary click handling calls `preventDefault()` so browser-native details toggling cannot race the application controller.
7. Outside pointer interaction closes all menus.
8. CSS explicitly hides menu panels whose parent details element is not open.

## Browser QA Note
The menu state logic is covered by executable unit tests and source integration checks. A final smoke check in the deployment browser (current Chrome/Edge) is still recommended after GitHub Pages caching/service-worker refresh.
