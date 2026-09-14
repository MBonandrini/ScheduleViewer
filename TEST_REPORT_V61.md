# Schedule Studio Professional v6.1 — Functional Command Release

## Automated regression

- 163 / 163 Node automated tests passed.
- 73 JavaScript files passed syntax checking and all relative imports resolve.
- All HTML `data-command` IDs are represented by the central P6 command catalog.
- No duplicate HTML IDs.
- No missing local HTML assets.
- No missing service-worker assets.

## Production CPM stress

Synthetic linear networks using the production CPM implementation:

| Activities | Relationships | Cycles | Results | Cycle detection | CPM |
|---:|---:|---:|---:|---:|---:|
| 50,000 | 49,999 | 0 | 50,000 | ~52 ms | ~1.27 s |
| 100,000 | 99,999 | 0 | 100,000 | ~92 ms | ~2.97 s |

Timings are container-specific and are not browser guarantees.

## v6.1 additions under test

- central P6 command registry
- toolbar/menu/keyboard command consistency
- Ctrl+O / Ctrl+S / Ctrl+F / Ctrl+Z / Ctrl+Y / Ctrl+C / Ctrl+V
- Insert/Delete activity commands
- F9 scheduling command
- P6 20.x default scheduling profile
- Schedule Options dialog
- Leveling Options command
- inter-project predecessor relationship creation within a loaded multi-project model
- activity copy/paste with dependent project-control data
- imported-P6-versus-calculated evidence report
- zoom shortcut normalization

## Remaining qualification

Exact Primavera P6 parity still requires the user's real P6 20.x XER golden files and workflow references. Until that validation is performed, the engine remains an independent implementation and does not claim bit-for-bit Oracle scheduling parity.
