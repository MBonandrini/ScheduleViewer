import { taskRows, predRows } from './semantic.js';

export function relationshipTypeCode(value){return String(value||'PR_FS').replace(/^PR_/,'').toUpperCase();}
export function relationshipTypeLabel(value){const code=relationshipTypeCode(value);return ({FS:'Finish to Start',SS:'Start to Start',FF:'Finish to Finish',SF:'Start to Finish'})[code]||code;}

export function relationshipRowsFriendly(model,projId){
  return predRows(model,projId).map(r=>{const p=model.find('TASK','task_id',r.pred_task_id),s=model.find('TASK','task_id',r.task_id);return {...r,pred_code:p?.task_code||r.pred_task_id,pred_name:p?.task_name||'',succ_code:s?.task_code||r.task_id,succ_name:s?.task_name||'',relationship_type:relationshipTypeLabel(r.pred_type),relationship_code:relationshipTypeCode(r.pred_type)};});
}

export function relationshipNeighborhood(model,projId,relationshipId,{depth=1}={}){
  const rel=model.find('TASKPRED','task_pred_id',String(relationshipId));if(!rel)return {tasks:[],relationships:[],selected:null};
  const ids=new Set([String(rel.pred_task_id),String(rel.task_id)]),all=predRows(model,projId);let frontier=[...ids];
  for(let d=0;d<depth;d++){const next=[];for(const r of all){if(frontier.includes(String(r.task_id))&&!ids.has(String(r.pred_task_id))){ids.add(String(r.pred_task_id));next.push(String(r.pred_task_id))}if(frontier.includes(String(r.pred_task_id))&&!ids.has(String(r.task_id))){ids.add(String(r.task_id));next.push(String(r.task_id))}}frontier=next;}
  return {tasks:taskRows(model,projId).filter(t=>ids.has(String(t.task_id))),relationships:all.filter(r=>ids.has(String(r.pred_task_id))&&ids.has(String(r.task_id))),selected:rel};
}
