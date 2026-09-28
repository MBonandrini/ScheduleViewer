import {wbsRollup} from './report-hierarchy.js';
import {activityPercentComplete} from './p6-activity-validation.js';
import { num, p6Date } from './parser.js';
import { taskRows, getDataDate } from './semantic.js';
import { revisionModel } from './forensic-repository.js';

const code=t=>String(t?.task_code||t?.task_id||'');
const days=(a,b)=>{const x=p6Date(a),y=p6Date(b);return x&&y?(y-x)/86400000:null};
function plannedPercent(t,dd){const s=p6Date(t.target_start_date||t.early_start_date),f=p6Date(t.target_end_date||t.early_end_date);if(!s||!f||!dd)return 0;if(dd<=s)return 0;if(dd>=f)return 100;return 100*(dd-s)/Math.max(1,f-s)}
export function progressIntelligence(model,projId=null,{baseline=null}={}){
 const tasks=taskRows(model,projId),dd=p6Date(getDataDate(model,projId)),weights=tasks.map(t=>Math.max(1,num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt))),totalW=weights.reduce((a,b)=>a+b,0)||1;
 let actual=0,planned=0;for(let i=0;i<tasks.length;i++){actual+=weights[i]*activityPercentComplete(tasks[i],model);planned+=weights[i]*plannedPercent(tasks[i],dd)}
 actual/=totalW;planned/=totalW;const spi=planned>0?actual/planned:null;
 const started=tasks.filter(t=>p6Date(t.act_start_date)),finished=tasks.filter(t=>p6Date(t.act_end_date));
 const startVars=started.map(t=>days(t.target_start_date||t.early_start_date,t.act_start_date)).filter(Number.isFinite),finishVars=finished.map(t=>days(t.target_end_date||t.early_end_date,t.act_end_date)).filter(Number.isFinite);
 const durationVars=finished.map(t=>{const od=num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt),ad=num(t.act_drtn_hr_cnt||t.act_work_qty);return od>0&&ad>=0?100*(ad-od)/od:null}).filter(Number.isFinite);
 const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
 const onTime=a=>a.length?100*a.filter(x=>x<=0).length/a.length:0;
 const critical=tasks.filter(t=>num(t.total_float_hr_cnt)<=0).length,negative=tasks.filter(t=>num(t.total_float_hr_cnt)<0).length;
 const baseFinish=baseline?.model?taskRows(baseline.model,baseline.projectId||projId).map(t=>p6Date(t.target_end_date||t.early_end_date)).filter(Boolean).sort((a,b)=>b-a)[0]:null,currentFinish=tasks.map(t=>p6Date(t.target_end_date||t.early_end_date)).filter(Boolean).sort((a,b)=>b-a)[0]||null,finishVarianceDays=baseFinish&&currentFinish?(currentFinish-baseFinish)/86400000:null;
 return {dataDate:dd?.toISOString()||'',actualProgress:actual,plannedProgress:planned,spi,startAccuracy:{meanVarianceDays:avg(startVars),onTimePercent:onTime(startVars),sample:startVars.length},finishAccuracy:{meanVarianceDays:avg(finishVars),onTimePercent:onTime(finishVars),sample:finishVars.length},durationAccuracy:{meanVariancePercent:avg(durationVars),within10Percent:durationVars.length?100*durationVars.filter(x=>Math.abs(x)<=10).length/durationVars.length:0,sample:durationVars.length},critical,negativeFloat:negative,currentFinish:currentFinish?.toISOString()||'',baselineFinish:baseFinish?.toISOString()||'',finishVarianceDays};
}

export function revisionProgressTrend(revisions=[]){
 const out=[];for(const r of revisions){const m=revisionModel(r),p=progressIntelligence(m,r.projectId);out.push({revisionId:r.id,revision:r.name,dataDate:r.dataDate,actualProgress:p.actualProgress,plannedProgress:p.plannedProgress,spi:p.spi,finish:p.currentFinish,critical:p.critical,negativeFloat:p.negativeFloat})}return out;
}

export function revisionThroughput(revisions=[]){
 if(revisions.length<2)return [];
 const out=[];for(let i=1;i<revisions.length;i++){const a=revisions[i-1],b=revisions[i],ma=revisionModel(a),mb=revisionModel(b),before=new Set(taskRows(ma,a.projectId).filter(t=>p6Date(t.act_end_date)).map(code)),after=taskRows(mb,b.projectId).filter(t=>p6Date(t.act_end_date)),newly=after.filter(t=>!before.has(code(t))),d1=p6Date(a.dataDate),d2=p6Date(b.dataDate),periodDays=d1&&d2?Math.max(1,(d2-d1)/86400000):null;out.push({revision:b.name,dataDate:b.dataDate,completed:newly.length,periodDays,activitiesPerDay:periodDays?newly.length/periodDays:null,activityIds:newly.map(code)})}return out;
}

export function wbsPerformance(model,projId=null){
 const records=taskRows(model,projId).map(t=>{const finished=!!p6Date(t.act_end_date),v=days(t.target_end_date||t.early_end_date,t.act_end_date);return {...t,activities:1,progressSum:activityPercentComplete(t,model),critical:num(t.total_float_hr_cnt)<=0?1:0,negative:num(t.total_float_hr_cnt)<0?1:0,finished:finished?1:0,lateFinished:finished&&Number.isFinite(v)&&v>0?1:0};});
 return wbsRollup(model,projId,records,['activities','progressSum','critical','negative','finished','lateFinished']).map(({records,...r})=>({...r,averageProgress:r.progressSum/Math.max(1,r.activities),finishOnTimePercent:r.finished?100*(r.finished-r.lateFinished)/r.finished:null}));
}
