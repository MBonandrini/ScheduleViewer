# Architecture

## Layers

**UI / commands**
- `modRibbonCallbacks`
- `modPublicAPI`
- `modForensicCommands`
- worksheet rendering modules

**Canonical model**
- `clsScheduleModel`
- activity/WBS/resource/calendar/relationship classes
- `RawRecords` for original evidence
- `ExtendedRecords` for non-core round-trip data

**Format adapters**
- `modXER`
- `modMSPXML`
- `modConversionAudit`

**Scheduling**
- `modCPM`
- `modCalendars`
- `modLeveling`
- `modResourceCurves`

**Forensic intelligence**
- `modRepository`
- `modComparison`
- `modMateriality`
- `modCriticalIntelligence`
- `modDateMove`
- `modScheduleHealth`
- `modTrendForecast`
- `modResourceIntelligence`

**Reporting/visualisation**
- `modGantt`
- `modNetworkDiagram`
- `modResourceCharts`
- `modDashboards`
- `modNarrative`
- `modLookahead`
- `modReports`

**Audit / quality**
- `modTrace`
- `modDiagnostics`
- `modImportDiagnostics`
- `modSelfTest`
- external Python regression checks

The command layer intentionally contains orchestration only. Parsers, calculations and analysis remain reusable services.
