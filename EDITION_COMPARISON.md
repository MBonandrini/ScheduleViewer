# Web Edition Comparison

| Area | v5.0 Integrated | v5.1 Hardened |
|---|---|---|
| Master forensic/intelligence layer | Yes | Yes |
| Stable Activity-ID forensic matching | Basic/internal-ID compatible | **Hardened semantic identity** |
| Relationship comparison | Record-oriented | **Semantic predecessor/successor identity** |
| Unknown XER table comparison | Generic | **Row-order resistant where stable IDs exist** |
| Project/repository checksum validation | Basic package integrity | **Checksum verification and duplicate revision protection** |
| Hostile/malformed import guards | Standard preflight | **NUL, extreme lines/fields and line-length guards** |
| Diagnostic logging | Standard | **Structured, bounded and secret-redacted** |
| Automated tests | 131 | 139 |

For production use, v5.1 is the recommended edition. v5.0 is retained as a comparison point showing the integrated feature set before the hardening refinements.
