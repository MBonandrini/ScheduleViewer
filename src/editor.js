/** Mutable editing helpers and undo/redo history for an XERModel. */
export class EditHistory {
  constructor(model, limit = 100) { this.model=model; this.limit=limit; this.undoStack=[]; this.redoStack=[]; }
  snapshot(label='Edit') { return {label, data: cloneTables(this.model)}; }
  push(label='Edit') { this.undoStack.push(this.snapshot(label)); if(this.undoStack.length>this.limit)this.undoStack.shift(); this.redoStack=[]; }
  undo(){ if(!this.undoStack.length)return null; this.redoStack.push(this.snapshot('Redo')); const s=this.undoStack.pop(); restoreTables(this.model,s.data); return s.label; }
  redo(){ if(!this.redoStack.length)return null; this.undoStack.push(this.snapshot('Undo')); const s=this.redoStack.pop(); restoreTables(this.model,s.data); return s.label; }
}

export function cloneTables(model){
  const out=[];
  for(const [name,t] of model.tables) out.push([name,{name,fields:[...t.fields],rows:t.rows.map(r=>({...r,__extra:r.__extra?[...r.__extra]:undefined}))}]);
  return out;
}
export function restoreTables(model,data){ model.tables=new Map(data.map(([n,t])=>[n,{name:n,fields:[...t.fields],rows:t.rows.map(r=>({...r,__extra:r.__extra?[...r.__extra]:undefined}))}])); model.indexes=new Map(); }
export function touch(model){ model.indexes=new Map(); }

export function ensureTable(model,name,fields){
  if(!model.tables.has(name)) model.tables.set(name,{name,fields:[...fields],rows:[]});
  const t=model.tables.get(name); for(const f of fields) if(!t.fields.includes(f))t.fields.push(f); return t;
}
function nextNumericId(rows,field,start=1){let max=start-1; for(const r of rows){const n=Number(r[field]); if(Number.isFinite(n))max=Math.max(max,n)} return String(max+1)}

