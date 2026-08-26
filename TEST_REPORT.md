# Unified Schedule Studio v4.1 — Quality Hardening Test Report

## Summary

- **Automated regression tests:** 115 / 115 passing
- **New quality-hardening tests:** 10 / 10 passing (included in the 115 total)
- **JavaScript syntax checks:** PASS
- **Relative module import resolution:** PASS
- **50,000-activity / 49,999-relationship benchmark:** PASS
- **Static GitHub Pages HTTP checks:** PASS
- **ZIP integrity check:** performed during final packaging

## Quality-hardening coverage

The v4.1 tests specifically verify:

- bundled sample passes structural integrity validation
- dangling relationship/resource references are detected
- failed transactional edits restore the pre-edit model exactly
- XER serialization is deterministic and does not mutate the working model
- XER export→re-import preserves the semantic fingerprint
- MSP XML export is deterministic and non-mutating
- local project date formatting does not apply unwanted timezone shifts
- date-only P6 values parse at local midnight
- model indexes normalize numeric/string identifiers consistently
- generated MSP XML contains the complete Project/Tasks/Resources/Assignments/Calendars structure expected by browser re-import

## Existing regression coverage retained

The inherited suite still covers XER parsing/serialization, MSP XML conversion, activity/WBS/resource/relationship CRUD, undo/redo, working calendars, FS/SS/FF/SF, signed lag, constraints, progress modes, expected finish, suspend/resume, external relationships, resource leveling/curves, BIM UDF persistence, local GLB/4D, baselines, layouts/filters, EVM/productivity, scenarios, resource profiles and randomized CPM networks.

## Large schedule benchmark

A generated **50,000-activity FS chain** with **49,999 relationships** was run through the production graph/CPM code in this container.

Observed:

- cycle detection: approximately **48.1 ms**
- CPM calculation: approximately **1.69 s**
- calculated activities: **50,000**
- cycles detected: **0**

These are environment-specific figures, not browser performance guarantees.

## Integrity behavior

Critical operations now fail closed where appropriate. Export is blocked if structural errors exist. CPM application is transactional: a failure restores the complete pre-operation table state rather than leaving a partial calculation in memory.

Warnings such as missing calendars remain warnings rather than hard errors because some imported schedules intentionally rely on fallback/default behavior.

## Determinism

The XER serializer uses stable domain-key ordering without mutating the canonical model. MSP resources, assignments and calendars are also emitted in stable order. Semantic fingerprints are used in tests and export guards to detect unintended model mutation.

## Date/time regression

Schedule timestamps are treated as project wall-clock values where the source format provides no timezone semantics. Tests include European DST-boundary dates to ensure conversion to MSP XML does not silently shift clock time through UTC.

## Remaining production validation

The main remaining reliability task is organizational golden-file parity, not another application feature. Maintain reference P6/MSP schedules covering:

- mixed/exception calendars and DST-sensitive dates
- every relationship type with positive/negative lag
- out-of-sequence progress modes
- hard/soft constraints
- suspend/resume and expected finish
- resource leveling and curves
- external relationships
- baseline variance and multiple float paths
- XER↔MSP conversion
- 10k–100k activity schedules

For each reference, compare the application's calculated Early/Late Start/Finish, Total/Free Float, project finish and leveling results against the approved vendor result.
