import { addWBS, ensureTable, touch, wbsDescendantIds, reassignTasksToWBS } from './editor.js';

function nextId(rows, field, start=1){let max=start-1;for(const r of rows){const n=Number(r[field]);if(Number.isFinite(n))max=Math.max(max,n)}return String(max+1)}

export function getOBSRows(model){return model.table('OBS')||[]}
export function getWBSNote(model,wbsId){
  const row=(model.table('WBSMEMO')||[]).find(r=>String(r.wbs_id)===String(wbsId));
  return row?.memo_text||row?.wbs_memo||'';
}
export function setWBSNote(model,wbsId,text=''){
  const t=ensureTable(model,'WBSMEMO',['wbs_memo_id','wbs_id','memo_type','memo_text']);
  let r=t.rows.find(x=>String(x.wbs_id)===String(wbsId));
  if(!r){r={wbs_memo_id:nextId(t.rows,'wbs_memo_id'),wbs_id:String(wbsId),memo_type:'General',memo_text:''};t.rows.push(r)}
  r.memo_text=String(text);touch(model);return r;
}
export function wbsActivityIds(model,wbsId,includeDescendants=true){
  const ids=new Set([String(wbsId),...(includeDescendants?wbsDescendantIds(model,wbsId):[])]);
  return model.table('TASK').filter(t=>ids.has(String(t.wbs_id))).map(t=>String(t.task_id));
}
export function cloneWBSBranch(model,sourceWbsId,{newParentWbsId=null,includeActivities=true,codeSuffix=' COPY'}={}){
  const source=model.find('PROJWBS','wbs_id',String(sourceWbsId));if(!source)throw new Error('Source WBS not found.');
  const rows=model.table('PROJWBS').filter(r=>String(r.proj_id)===String(source.proj_id));
  const branchIds=[String(sourceWbsId),...wbsDescendantIds(model,sourceWbsId)];
  const branch=new Map(branchIds.map(id=>[id,rows.find(r=>String(r.wbs_id)===id)]).filter(x=>x[1]));
  const idMap=new Map();
  const create=(oldId,parentNew)=>{
    const old=branch.get(oldId);const copy={...old};delete copy.wbs_id;delete copy.parent_wbs_id;delete copy.seq_num;
    copy.wbs_short_name=String(old.wbs_short_name||old.wbs_id)+(oldId===String(sourceWbsId)?codeSuffix:'');
    copy.wbs_name=String(old.wbs_name||'')+(oldId===String(sourceWbsId)?codeSuffix:'');
    const nw=addWBS(model,source.proj_id,parentNew,copy);idMap.set(oldId,nw.wbs_id);
    for(const child of [...branch.values()].filter(x=>String(x.parent_wbs_id)===oldId).sort((a,b)=>Number(a.seq_num||0)-Number(b.seq_num||0)))create(String(child.wbs_id),nw.wbs_id);
  };
  const parent=newParentWbsId==null?String(source.parent_wbs_id||''):String(newParentWbsId||'');create(String(sourceWbsId),parent);
  if(includeActivities){
    const oldTasks=model.table('TASK').filter(t=>branch.has(String(t.wbs_id))).map(t=>({...t}));
    const taskMap=new Map();const taskTable=model.tables.get('TASK');
    for(const old of oldTasks){let max=0;for(const r of taskTable.rows){const n=Number(r.task_id);if(Number.isFinite(n))max=Math.max(max,n)}const newId=String(max+1);const r={...old,task_id:newId,wbs_id:idMap.get(String(old.wbs_id)),task_code:`${old.task_code||old.task_id}-COPY`};taskTable.rows.push(r);taskMap.set(String(old.task_id),newId)}
    const predTable=model.tables.get('TASKPRED');if(predTable){const originals=[...predTable.rows];for(const rel of originals){if(taskMap.has(String(rel.task_id))&&taskMap.has(String(rel.pred_task_id))){let max=0;for(const r of predTable.rows){const n=Number(r.task_pred_id);if(Number.isFinite(n))max=Math.max(max,n)}predTable.rows.push({...rel,task_pred_id:String(max+1),task_id:taskMap.get(String(rel.task_id)),pred_task_id:taskMap.get(String(rel.pred_task_id))})}}}
    for(const [name,t] of model.tables){if(['TASK','TASKPRED','PROJWBS'].includes(name)||!t.fields.includes('task_id'))continue;const originals=[...t.rows];for(const r of originals){const nid=taskMap.get(String(r.task_id));if(!nid)continue;const copy={...r,task_id:nid};const pk=t.fields.find(f=>f!=='task_id'&&f.endsWith('_id')&&t.rows.some(x=>x[f]!==undefined));if(pk&&/^\d+$/.test(String(r[pk]||'')))copy[pk]=nextId(t.rows,pk);t.rows.push(copy)}}
    // Activity UDFVALUE records use fk_id rather than task_id. Copy TASK UDFs
    // (including BIM_LINK_* fields) to duplicated activities.
    const udfValues=model.tables.get('UDFVALUE');
    if(udfValues){const taskUdfIds=new Set((model.table('UDFTYPE')||[]).filter(u=>String(u.table_name||'').toUpperCase()==='TASK').map(u=>String(u.udf_type_id)));const originals=[...udfValues.rows];for(const r of originals){const nid=taskMap.get(String(r.fk_id));if(!nid||!taskUdfIds.has(String(r.udf_type_id)))continue;udfValues.rows.push({...r,fk_id:nid})}}
    const memo=model.tables.get('WBSMEMO');if(memo){const originals=[...memo.rows];for(const r of originals){const nw=idMap.get(String(r.wbs_id));if(!nw)continue;const copy={...r,wbs_id:nw};if(copy.wbs_memo_id)copy.wbs_memo_id=nextId(memo.rows,'wbs_memo_id');memo.rows.push(copy)}}
  }
  touch(model);return {rootWbsId:idMap.get(String(sourceWbsId)),idMap};
}
export function moveActivitiesToWBS(model,taskIds,wbsId){return reassignTasksToWBS(model,taskIds,wbsId)}
