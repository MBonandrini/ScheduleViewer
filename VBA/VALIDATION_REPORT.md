# Software Validation Report — v3.0 source release

## External automated checks performed

- VBA/source static checks: **219 / 219 passed**.
- Nested VBA block-balance scan: **64 modules/classes checked, 0 block errors**.
- Independent CPM/resource mirror regression groups: **5 / 5 passed**.
- Master forensic-feature/source/Ribbon checks: **104 / 104 passed**.
- Randomized network testing: **1,500 randomized 120-activity DAGs passed**.
- Large-network topology stress: **100,000 activities / 99,999 relationships passed** in the independent mirror.
- Ribbon XML parsed successfully and callback existence verified.
- No core `TODO`, `implementation omitted`, `add your logic here` or `for brevity` placeholders detected.

## Excel runtime tests included

`modSelfTest.bas` contains **40** workbook/runtime tests, covering the previous engine/UI suite plus:

- revision repository storage
- schedule comparison
- materiality classification
- schedule-health generation
- critical-path report generation
- lookahead generation
- global search
- deterministic narrative generation

## Known validation limitation

Desktop Excel/VBA is unavailable in this execution environment. Therefore the following must still be performed on the target machine before contractual use:

1. VBE **Debug > Compile VBAProject**.
2. Run `RunAllSelfTests` and confirm zero failures.
3. Golden-file comparison against target Oracle P6 and Microsoft Project versions.
4. Test real large XERs, malformed XERs, multi-project XERs and complex calendars.
5. Verify Ribbon imageMso identifiers on the target Office version.

## Release readiness

**Source release candidate / advanced engineering build.** Suitable for continued desktop validation and golden-file conformance testing. It should not yet be represented as Oracle- or Microsoft-certified scheduling parity.
