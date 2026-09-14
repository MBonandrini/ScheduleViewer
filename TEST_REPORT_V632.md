# Schedule Studio Professional v6.3.2 — Validation Report

## Automated regression suite

- **195 / 195 tests passed**
- 0 failed
- 0 skipped

New v6.3.2 tests cover:

- independent File Open command routing
- no Projects-folder dependency inside the direct-open picker
- session-only folder-tree reconstruction from directory file inputs
- XER/XML-only folder filtering
- browser capability detection safety

## JavaScript/module validation

- **86 JavaScript/test/support files syntax checked**
- **0 syntax errors**
- **0 broken relative imports**

## Static package validation

- Duplicate HTML IDs: **0**
- Missing HTML assets: **0**
- Missing service-worker assets: **0**
- CSS brace imbalance: **0**
- Service-worker cache: `unified-schedule-studio-v6.3.2`

## Real XER import regression

The current importer was run against the three user-supplied schedules after the hotfix:

| File | Import | Issues | Parser/Preflight warnings | Canonical rows | Activities |
|---|---:|---:|---:|---:|---:|
| P3379-8.xer | PASS | 0 | 0 | 56,373 | 3,815 |
| NEWPROJ-1.xer | PASS | 0 | 0 | 1,088 | 412 |
| P3347-5.xer | PASS | 0 | 0 | 3,510 | 860 |

The user XER files are validation inputs only and are **not included in the release ZIP**.

## Browser behaviour still requiring live-browser acceptance

Because file/directory picker APIs depend on browser security and user permissions, final acceptance should be performed in the target browsers for:

- File → Open picker
- toolbar Open picker
- Ctrl+O
- persistent Projects-folder reconnection
- session-only Projects fallback
- Ctrl+S direct write-back where permitted
- download fallback where direct write-back is unavailable
