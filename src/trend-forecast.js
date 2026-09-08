import { num, p6Date } from './parser.js';
import { revisionModel } from './forensic-repository.js';
import { taskRows } from './semantic.js';

function taskKey(t){return String(t?.task_code||t?.task_id||'')}
function findTask(model,projectId,key){return taskRows(model,projectId).find(t=>taskKey(t)===String(key)||String(t.task_id)===String(key))||null}
function finish(t){return t?.target_end_date||t?.early_end_date||t?.reend_date||t?.act_end_date||''}

export function activityTimeline(revisions=[],activityKey){
  return revisions.map(r=>{const m=revisionModel(r),t=findTask(m,r.projectId,activityKey);return t?{revisionId:r.id,revision:r.name,dataDate:r.dataDate,activity:taskKey(t),name:t.task_name||'',start:t.target_start_date||t.early_start_date||'',finish:finish(t),durationHours:num(t.target_drtn_hr_cnt),remainingHours:num(t.remain_drtn_hr_cnt),totalFloatHours:num(t.total_float_hr_cnt),percentComplete:num(t.phys_complete_pct||t.complete_pct),calendar:t.clndr_id||'',constraint:t.cstr_type||'',critical:num(t.total_float_hr_cnt)<=0}:null}).filter(Boolean);
}

export function forecastStability(revisions=[],activityKey){
  const timeline=activityTimeline(revisions,activityKey),moves=[];
  for(let i=1;i<timeline.length;i++){const a=p6Date(timeline[i-1].finish),b=p6Date(timeline[i].finish);if(a&&b)moves.push((b-a)/86400000)}
  const avg=moves.length?moves.reduce((s,x)=>s+Math.abs(x),0)/moves.length:0;
  const mean=moves.length?moves.reduce((s,x)=>s+x,0)/moves.length:0;
  const std=moves.length?Math.sqrt(moves.reduce((s,x)=>s+(x-mean)**2,0)/moves.length):0;
  const cumulative=moves.reduce((s,x)=>s+x,0),deteriorations=moves.filter(x=>x>0).length,criticalEntries=timeline.reduce((n,x,i)=>n+(i>0&&x.critical&&!timeline[i-1].critical?1:0),0);
  const score=Math.max(0,Math.round(100-Math.min(50,avg*4)-Math.min(30,std*2)-Math.min(20,criticalEntries*5)));
  return {activityKey,timeline,moves,averageAbsoluteMovementDays:avg,standardDeviationDays:std,cumulativeSlippageDays:cumulative,deteriorations,criticalEntries,score,rating:score>=85?'High':score>=65?'Medium':'Low'};
}

export function milestoneTrend(revisions=[],milestoneKeys=[]){
  const rows=[];
  for(const key of milestoneKeys)for(const r of revisions){const m=revisionModel(r),t=findTask(m,r.projectId,key);if(!t)continue;rows.push({milestone:key,name:t.task_name||'',revision:r.name,dataDate:r.dataDate,forecastDate:finish(t),floatHours:num(t.total_float_hr_cnt),critical:num(t.total_float_hr_cnt)<=0})}
  const grouped={};for(const row of rows)(grouped[row.milestone]??=[]).push(row);
  for(const group of Object.values(grouped))for(let i=0;i<group.length;i++){if(i){const a=p6Date(group[i-1].forecastDate),b=p6Date(group[i].forecastDate);group[i].movementSincePreviousDays=a&&b?(b-a)/86400000:null}else group[i].movementSincePreviousDays=null;const base=p6Date(group[0].forecastDate),cur=p6Date(group[i].forecastDate);group[i].movementSinceFirstDays=base&&cur?(cur-base)/86400000:null}
  return rows;
}

export function forecastConfidence(revisions=[],activityKey){
  const s=forecastStability(revisions,activityKey),last=s.timeline.at(-1),current=p6Date(last?.finish);
  const rangeDays=Math.max(1,s.averageAbsoluteMovementDays+s.standardDeviationDays);
  return {activity:activityKey,currentForecast:last?.finish||'',expectedLow:current?new Date(current.getTime()-rangeDays*86400000):null,expectedHigh:current?new Date(current.getTime()+rangeDays*86400000):null,confidence:s.rating,score:s.score,rangeDays,assumptions:'Historical range uses prior forecast movement only. It is not a Monte Carlo probability or deterministic CPM result.'};
}

export function stalledActivities(revisions=[],{thresholdPercent=90,minPeriods=3}={}){
  if(revisions.length<minPeriods)return [];
  const keys=new Set();for(const r of revisions){const m=revisionModel(r);for(const t of taskRows(m,r.projectId))keys.add(taskKey(t))}
  const out=[];for(const key of keys){const tl=activityTimeline(revisions,key);const tail=tl.slice(-minPeriods);if(tail.length<minPeriods)continue;const pcts=tail.map(x=>x.percentComplete),rems=tail.map(x=>x.remainingHours);if(pcts.every(p=>p>=thresholdPercent&&p<100)){const nonReducing=rems.every((v,i)=>i===0||v>=rems[i-1]-0.001);out.push({activity:key,name:tail.at(-1).name,periods:minPeriods,percentComplete:pcts.at(-1),remainingHours:rems.at(-1),nonReducingRemainingDuration:nonReducing,detail:`At or above ${thresholdPercent}% for ${minPeriods} revisions${nonReducing?' with non-reducing remaining duration':''}.`})}}
  return out;
}
