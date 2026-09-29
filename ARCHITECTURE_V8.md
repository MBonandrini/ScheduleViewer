# Architecture and menu review — v8.0.0

## Ownership

Studio's canonical XER tables own editable schedules, scheduling, undo/redo and file conversion. Toolkit analyses consume read-only snapshots. They never mutate Studio through an AI response. The only incoming handoff is an explicit “Open in Activities” action, with a dirty-document confirmation.

The toolkit is an isolated same-origin module host (iframe), not an iframe pointing to an external service. It retains its analysis/provider/repository layers while preventing CSS and DOM identifier collisions with the legacy Studio controller. A source-and-origin-checked message boundary connects it to the parent. This is a first integration boundary, not a claim that the legacy controllers have been fully rewritten.

`src/toolkit-host.js` owns navigation/communication. `toolkit/src/integration/studio.js` synchronises versioned source projections using SHA-256; unchanged source files are not re-parsed or re-written to IndexedDB. `toolkit/src/repository/backup.js` handles portable evidence backups. `src/nodes-editor.js` and `src/contract-profiles.js` keep deterministic rules independently testable. `toolkit/src/measurement/takeoff.js` keeps calibration and geometry separate from rendering.

## Data corrections and performance

Toolkit XER parsing now splits by PROJECT, scopes WBS/tasks/assignments, and excludes external relationships from project-only analysis with a diagnostic. The authoritative Studio XER retains those relationships. Original/remaining duration and float displays use activity-calendar hours per day instead of dividing P6 hours by 24. Toolkit lag presentation uses the predecessor calendar's day length; this is not a reimplementation of every P6 lag-calendar option. Approved baseline dates enter assessment only through explicit reference selection.

Driving-chain analysis reuses one graph instead of allocating a graph for every predecessor scored. Topological traversal uses an indexed queue. Static path propagation respects FS/SS/FF/SF and signed lag, while still explicitly excluding full calendar/constraint scheduling. IndexedDB connections close on transaction completion and reject errors rather than leaving unresolved async Promise executors.

Node diagrams deliberately cap visible geometry at 300 matching activities. Full project relationships remain editable. PDF/DWG decoding is lazy; DWG runs in a worker and times out after 90 seconds.

## Menu review

- Activities: editing and scheduling.
- Reports: deterministic tables, charts, compliance, comparisons and forensic indicators; a single report dropdown.
- AI Studio: evidence/document/authoring workflows and provider configuration.
- Contractual Compliance precedes DCMA in the report list, while each keeps its own criteria.
- Existing Progress, Changes, Paths & Delay and Risk primary shortcuts remain from 7.1.0. Reports offers their report presentations; they are not duplicated button strips within Reports.
- Risk Analysis in AI Studio retains the toolkit's risk register/simulation workflow. QSRA in Reports retains Studio's deterministic scheduling-oriented implementation. Labels and this ownership split are explicit rather than silently merging different algorithms.
- Claims & Forensics is the toolkit's claims/evidence workspace; quantitative forensic tables are in Reports.
- No AI dashboard or standalone NotebookLM+ entry is exposed.

## Future multi-user work and 8.1 gate

Single-user local storage is intentional. Multi-user operation needs authenticated repository services, object storage, project permissions, optimistic concurrency, audit identities and a server-side AI credential boundary. These are not simulated by adding account controls to a static page.

Before 8.1: accept representative real DWG/PDF quantities, exercise the chosen live AI provider, adopt the actual project contract/exhibits and compare edited schedule calculations with P6 reference exports. Then consider replacing more legacy controller code, consolidating the two risk interfaces and providing reviewed AI extraction proposals for drawings. No automated recognition accuracy or Oracle-equivalence claim is made by this release.
