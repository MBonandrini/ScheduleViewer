import { taskRows, taskStart, taskFinish } from './semantic.js';
import { num } from './parser.js';
const DAY=86400000;
function key(t){return String(t.task_code||t.task_id||'')}
export function makeBaseline(model,projId,{id,name,fileName,role='Unassigned',importedAt=new Date().toISOString()}={}){
  const project=model.find('PROJECT','proj_id',projId)||model.table('PROJECT')[0]||{};
  return {id:id||`bl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:name||project.proj_short_name||project.proj_name||fileName||'Baseline',fileName:fileName||'',role,importedAt,model,projId:projId||project.proj_id||null};
}
export function baselineTaskMap(b){return new Map(taskRows(b.model,b.projId).map(t=>[key(t),t]))}
export function matchBaselineTask(task,b){return baselineTaskMap(b).get(key(task))||null}
function days(a,b){if(!a||!b)return null;return (a-b)/DAY}
export function baselineRows(currentModel,currentProjId,b,hoursPerDay=8){
  const cur=taskRows(currentModel,currentProjId), base=taskRows(b.model,b.projId), bm=new Map(base.map(t=>[key(t),t])), cm=new Map(cur.map(t=>[key(t),t]));
  const make=(t,bt,status)=>{const cs=t?taskStart(t):null,cf=t?taskFinish(t):null,bs=bt?taskStart(bt):null,bf=bt?taskFinish(bt):null;return {task_id:t?.task_id||'',activity:t?.task_code||bt?.task_code||bt?.task_id||'',name:t?.task_name||bt?.task_name||'',status,matched:!!t&&!!bt,current_start:cs,current_finish:cf,baseline_start:bs,baseline_finish:bf,start_variance_days:t&&bt?days(cs,bs):null,finish_variance_days:t&&bt?days(cf,bf):null,current_duration_days:t?num(t.target_drtn_hr_cnt)/(hoursPerDay||8):null,baseline_duration_days:bt?num(bt.target_drtn_hr_cnt)/(hoursPerDay||8):null,duration_variance_days:t&&bt?(num(t.target_drtn_hr_cnt)-num(bt.target_drtn_hr_cnt))/(hoursPerDay||8):null,current_float_days:t?num(t.total_float_hr_cnt)/(hoursPerDay||8):null,baseline_float_days:bt?num(bt.total_float_hr_cnt)/(hoursPerDay||8):null,float_variance_days:t&&bt?(num(t.total_float_hr_cnt)-num(bt.total_float_hr_cnt))/(hoursPerDay||8):null}};
  const rows=cur.map(t=>{const bt=bm.get(key(t));return make(t,bt,bt?'Matched':'Current only')});
  for(const bt of base)if(!cm.has(key(bt)))rows.push(make(null,bt,'Baseline only'));
  return rows;
}
export function baselineSummary(currentModel,currentProjId,b,hoursPerDay=8){const rows=baselineRows(currentModel,currentProjId,b,hoursPerDay);const matched=rows.filter(r=>r.matched);const f=matched.map(r=>r.finish_variance_days).filter(Number.isFinite);return {current:rows.length,baseline:taskRows(b.model,b.projId).length,matched:matched.length,unmatchedCurrent:rows.filter(r=>r.status==='Current only').length,unmatchedBaseline:rows.filter(r=>r.status==='Baseline only').length,late:matched.filter(r=>(r.finish_variance_days??0)>0.001).length,ahead:matched.filter(r=>(r.finish_variance_days??0)<-0.001).length,avgFinishVarianceDays:f.length?f.reduce((a,x)=>a+x,0)/f.length:0}}
export function baselineOverlayMap(b){const m=new Map();for(const t of taskRows(b.model,b.projId))m.set(key(t),{start:taskStart(t),finish:taskFinish(t),task:t});return m}
export function setRole(baselines,id,role){for(const b of baselines){if(b.id===id)b.role=role;else if(role!=='Unassigned'&&b.role===role)b.role='Unassigned'}return baselines}