export function updateTask(model,taskId,patch){const r=model.find('TASK','task_id',String(taskId)); if(!r)throw new Error('Activity not found'); Object.assign(r,patch); touch(model); return r;}
export function addTask(model,projId,defaults={}){
  const fields=['task_id','proj_id','wbs_id','clndr_id','task_code','task_name','status_code','task_type','target_drtn_hr_cnt','remain_drtn_hr_cnt','target_start_date','target_end_date','early_start_date','early_end_date','late_start_date','late_end_date','total_float_hr_cnt','free_float_hr_cnt','complete_pct_type','phys_complete_pct','cstr_type','cstr_date','cstr_type2','cstr_date2'];
  const t=ensureTable(model,'TASK',fields); const task_id=nextNumericId(t.rows,'task_id',1); const row=Object.fromEntries(t.fields.map(f=>[f,'']));
  Object.assign(row,{task_id,proj_id:String(projId),status_code:'TK_NotStart',task_type:'TT_Task',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',complete_pct_type:'CP_Phys',phys_complete_pct:'0'},defaults); t.rows.push(row); touch(model); return row;
}
export function deleteTask(model,taskId){
  const id=String(taskId); const t=model.tables.get('TASK'); if(!t)return;
  t.rows=t.rows.filter(r=>r.task_id!==id);
  // Remove dependent records generically. P6 releases/plugins can add task-linked tables,
  // so do not limit cleanup to TASKPRED/TASKRSRC/TASKACTV.
  for(const [name,x] of model.tables){
    if(name==='TASK')continue;
    if(x.fields.includes('task_id')||x.fields.includes('pred_task_id'))
      x.rows=x.rows.filter(r=>String(r.task_id??'')!==id&&String(r.pred_task_id??'')!==id);
  }
  // UDFVALUE is linked generically through fk_id, so remove only values whose
  // UDFTYPE belongs to TASK. This includes BIM_LINK_* activity UDF values.
  const taskUdfIds=new Set((model.table('UDFTYPE')||[]).filter(u=>String(u.table_name||'').toUpperCase()==='TASK').map(u=>String(u.udf_type_id)));
  const uv=model.tables.get('UDFVALUE');
  if(uv)uv.rows=uv.rows.filter(r=>!(String(r.fk_id??'')===id&&taskUdfIds.has(String(r.udf_type_id??''))));
  touch(model);
}


function sameProjectWbs(model,projId,wbsId){
  if(!wbsId)return null;
  const w=model.find('PROJWBS','wbs_id',String(wbsId));
  if(!w||String(w.proj_id)!==String(projId))throw new Error('WBS element must belong to the selected project.');
  return w;
}
function nextSiblingSeq(model,projId,parentWbsId=''){
  const rows=(model.table('PROJWBS')||[]).filter(r=>String(r.proj_id)===String(projId)&&String(r.parent_wbs_id||'')===String(parentWbsId||''));
  let max=0; for(const r of rows){const n=Number(r.seq_num);if(Number.isFinite(n))max=Math.max(max,n)} return String(max+1);
}
export function wbsDescendantIds(model,wbsId){
  const root=String(wbsId), rows=model.table('PROJWBS')||[], children=new Map();
  for(const r of rows){const p=String(r.parent_wbs_id||'');if(!children.has(p))children.set(p,[]);children.get(p).push(String(r.wbs_id));}
  const out=[],stack=[...(children.get(root)||[])];
  while(stack.length){const id=stack.pop();if(out.includes(id))continue;out.push(id);for(const c of children.get(id)||[])stack.push(c)}
  return out;
}
export function addWBS(model,projId,parentWbsId='',defaults={}){
  const fields=['wbs_id','proj_id','parent_wbs_id','seq_num','wbs_short_name','wbs_name','obs_id','status_code','wbs_mile_weight'];
  const t=ensureTable(model,'PROJWBS',fields); sameProjectWbs(model,projId,parentWbsId);
  const wbs_id=nextNumericId(t.rows,'wbs_id',1); const row=Object.fromEntries(t.fields.map(f=>[f,'']));
  Object.assign(row,{wbs_id,proj_id:String(projId),parent_wbs_id:String(parentWbsId||''),seq_num:nextSiblingSeq(model,projId,parentWbsId),wbs_short_name:`WBS${wbs_id}`,wbs_name:'New WBS',status_code:'WS_Open'},defaults);
  t.rows.push(row); touch(model); return row;
}
export function updateWBS(model,wbsId,patch={}){
  const w=model.find('PROJWBS','wbs_id',String(wbsId)); if(!w)throw new Error('WBS element not found.');
  if('proj_id' in patch && String(patch.proj_id)!==String(w.proj_id))throw new Error('Moving a WBS between projects is not supported.');
  if('parent_wbs_id' in patch){
    const parent=String(patch.parent_wbs_id||'');
    if(parent===String(w.wbs_id))throw new Error('A WBS element cannot be its own parent.');
    sameProjectWbs(model,w.proj_id,parent);
    if(wbsDescendantIds(model,w.wbs_id).includes(parent))throw new Error('Cannot move a WBS beneath one of its descendants.');
    patch={...patch,parent_wbs_id:parent};
    if(!('seq_num' in patch))patch.seq_num=nextSiblingSeq(model,w.proj_id,parent);
  }
  Object.assign(w,patch); touch(model); return w;
}
export function moveWBS(model,wbsId,newParentWbsId=''){return updateWBS(model,wbsId,{parent_wbs_id:String(newParentWbsId||'')});}
export function reassignTasksToWBS(model,taskIds,wbsId){
  const w=model.find('PROJWBS','wbs_id',String(wbsId)); if(!w)throw new Error('Destination WBS not found.');
  let count=0; for(const id of taskIds){const t=model.find('TASK','task_id',String(id));if(!t)continue;if(String(t.proj_id)!==String(w.proj_id))throw new Error('Activity and destination WBS must belong to the same project.');t.wbs_id=String(wbsId);count++;}
  touch(model); return count;
}
export function deleteWBS(model,wbsId,{mode='deleteSubtree',targetWbsId=null}={}){
  const id=String(wbsId), w=model.find('PROJWBS','wbs_id',id); if(!w)throw new Error('WBS element not found.');
  const descendants=wbsDescendantIds(model,id); const ids=new Set([id,...descendants]);
  if(mode==='deleteSubtree'){
    const taskIds=(model.table('TASK')||[]).filter(t=>ids.has(String(t.wbs_id))).map(t=>String(t.task_id));
    for(const tid of taskIds)deleteTask(model,tid);
    const wt=model.tables.get('PROJWBS'); wt.rows=wt.rows.filter(r=>!ids.has(String(r.wbs_id)));
    // Remove WBS-linked records in auxiliary tables where present.
    for(const [name,t] of model.tables){if(name==='PROJWBS'||name==='TASK')continue;if(t.fields.includes('wbs_id'))t.rows=t.rows.filter(r=>!ids.has(String(r.wbs_id)));}
    touch(model); return {deletedWbs:ids.size,deletedTasks:taskIds.length,reassignedTasks:0};
  }
  if(mode==='promoteContents'){
    const dest=targetWbsId!=null?String(targetWbsId):String(w.parent_wbs_id||'');
    if(!dest)throw new Error('A destination WBS is required when removing a root WBS without deleting its contents.');
    sameProjectWbs(model,w.proj_id,dest);
    if(ids.has(dest))throw new Error('Destination cannot be the WBS being removed or one of its descendants.');
    let reassigned=0; for(const t of model.table('TASK')||[])if(String(t.wbs_id)===id){t.wbs_id=dest;reassigned++;}
    for(const child of model.table('PROJWBS')||[])if(String(child.parent_wbs_id||'')===id)child.parent_wbs_id=dest;
    const wt=model.tables.get('PROJWBS'); wt.rows=wt.rows.filter(r=>String(r.wbs_id)!==id);
    for(const [name,t] of model.tables){if(name==='PROJWBS'||name==='TASK')continue;if(t.fields.includes('wbs_id'))for(const r of t.rows)if(String(r.wbs_id)===id)r.wbs_id=dest;}
    touch(model); return {deletedWbs:1,deletedTasks:0,reassignedTasks:reassigned};
  }
  throw new Error('Unsupported WBS delete mode.');
}
export function resequenceWBS(model,projId,parentWbsId='',orderedIds=[]){
  const siblings=(model.table('PROJWBS')||[]).filter(r=>String(r.proj_id)===String(projId)&&String(r.parent_wbs_id||'')===String(parentWbsId||''));
  const byId=new Map(siblings.map(r=>[String(r.wbs_id),r])); let seq=1;
  for(const id of orderedIds){const r=byId.get(String(id));if(r){r.seq_num=String(seq++);byId.delete(String(id));}}
  [...byId.values()].sort((a,b)=>Number(a.seq_num||0)-Number(b.seq_num||0)).forEach(r=>r.seq_num=String(seq++)); touch(model);
}

export function addRelationship(model,projId,predTaskId,taskId,type='PR_FS',lagHours=0){
  const t=ensureTable(model,'TASKPRED',['task_pred_id','proj_id','task_id','pred_task_id','pred_type','lag_hr_cnt']);
  const pred=model.find('TASK','task_id',String(predTaskId)),succ=model.find('TASK','task_id',String(taskId));
  if(!pred||!succ)throw new Error('Both predecessor and successor activities must exist.');
  if(pred.proj_id!==String(projId)||succ.proj_id!==String(projId))throw new Error('Relationship activities must belong to the selected project.');
  if(String(predTaskId)===String(taskId))throw new Error('An activity cannot be related to itself.');
  if(!['PR_FS','PR_SS','PR_FF','PR_SF'].includes(String(type)))throw new Error('Unsupported relationship type.');
  if(!Number.isFinite(Number(lagHours)))throw new Error('Relationship lag must be a number of hours.');
  if(t.rows.some(r=>r.proj_id===String(projId)&&r.task_id===String(taskId)&&r.pred_task_id===String(predTaskId)&&r.pred_type===type))throw new Error('Relationship already exists.');
  const row={task_pred_id:nextNumericId(t.rows,'task_pred_id',1),proj_id:String(projId),task_id:String(taskId),pred_task_id:String(predTaskId),pred_type:type,lag_hr_cnt:String(lagHours??0)}; t.rows.push(row); touch(model); return row;
}
export function updateRelationship(model,id,patch){const r=model.find('TASKPRED','task_pred_id',String(id)); if(!r)throw new Error('Relationship not found'); Object.assign(r,patch); touch(model); return r;}
export function deleteRelationship(model,id){const t=model.tables.get('TASKPRED'); if(t)t.rows=t.rows.filter(r=>r.task_pred_id!==String(id)); touch(model);}

export function addResourceAssignment(model,taskId,rsrcId,values={}){
  const t=ensureTable(model,'TASKRSRC',['taskrsrc_id','task_id','rsrc_id','role_id','target_qty','act_reg_qty','remain_qty','target_cost','act_reg_cost','remain_cost']);
  const row={taskrsrc_id:nextNumericId(t.rows,'taskrsrc_id',1),task_id:String(taskId),rsrc_id:String(rsrcId),role_id:'',target_qty:'0',act_reg_qty:'0',remain_qty:'0',target_cost:'0',act_reg_cost:'0',remain_cost:'0',...values}; t.rows.push(row); touch(model); return row;
}
export function updateResourceAssignment(model,id,patch){const r=model.find('TASKRSRC','taskrsrc_id',String(id)); if(!r)throw new Error('Resource assignment not found'); Object.assign(r,patch); touch(model); return r;}
export function deleteResourceAssignment(model,id){const t=model.tables.get('TASKRSRC'); if(t)t.rows=t.rows.filter(r=>r.taskrsrc_id!==String(id)); touch(model);}

export function setProjectDataDate(model,projId,dateText){const p=model.find('PROJECT','proj_id',String(projId)); if(!p)throw new Error('Project not found'); if('last_recalc_date' in p)p.last_recalc_date=dateText; else p.data_date=dateText; touch(model);}

export function updateRow(model,tableName,rowIndex,field,value){const t=model.tables.get(tableName);if(!t||!t.rows[rowIndex])throw new Error('Row not found');if(!t.fields.includes(field))t.fields.push(field);t.rows[rowIndex][field]=value;touch(model);return t.rows[rowIndex];}
export function addRow(model,tableName,values={}){const t=model.tables.get(tableName);if(!t)throw new Error('Table not found');const row=Object.fromEntries(t.fields.map(f=>[f,'']));Object.assign(row,values);t.rows.push(row);touch(model);return row;}
export function deleteRow(model,tableName,rowIndex){const t=model.tables.get(tableName);if(!t||!t.rows[rowIndex])throw new Error('Row not found');const [row]=t.rows.splice(rowIndex,1);touch(model);return row;}
