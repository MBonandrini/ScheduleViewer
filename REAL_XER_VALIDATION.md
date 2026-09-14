# Real XER Validation — v6.2

The following user-supplied schedules were used as validation inputs. They are **not included in the release ZIP**.

| XER | Activities | Relationships | WBS | Resources | Assignments | Calendars | Code Assignments | UDF Values | Cycles | Row-count Round Trip |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| P3379-8.xer | 3,815 | 6,609 | 782 | 7 | 912 | 18 | 40,331 | 2,805 | 0 | PASS |
| NEWPROJ-1.xer | 412 | 278 | 68 | 2 | 291 | 2 | 0 | 0 | 0 | PASS |
| P3347-5.xer | 860 | 1,223 | 453 | 8 | 131 | 3 | 562 | 221 | 0 | PASS |

## Resource profile bucket checks

- `P3379-8.xer`: 832 daily / 126 weekly / 32 monthly / 13 quarterly buckets.
- `NEWPROJ-1.xer`: 460 daily / 67 weekly / 17 monthly / 6 quarterly buckets.
- `P3347-5.xer`: resource assignments exist, but their exported budget/actual/remaining quantities and costs are all zero, so the profile correctly has no non-zero bars/curve points.

All calendars in all three files decoded successfully. `P3379-8.xer` contained 1,916 decoded exception dates; `NEWPROJ-1.xer` contained 145; `P3347-5.xer` contained 225.

The native resource hierarchy was also reconstructed, including examples such as `Suir Eng → Suir E&I` and `Ireland Building → MEP Services → Mechanical`.
