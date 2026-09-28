# Editing, scheduling and saving in v7.0.1

## Recalculation

The default is **Manual — schedule with F9**. Edit the activity, then press F9 or click the F9 toolbar button to recalculate early/late dates and float using the selected project's data date, calendars, logic and configured options.

For automatic calculation, open **Project → Schedule Options → Calculation mode**, choose **Automatic after edits (selected project)**, and click Apply. Changes are grouped for 250 ms before calculation. The selected project is recalculated; other loaded projects keep their own pending-calculation flags. Shared calendar or resource edits conservatively mark all loaded projects pending.

An **F9 required** flag means calculated dates may be stale. A failed calculation leaves the edit intact and preserves its undo history. Undo/redo marks calculation results stale again. The imported-versus-calculated audit remains available for comparing the recalculated model with imported values.

## Activity input rules

- Changing Original Duration before starting synchronises Remaining Duration.
- For an in-progress task, changing Original Duration retains Remaining Duration; Duration % is derived from the two durations.
- A Physical % edit does not automatically change durations.
- A Duration % edit changes Remaining Duration. Units % remains derived from resource units.
- Actual progress must have the corresponding actual dates. Completed activities have zero Remaining Duration.
- Entering an invalid date, negative/non-numeric duration or duplicate activity code is rejected.
- The date editor offers an explicit **Start On or After** or **Finish On or Before** constraint in an unused primary/secondary slot. Existing constraints are not silently overwritten. A finish-on-or-before constraint is a deadline: logic can still create a later finish and negative float.
- The alternative **Change planned date and duration only** changes planning inputs; F9 may move those dates according to logic. Use the Status detail to change actual dates or existing constraints.

The custom engine is P6-style, not certified Oracle P6-equivalent. Refer to VALIDATION_V701.md for unsupported options and the remaining reference-schedule checks.

## Save / Save As

**File → Save As…**, or **Ctrl+Shift+S**, opens the filename and format dialog. The XER, MSP XML and Project Package commands open the same dialog with the corresponding format selected.

| Format | Contents | Intended use |
|---|---|---|
| `.xer` | All loaded projects and shared XER dictionaries | Continue in P6 / retain XER tables |
| `.xml` | Selected project with the existing conversion mappings | Interchange with Microsoft Project; inspect conversion limitations |
| `.ussproj` | All model tables, settings, layouts, baselines, revision history and pending-calculation state | Full Schedule Studio backup and recovery |

Choose whether to recalculate the selected project before saving or deliberately save current values. If another included project remains pending, the recalculation choice stops the save until that project has been scheduled or you explicitly choose current values. A project package may preserve an incomplete/structurally invalid model for recovery; XER/XML exports require structural validation.

Where the browser supports the native file picker, Save As lets you choose the destination and waits for the file writer to finish. Subsequent Ctrl+S uses that target. The Projects-folder Save option asks before replacing an existing named file. Cancellation does not silently download a fallback copy.

In browsers without the native picker, the chosen filename is downloaded. The app says **Download requested** and retains the unsaved indicator because a browser download does not confirm a successful disk write. Check your Downloads folder. An XML conversion also retains the unsaved indicator because it is a selected-project interchange copy, not a complete workspace save.

Saving does not discard edits made while a picker or write is in progress: those newer edits remain marked unsaved. Save a `.ussproj` package as well if you need settings, baselines and history, since XER/XML do not contain the full workspace.
