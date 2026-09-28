# Version 8 assessment — decisions before implementation

7.1.0 is the release baseline. No version 8/8.1 implementation has begun.

## Proposed structure

Keep the schedule parser, editing validation, CPM, resource calculations and report data deterministic. Split the large application controller into a shared project/file registry, activity workspace, reports workspace and AI Studio. Both workspaces use the same project and revision identifiers. AI receives a selected, traceable snapshot and returns proposals or documents; applying a schedule change is a separate reviewed action using the existing validation/undo path.

Preserve the current desktop-style navigation and visual tokens. Add **AI Studio** immediately after **Reports**. Use one shared file-management screen with schedule, contract, drawing, evidence and generated-output categories; references to an already loaded XER resolve to the same project instead of importing a second divergent copy.

| Destination | Requested functions |
|---|---|
| Reports | Progress integrity, Float paths, DCMA 14 Point, Why date moved, Delay Analysis, Forensic Review, Window Analysis, Calendar Analyser, Forecast confidence, Nodes, Time Machine, Milestone Control, Resource Forensics |
| AI Studio | Contract Manager, Drawing Measurement, Manpower Breakout, Risk Analysis, Claims and Forensics, Schedule Builder, AI Settings |
| Contract Manager outputs | Required NotebookLM+ output capabilities, with no standalone NotebookLM+ menu |
| Removed | AI dashboard and standalone NotebookLM+ |

Some subjects already have deterministic Studio implementations (health checks, paths, date movement, revisions, risk). Integration should compare the actual toolkit code and outputs, retain the stronger implementation or combine complementary views, and avoid exposing two inconsistent calculations under similar names. “Claims and Forensics” is an evidence/document workspace; the quantitative forensic tables remain Reports. Draggable Nodes should initially change layout only.

## Questions before version 8

1. **Authoritative source:** Which complete Schedule AI Toolkit version should be integrated? Please provide the latest full source archive, including Contract Manager, Drawing Measurement and NotebookLM+ assets/dependencies. Several historical individual files are available, but they do not establish one authoritative complete toolkit build.
2. **Deployment and users:** Should 8.0 remain a local single-user application, or introduce accounts, shared projects and a server? Recommended first step: preserve single-user operation and isolate any AI network service behind an adapter. Multi-user work requires storage, permissions and concurrent-edit decisions before implementation.
3. **AI connection and information handling:** Which AI provider/model(s) must be supported, and should access use a configured server gateway or each user's own provider setup? Which contract/drawing/schedule information may be sent to that provider? Do not send API keys in chat; credentials belong in the chosen secure configuration flow.
4. **NotebookLM+ outputs:** Which outputs are required inside Contract Manager—cited summaries/Q&A, briefing or study documents, mind maps, slides, audio overviews, quizzes, or others? Please supply one representative desired output and required formats. Does “remove NotebookLM+” mean remove only its standalone screen while retaining these capabilities? Recommended interpretation: yes.
5. **Calculation acceptance:** Which P6 version, schedule options and representative original/revised XER pair should be the reference? For DCMA, delay/windows, forecast confidence and resource forensics, are there existing toolkit definitions or contractual/client thresholds that must be preserved? AI explanations should cite deterministic results and evidence rather than invent numerical findings.
6. **Nodes:** Should drag-and-drop only save diagram positions, or also create/edit relationships? Recommended default: persist visual positions by project/revision; relationship edits use a separate explicit command with cycle/lag validation and undo.
7. **Drawing Measurement:** Which file types and measurement outputs are essential (PDF/image/DWG/IFC; length, area, volume, counts)? Must quantities be linked to activities/resources and retained with drawing revision and scale/calibration evidence?
8. **Version gates:** Is the proposed sequence acceptable: 8.0 integrates the selected toolkit modules with shared files and consistent reports; acceptance tests and menu review follow; 8.1 starts only after those findings are agreed? Please identify the three modules you want prioritised if integration is staged.

## Acceptance approach

Use the supplied source release and benchmark schedules to create a feature inventory and migration matrix before changing architecture. Preserve XER/package round trips, calculation invariants, Save As behavior, resource totals and WBS rollups. Add browser workflows per module, provider-adapter tests with fixtures, provenance checks for AI output and drawing calibration/revision tests. Require a concrete acceptance report for 8.0 before claiming completion or starting 8.1.
