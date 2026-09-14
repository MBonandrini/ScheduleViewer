import { p6Date, num } from './parser.js';
import { fmtP6, buildCalendar, workHoursBetween } from './cpm.js';
import { getDataDate } from './semantic.js';

function pad(n){return String(n).padStart(2,'0');}
export function datetimeLocalValue(value){const d=p6Date(value);if(!d)return '';return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
export function p6FromDateInput(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return fmtP6(d);}

export function editableActivityDates(task){return {start:task?.target_start_date||task?.early_start_date||task?.act_start_date||'',finish:task?.target_end_date||task?.early_end_date||task?.act_end_date||''};}

/** Apply user-entered Start/Finish/% values without running CPM. The change is a planning input;
 * F9 remains authoritative for calculated early/late dates. */
export function applyActivityPlanningEdit(model,projId,taskId,{start,finish,percent}={},options={}){
  const task=model.find('TASK','task_id',String(taskId));if(!task)throw new Error('Activity not found.');
  const current=editableActivityDates(task),startDate=p6Date(start??current.start),finishDate=p6Date(finish??current.finish);
  if(startDate&&finishDate&&finishDate<startDate)throw new Error('Finish must be on or after Start.');
  const patch={};
  if(start!==undefined)patch.target_start_date=startDate?fmtP6(startDate):'';
  if(finish!==undefined)patch.target_end_date=finishDate?fmtP6(finishDate):'';
  let pct=percent===undefined?num(task.phys_complete_pct,0):Math.max(0,Math.min(100,num(percent,0)));
  if(percent!==undefined)patch.phys_complete_pct=String(Math.round(pct*100)/100);
  if(startDate&&finishDate){
    const cal=buildCalendar(model,task.clndr_id,options),duration=Math.max(0,workHoursBetween(cal,startDate,finishDate));
    patch.target_drtn_hr_cnt=String(Math.round(duration*1000)/1000);
    const status=String(task.status_code||'').toUpperCase(),pctType=String(task.complete_pct_type||'').toUpperCase();
    if(/COMPLETE/.test(status))patch.remain_drtn_hr_cnt='0';
    else if(/ACTIVE|START/.test(status)){
      const dd=p6Date(options.dataDate||getDataDate(model,projId)),remainingStart=dd&&dd>startDate?dd:startDate;
      patch.remain_drtn_hr_cnt=String(Math.max(0,Math.round(workHoursBetween(cal,remainingStart,finishDate)*1000)/1000));
    }else patch.remain_drtn_hr_cnt=String(Math.round(duration*1000)/1000);
    if(percent!==undefined&&/DRTN|DURATION/.test(pctType))patch.remain_drtn_hr_cnt=String(Math.max(0,Math.round(duration*(1-pct/100)*1000)/1000));
  }
  Object.assign(task,patch);model.indexes=new Map();return {task,patch,requiresSchedule:true};
}

export const constraintOptions=[
  ['', 'None'],['CS_MSO','Mandatory Start'],['CS_MEO','Mandatory Finish'],['CS_SNET','Start On or After'],['CS_SNLT','Start On or Before'],['CS_FNET','Finish On or After'],['CS_FNLT','Finish On or Before']
];
export function constraintLabel(value){const row=constraintOptions.find(([v])=>String(v)===String(value));return row?.[1]||String(value||'None');}
