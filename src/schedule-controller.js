import {p6Date} from './parser.js';
import {calculateCPM,applyCPM} from './cpm.js';
import {getDataDate} from './semantic.js';
import {validateModelIntegrity,integritySummary} from './integrity.js';
import {cloneTables,restoreTables} from './editor.js';

/** Per-project calculation state. Editing shared data conservatively invalidates all projects. */
export class ScheduleState {
  constructor(){this.pending=new Set();this.revision=0;}
  edited(model){this.revision++;for(const p of model.table('PROJECT'))this.pending.add(String(p.proj_id));for(const t of model.table('TASK'))this.pending.add(String(t.proj_id));}
  calculated(projectId){this.pending.delete(String(projectId));}
  needs(projectId){return this.pending.has(String(projectId));}
  reset(ids=[]){this.pending=new Set(ids.map(String));this.revision++;}
}

/** Calculate before taking an undo checkpoint. Failed calculations never consume an edit's undo entry. */
export function recalculateProject(model,projectId,options={},history=null){
  const dataDate=getDataDate(model,projectId);
  if(!p6Date(dataDate))throw new Error('Set a project Data Date before scheduling.');
  const check=validateModelIntegrity(model,{projectId});
  if(options.strictValidation!==false&&!check.ok)throw new Error(`Repair the schedule before calculation.\n${integritySummary(check)}`);
  const calc=calculateCPM(model,projectId,{...options,dataDate});
  if(options.strictValidation!==false&&calc.invalidRelationships.length)throw new Error('Repair relationships with missing activities before calculation.');
  const before=cloneTables(model);
  try{applyCPM(model,projectId,calc);if(options.strictValidation!==false){const after=validateModelIntegrity(model,{projectId});if(!after.ok)throw new Error(`Calculated schedule failed validation.\n${integritySummary(after)}`);}}
  catch(error){restoreTables(model,before);throw error;}
  if(history){history.undoStack.push({label:'CPM recalculation',data:before});if(history.undoStack.length>history.limit)history.undoStack.shift();history.redoStack=[];}
  return calc;
}
