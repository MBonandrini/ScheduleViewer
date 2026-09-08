import { num, p6Date } from './parser.js';
import { taskRows, getDataDate } from './semantic.js';
import { criticalTasks } from './critical-intelligence.js';
import { dcmaStyleHealth, scheduleRiskRadar } from './schedule-health.js';
import { materialChangeRegister } from './forensic-comparison.js';

function dateOf(t,field='finish'){return field==='start'?(t.act_start_date||t.restart_date||t.early_start_date||t.target_start_date):(t.act_end_date||t.reend_date||t.early_end_date||t.target_end_date)}
export function whatChangedDashboard(oldModel,newModel,oldProjId=null,newProjId=null,settings={}){
  const c=materialChangeRegister(oldModel,newModel,settings),changes=c.changes;
  return {summary:{activitiesAdded:changes.filter(x=>x.table==='TASK'&&x.type==='Added').length,activitiesDeleted:changes.filter(x=>x.table==='TASK'&&x.type==='Deleted').length,relationshipsAdded:changes.filter(x=>x.table==='TASKPRED'&&x.type==='Added').length,relationshipsDeleted:changes.filter(x=>x.table==='TASKPRED'&&x.type==='Deleted').length,durationsChanged:changes.filter(x=>/duration/i.test(x.field)).length,calendarsChanged:changes.filter(x=>/calendar/i.test(x.field)).length,constraintsChanged:changes.filter(x=>/constraint/i.test(x.field)).length,criticalChanges:changes.filter(x=>x.criticality==='Critical').length,materialChanges:changes.filter(x=>x.criticality==='Material').length,totalChanges:changes.length},changes};
}

export function executiveDashboard(model,projId=null,{baseline=null,settings={},forecastStabilityScore=100,resourceScore=100}={}){
  const tasks=taskRows(model,projId),health=dcmaStyleHealth(model,projId,settings),critical=criticalTasks(model,projId,Number(settings.criticalFloatThresholdHours||0));
  const near=tasks.filter(t=>{const tf=num(t.total_float_hr_cnt);return tf>Number(settings.criticalFloatThresholdHours||0)&&tf<=Number(settings.nearCriticalThresholdHours||80)});
  const dates=tasks.map(t=>p6Date(dateOf(t))).filter(Boolean),currentFinish=dates.length?new Date(Math.max(...dates.map(d=>d.getTime()))):null;
  let baselineFinish=null;if(baseline){const bDates=taskRows(baseline.model,baseline.projId).map(t=>p6Date(dateOf(t))).filter(Boolean);baselineFinish=bDates.length?new Date(Math.max(...bDates.map(d=>d.getTime()))):null}
  const progress=tasks.length?tasks.reduce((s,t)=>s+num(t.phys_complete_pct||t.complete_pct),0)/tasks.length:0;
  const radar=scheduleRiskRadar(model,projId,settings,forecastStabilityScore,resourceScore);
  return {currentFinish,baselineFinish,finishVarianceDays:currentFinish&&baselineFinish?(currentFinish-baselineFinish)/86400000:null,critical:critical.length,nearCritical:near.length,negativeFloat:tasks.filter(t=>num(t.total_float_hr_cnt)<0).length,averageProgress:progress,scheduleHealth:health.score,riskScore:radar.overall,dataDate:getDataDate(model,projId),activities:tasks.length};
}

export function generateScheduleNarrative(model,projId=null,{baseline=null,settings={},comparison=null,resourceSummary=null,forecast=null}={}){
  const d=executiveDashboard(model,projId,{baseline,settings,forecastStabilityScore:forecast?.score??100}),lines=[];
  lines.push('Executive Summary');
  lines.push(`The current schedule contains ${d.activities.toLocaleString()} activities. The current forecast completion is ${d.currentFinish?d.currentFinish.toLocaleDateString('en-GB'):'not available'}.`);
  if(d.baselineFinish)lines.push(`The selected baseline completion is ${d.baselineFinish.toLocaleDateString('en-GB')}, giving a current variance of ${d.finishVarianceDays>=0?'+':''}${d.finishVarianceDays.toFixed(1)} calendar days.`);
  lines.push(`There are ${d.critical} critical activities, ${d.nearCritical} near-critical activities and ${d.negativeFloat} activities with negative float.`);
  lines.push(`Schedule health score: ${d.scheduleHealth}/100. Risk radar score: ${d.riskScore}/100.`);
  lines.push('', 'Progress');lines.push(`Average reported activity progress is ${d.averageProgress.toFixed(1)}%. Data Date: ${d.dataDate||'not available'}.`);
  if(comparison){lines.push('', 'Key Schedule Changes');lines.push(`${comparison.summary.total||comparison.changes?.length||0} underlying changes were identified, including ${comparison.summary.critical||0} critical and ${comparison.summary.material||0} material changes.`)}
  if(resourceSummary){const peak=[...(resourceSummary.summary||[])].sort((a,b)=>b.peakForecast-a.peakForecast)[0];if(peak){lines.push('', 'Resource Trends');lines.push(`The highest forecast resource peak is ${peak.peakForecast.toFixed(1)} for ${peak.resource}. ${resourceSummary.overloads?.length||0} resource overload periods were identified.`)}}
  if(forecast){lines.push('', 'Forecast Stability');lines.push(`Historical forecast confidence for the selected target is ${forecast.confidence||forecast.rating||'not available'} with a stability score of ${forecast.score??'—'}/100. This is an analytical historical indicator, not a deterministic probability.`)}
  lines.push('', 'Planner Attention');lines.push('Review critical/material change-register items, negative-float paths, missing logic, progress inconsistencies, resource overloads and any calendar/constraint changes before issuing the schedule narrative externally.');
  return lines.join('\n');
}

export function buildLookahead(model,projId=null,{weeks=6,wbsId='',status='',fromDate=null}={}){
  const start=fromDate?new Date(fromDate):p6Date(getDataDate(model,projId))||new Date(),end=new Date(start.getTime()+weeks*7*86400000);
  return taskRows(model,projId).filter(t=>{const s=p6Date(dateOf(t,'start')),f=p6Date(dateOf(t,'finish'));if(!s&&!f)return false;const intersects=(s&&s<=end&&(!f||f>=start))||(f&&f>=start&&f<=end);return intersects&&(!wbsId||String(t.wbs_id)===String(wbsId))&&(!status||String(t.status_code||'').includes(status))}).map(t=>({activity:t.task_code||t.task_id,name:t.task_name||'',wbs_id:t.wbs_id||'',status:t.status_code||'',start:dateOf(t,'start'),finish:dateOf(t,'finish'),total_float_hours:num(t.total_float_hr_cnt),percent_complete:num(t.phys_complete_pct||t.complete_pct)})).sort((a,b)=>(p6Date(a.start)?.getTime()||0)-(p6Date(b.start)?.getTime()||0));
}
