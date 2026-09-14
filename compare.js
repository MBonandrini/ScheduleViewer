import { taskRows } from './semantic.js';

const FIELDS = [
 ['task_name','Activity Name'],['wbs_id','WBS'],['status_code','Status'],['task_type','Activity Type'],
 ['target_drtn_hr_cnt','Original Duration'],['remain_drtn_hr_cnt','Remaining Duration'],['clndr_id','Calendar'],
 ['cstr_type','Primary Constraint'],['cstr_date','Constraint Date'],['cstr_type2','Secondary Constraint'],['cstr_date2','Constraint 2 Date'],
 ['target_start_date','Planned Start'],['target_end_date','Planned Finish'],['act_start_date','Actual Start'],['act_end_date','Actual Finish'],
 ['early_start_date','Early Start'],['early_end_date','Early Finish'],['late_start_date','Late Start'],['late_end_date','Late Finish'],
 ['total_float_hr_cnt','Total Float'],['free_float_hr_cnt','Free Float'],['complete_pct_type','% Complete Type'],['phys_complete_pct','Physical %']
];

function relSignature(model, taskId) {
  return model.findAll('TASKPRED','task_id',taskId).map(r=>`${r.pred_task_id}:${r.pred_type}:${r.lag_hr_cnt||0}`).sort().join('|');
}
function resSignature(model, taskId) {
  return model.findAll('TASKRSRC','task_id',taskId).map(r=>`${r.rsrc_id}:${r.role_id||''}:${r.target_qty||''}:${r.target_cost||''}:${r.remain_qty||''}`).sort().join('|');
}
export function compareModels(oldM,newM,oldProjId=null,newProjId=null) {
  const oldRows=taskRows(oldM,oldProjId), newRows=taskRows(newM,newProjId);
  const key=r=>r.task_code||r.task_id;
  const a=new Map(oldRows.map(r=>[key(r),r])), b=new Map(newRows.map(r=>[key(r),r]));
  const changes=[];
  const keys=new Set([...a.keys(),...b.keys()]);
  for (const k of keys) {
    const o=a.get(k), n=b.get(k);
    if (!o) { changes.push({type:'Added',activity:k,name:n.task_name,field:'Activity',oldValue:'',newValue:'Added'}); continue; }
    if (!n) { changes.push({type:'Deleted',activity:k,name:o.task_name,field:'Activity',oldValue:'Present',newValue:'Deleted'}); continue; }
    for (const [f,label] of FIELDS) if (String(o[f]??'')!==String(n[f]??'')) changes.push({type:'Changed',activity:k,name:n.task_name,field:label,oldValue:o[f]??'',newValue:n[f]??''});
    const or=relSignature(oldM,o.task_id), nr=relSignature(newM,n.task_id);
    if(or!==nr) changes.push({type:'Changed',activity:k,name:n.task_name,field:'Relationships',oldValue:or,newValue:nr});
    const os=resSignature(oldM,o.task_id), ns=resSignature(newM,n.task_id);
    if(os!==ns) changes.push({type:'Changed',activity:k,name:n.task_name,field:'Resources',oldValue:os,newValue:ns});
  }
  return {changes, summary:{added:changes.filter(x=>x.type==='Added').length,deleted:changes.filter(x=>x.type==='Deleted').length,fieldChanges:changes.filter(x=>x.type==='Changed').length,activitiesAffected:new Set(changes.map(x=>x.activity)).size}};
}
