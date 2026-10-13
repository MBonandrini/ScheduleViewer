# 8.2.0 release notes and verification

Changes: new 18-category Project Differences Report with explicit schedule/project pairing, metrics, resizable columns and HTML export; Why Date Moved graphics, metrics and change evidence; compiled numeric WebAssembly ABI and source; independent Excel package (not deployed with the site).

Verification in the Linux build environment:
- 169 Node tests passed, plus syntax/import/UI/package contracts.
- Chromium 7.1 regression: 102 assertions across 31 report selections.
- Chromium v8: 49 checks; v8.1: 54 checks; duration units: 20 checks.
- New comparison/movement/WASM browser checks: 10 passed.
- GitHub Pages subpath deployment: 26 checks passed.
- Larger supplied XER: 10 paging/alignment/print/search checks passed. Observed import 1,678 ms; hours switch 243 ms; days switch 292 ms; status form 393 ms. These are one-machine observations, not guaranteed performance.
- Selected compiled functions tested for statistics, differences, all four relationship types and cycle rejection. The final comparison adjustments were rechecked with the new engine/report tests.

The Windows Excel source is delivered separately. Native Excel compilation and runtime tests were not run here; its builder and acceptance instructions provide that gate. No DLL or full application conversion to WebAssembly is claimed.

The Word report guide is supplied separately. Tests, developer build tools and required third-party notices are included in this source package. Generated validation screenshots, the native Excel package and user project files are excluded.
