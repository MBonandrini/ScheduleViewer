import { num, p6Date } from './parser.js';
import { taskRows, predRows } from './semantic.js';

function endpoint(task, type, predecessor = true) {
  const t = String(type || '').replace(/^PR_/,'').toUpperCase();
  if (predecessor) return p6Date((t === 'SS' || t === 'SF') ? (task.act_start_date || task.early_start_date || task.target_start_date) : (task.act_end_date || task.early_end_date || task.target_end_date));
  return p6Date((t === 'FS' || t === 'SS') ? (task.restart_date || task.early_start_date || task.target_start_date) : (task.reend_date || task.early_end_date || task.target_end_date));
}

export function criticalTasks(model, projId = null, thresholdHours = 0) {
  return taskRows(model,projId).filter(t => !/Complete/i.test(String(t.status_code || '')) && num(t.total_float_hr_cnt) <= thresholdHours);
}

export function isRelationshipDriving(model, relationship, { toleranceHours = 1 } = {}) {
  const pred = model.find('TASK','task_id',relationship.pred_task_id), succ = model.find('TASK','task_id',relationship.task_id);
  if (!pred || !succ) return { driving:false, confidence:'Unknown', reason:'Relationship endpoint activity is missing.' };
  const p = endpoint(pred,relationship.pred_type,true), s = endpoint(succ,relationship.pred_type,false);
  if (!p || !s) return { driving:false, confidence:'Possible', reason:'Calculated endpoint dates are unavailable.' };
  const lag = num(relationship.lag_hr_cnt);
  const expected = new Date(p.getTime() + lag*3600000);
  const deltaHours = (s-expected)/3600000;
  const driving = Math.abs(deltaHours) <= toleranceHours;
  return { driving, confidence:driving?'Strongly indicated':'Possible', deltaHours, reason: driving ? `Successor endpoint coincides with predecessor endpoint + lag within ±${toleranceHours}h.` : `Endpoint separation is ${deltaHours.toFixed(1)}h; relationship is not visibly controlling under the selected tolerance.` };
}

export function drivingRelationships(model, projId = null, options = {}) {
  return predRows(model,projId).map(r => ({...r,...isRelationshipDriving(model,r,options)})).filter(r=>r.driving);
}

export function criticalPathReport(model, projId = null, { thresholdHours = 0, targetTaskId = null } = {}) {
  const tasks = taskRows(model,projId), rels = predRows(model,projId);
  const byId = new Map(tasks.map(t=>[String(t.task_id),t]));
  const critical = new Set(tasks.filter(t=>num(t.total_float_hr_cnt)<=thresholdHours).map(t=>String(t.task_id)));
  let scope = critical;
  if (targetTaskId) {
    const upstream = new Set([String(targetTaskId)]), stack=[String(targetTaskId)];
    const incoming = new Map();
    for(const r of rels){const a=incoming.get(String(r.task_id))||[];a.push(r);incoming.set(String(r.task_id),a)}
    while(stack.length){const id=stack.pop();for(const r of incoming.get(id)||[]){const p=String(r.pred_task_id);if(!upstream.has(p)){upstream.add(p);stack.push(p)}}}
    scope = new Set([...critical].filter(id=>upstream.has(id)));
  }
  const rows=[...scope].map(id=>{const t=byId.get(id);return {task_id:id,activity:t?.task_code||id,name:t?.task_name||'',start:t?.early_start_date||t?.target_start_date||'',finish:t?.early_end_date||t?.target_end_date||'',total_float_hours:num(t?.total_float_hr_cnt),status:t?.status_code||''}});
  rows.sort((a,b)=>(p6Date(a.start)?.getTime()||0)-(p6Date(b.start)?.getTime()||0));
  const drivers = drivingRelationships(model,projId).filter(r=>scope.has(String(r.pred_task_id))&&scope.has(String(r.task_id)));
  return {rows,drivers,thresholdHours,targetTaskId};
}

export function criticalPathMigration(oldModel,newModel,oldProjId=null,newProjId=null,{thresholdHours=0}={}){
  const key=t=>String(t.task_code||t.task_id);
  const oldMap=new Map(taskRows(oldModel,oldProjId).map(t=>[key(t),t]));
  const newMap=new Map(taskRows(newModel,newProjId).map(t=>[key(t),t]));
  const oldCrit=new Set([...oldMap].filter(([,t])=>num(t.total_float_hr_cnt)<=thresholdHours).map(([k])=>k));
  const newCrit=new Set([...newMap].filter(([,t])=>num(t.total_float_hr_cnt)<=thresholdHours).map(([k])=>k));
  const entered=[...newCrit].filter(k=>!oldCrit.has(k)).map(k=>({activity:k,name:newMap.get(k)?.task_name||'',previousFloat:oldMap.get(k)?.total_float_hr_cnt??'',currentFloat:newMap.get(k)?.total_float_hr_cnt??''}));
  const left=[...oldCrit].filter(k=>!newCrit.has(k)).map(k=>({activity:k,name:oldMap.get(k)?.task_name||'',previousFloat:oldMap.get(k)?.total_float_hr_cnt??'',currentFloat:newMap.get(k)?.total_float_hr_cnt??''}));
  const stayed=[...newCrit].filter(k=>oldCrit.has(k)).map(k=>({activity:k,name:newMap.get(k)?.task_name||'',previousFloat:oldMap.get(k)?.total_float_hr_cnt??'',currentFloat:newMap.get(k)?.total_float_hr_cnt??''}));
  return {entered,left,stayed,summary:{previousCritical:oldCrit.size,currentCritical:newCrit.size,entered:entered.length,left:left.length}};
}
