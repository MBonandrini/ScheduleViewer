# v7.0.1 — tested maintenance and performance release

This release corrects calendar/CPM boundary calculations, XER field preservation, date validation, WBS hierarchy handling and risk simulation. It adds cancellable background QSRA, fixes Beta-PERT sampling, isolates service-worker caches, and reduces repeated work in risk calculations, sorting and WBS rendering.

All 101 automated tests pass. Local benchmarks show 33.7× faster risk computation and 27.3× faster WBS row construction for the documented workloads. These figures do not describe whole-app browser performance.

Read **VALIDATION_V701.md** for exact coverage, evidence and limitations. Live browser acceptance and P6 reference comparison were not completed. Corrected CPM calculations and Beta-PERT sampling can intentionally change results from v7.0.0.

Read **UPGRADE_V701.md** before replacing your deployment. No build step, server-side application or paid service is required.

See `EDITING_AND_SAVE_AS.md` for the new calculation mode, edit rules and Save As workflow.
