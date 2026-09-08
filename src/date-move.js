import { p6Date, num } from './parser.js';
import { taskRows } from './semantic.js';
import { isRelationshipDriving } from './critical-intelligence.js';

function taskKey(t){return String(t?.task_code||t?.task_id||'')}
function findTask(model,projId,key){return taskRows(model,projId).find(t=>taskKey(t)===String(key)||String(t.task_id)===String(key))||null}
function relSig(r){return `${r.pred_task_id}|${r.pred_type}|${num(r.lag_hr_cnt)}`}
function dateDays(a,b){const x=p6Date(a),y=p6Date(b);return x&&y?(y-x)/86400000:null}

export function explainDateMovement(oldModel,newModel,activityKey,{oldProjId=null,newProjId=null,hoursPerDay=8}={}){
  const oldTask=findTask(oldModel,oldProjId,activityKey), newTask=findTask(newModel,newProjId,activityKey);
  if(!oldTask||!newTask) return {activity:activityKey,available:false,reason:!oldTask?'Activity does not exist in previous revision.':'Activity does not exist in current revision.',contributors:[]};
  const oldFinish=oldTask.target_end_date||oldTask.early_end_date||oldTask.reend_date, newFinish=newTask.target_end_date||newTask.early_end_date||newTask.reend_date;
  const movementDays=dateDays(oldFinish,newFinish);
  const contributors=[];
  const add=(cause,impact,confidence,evidence)=>contributors.push({cause,impactDays:impact,confidence,evidence});
  const durDiff=(num(newTask.remain_drtn_hr_cnt||newTask.target_drtn_hr_cnt)-num(oldTask.remain_drtn_hr_cnt||oldTask.target_drtn_hr_cnt))/hoursPerDay;
  if(Math.abs(durDiff)>1e-9)add('Duration / remaining duration changed',durDiff,'Confirmed',`${oldTask.remain_drtn_hr_cnt||oldTask.target_drtn_hr_cnt||0}h → ${newTask.remain_drtn_hr_cnt||newTask.target_drtn_hr_cnt||0}h`);
  if(String(oldTask.clndr_id||'')!==String(newTask.clndr_id||''))add('Calendar changed',null,'Confirmed',`${oldTask.clndr_id||'—'} → ${newTask.clndr_id||'—'}`);
  if(String(oldTask.cstr_type||'')!==String(newTask.cstr_type||'')||String(oldTask.cstr_date||'')!==String(newTask.cstr_date||''))add('Constraint changed',dateDays(oldTask.cstr_date,newTask.cstr_date),'Confirmed',`${oldTask.cstr_type||'—'} ${oldTask.cstr_date||''} → ${newTask.cstr_type||'—'} ${newTask.cstr_date||''}`);
  if(num(oldTask.phys_complete_pct)!==num(newTask.phys_complete_pct)||String(oldTask.status_code||'')!==String(newTask.status_code||''))add('Progress/status changed',null,'Confirmed',`${oldTask.status_code||''} ${num(oldTask.phys_complete_pct)}% → ${newTask.status_code||''} ${num(newTask.phys_complete_pct)}%`);
  const oldR=oldModel.findAll('TASKPRED','task_id',oldTask.task_id), newR=newModel.findAll('TASKPRED','task_id',newTask.task_id);
  const oldS=new Set(oldR.map(relSig)),newS=new Set(newR.map(relSig));
  for(const r of newR) if(!oldS.has(relSig(r))) add('Relationship added',null,isRelationshipDriving(newModel,r).driving?'Strongly indicated':'Confirmed',`${r.pred_task_id} ${r.pred_type} lag ${num(r.lag_hr_cnt)}h`);
  for(const r of oldR) if(!newS.has(relSig(r))) add('Relationship deleted',null,'Confirmed',`${r.pred_task_id} ${r.pred_type} lag ${num(r.lag_hr_cnt)}h`);
  for(const r of newR){
    const predNew=newModel.find('TASK','task_id',r.pred_task_id); if(!predNew)continue;
    const predKey=taskKey(predNew),predOld=findTask(oldModel,oldProjId,predKey); if(!predOld)continue;
    const predMove=dateDays(predOld.target_end_date||predOld.early_end_date,predNew.target_end_date||predNew.early_end_date);
    if(predMove!==null&&Math.abs(predMove)>=0.01){const drive=isRelationshipDriving(newModel,r);add(`Predecessor ${predKey} moved`,predMove,drive.driving?'Strongly indicated':'Possible',`${predMove>=0?'+':''}${predMove.toFixed(1)} days; ${drive.reason}`)}
  }
  contributors.sort((a,b)=>Math.abs(b.impactDays||0)-Math.abs(a.impactDays||0));
  return {activity:taskKey(newTask),name:newTask.task_name||'',available:true,oldFinish,newFinish,movementDays,contributors,statement:`${taskKey(newTask)} ${newTask.task_name||''} moved ${movementDays===null?'an unknown amount':`${movementDays>=0?'+':''}${movementDays.toFixed(1)} calendar day(s)`}.`,caveat:'Direct field changes are confirmed. Network contribution is labelled Strongly indicated/Possible where exact proprietary scheduling attribution cannot be proven from stored dates alone.'};
}
