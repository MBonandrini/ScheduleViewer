# Known limitations

- Exact Oracle P6 calculation parity is not guaranteed for every proprietary edge case.
- Complex P6 calendar encodings are only partially normalized by the VBA engine; original XER records remain available in Raw XER Data.
- Multi-project XERs are preserved at raw-data level but the current active canonical model is not yet a full EPS-style multi-project repository with independent per-project activity models.
- Resource leveling is an independent approximation rather than Oracle/Microsoft tie-break parity.
- Embedded 3D GLB/NWD viewing is intentionally not implemented in standard VBA; Excel retains stable BIM links and metadata.
- Optional AI is architecture-only: `BuildVerifiedAIContext` prepares deterministic evidence but does not call an external AI service.
- Database-backed concurrent multi-user collaboration is outside the local Excel architecture.
- Exact field-by-field raw preservation for core XER tables is available through RawRecords, while normalized XER export regenerates core tables from the canonical model.
- Desktop Excel compilation/runtime tests remain mandatory before production deployment.
