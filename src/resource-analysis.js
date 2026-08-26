import { num, p6Date } from './parser.js';
import { taskRows, resourceAssignments, getDataDate } from './semantic.js';

const HOUR=3600000, DAY=86400000;
function floorDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function dateKey(d){return d.toISOString().slice(0,10)}
function taskDates(t){
  const s=p6Date(t.act_start_date||t.restart_date||t.early_start_date||t.target_start_date);
  const f=p6Date(t.act_end_date||t.reend_date||t.early_end_date||t.target_end_date);
  return {start:s,finish:f};
}
export function resourceSheetRows(model,projId){
  return resourceAssignments(model,projId).map(r=>{
    const t=model.find('TASK','task_id',r.task_id)||{};const res=model.find('RSRC','rsrc_id',r.rsrc_id)||{};
    const {start,finish}=taskDates(t);
    return {task_code:t.task_code||r.task_id,task_name:t.task_name||'',wbs_id:t.wbs_id||'',resource_id:r.rsrc_id||'',resource_name:res.rsrc_name||r.rsrc_id||'',resource_type:res.rsrc_type||'',role:r.role_name||r.role_id||'',start:start?.toISOString?.().slice(0,16).replace('T',' ')||'',finish:finish?.toISOString?.().slice(0,16).replace('T',' ')||'',budget_units:num(r.target_qty),actual_units:num(r.act_reg_qty)+num(r.act_ot_qty),remaining_units:num(r.remain_qty),budget_cost:num(r.target_cost),actual_cost:num(r.act_reg_cost)+num(r.act_ot_cost),remaining_cost:num(r.remain_cost),curve_id:r.curv_id||r.curve_id||''};
  });
}
function curveWeights(model,assignment,buckets){
  const cid=assignment.curv_id||assignment.curve_id;if(!cid)return Array(buckets).fill(1/buckets);
  const rows=(model.table('RSRCCURVDATA')||model.table('CURVEDATA')||[]).filter(r=>String(r.curv_id||r.curve_id)===String(cid));
  if(!rows.length)return Array(buckets).fill(1/buckets);
  const vals=rows.map(r=>num(r.curv_value||r.value||r.pct||r.curv_pct)).filter(v=>v>=0);const sum=vals.reduce((a,b)=>a+b,0);if(!sum)return Array(buckets).fill(1/buckets);
  const sampled=Array.from({length:buckets},(_,i)=>vals[Math.min(vals.length-1,Math.floor(i*vals.length/buckets))]);const sampledSum=sampled.reduce((a,b)=>a+b,0)||1;return sampled.map(v=>v/sampledSum);
}
export function buildResourceTimeSeries(model,projId,{bucket='week',resourceId='',mode='units'}={}){
  const assignments=resourceAssignments(model,projId).filter(r=>!resourceId||String(r.rsrc_id)===String(resourceId));
  const series=new Map(),bucketMs=bucket==='day'?DAY:bucket==='month'?30*DAY:7*DAY,dataDate=p6Date(getDataDate(model,projId));
  const addWindow=(r,start,finish,qty,field)=>{if(!start||!finish||isNaN(start)||isNaN(finish)||!qty)return;const s=floorDay(start),f=new Date(Math.max(s.getTime()+HOUR,finish.getTime()));const count=Math.max(1,Math.ceil((f-s)/bucketMs));const weights=curveWeights(model,r,count);for(let i=0;i<count;i++){const d=new Date(s.getTime()+i*bucketMs),key=dateKey(d),x=series.get(key)||{date:key,budget:0,actual:0,remaining:0,forecast:0};x[field]+=qty*weights[i];series.set(key,x)}};
  for(const r of assignments){const t=model.find('TASK','task_id',r.task_id);if(!t)continue;
    const plannedStart=p6Date(t.target_start_date||t.early_start_date||t.act_start_date),plannedFinish=p6Date(t.target_end_date||t.early_end_date||t.act_end_date);
    const actualStart=p6Date(t.act_start_date||plannedStart),actualFinish=p6Date(t.act_end_date)||(dataDate&&actualStart?new Date(Math.max(actualStart.getTime()+HOUR,dataDate.getTime())):plannedFinish);
    const remainStart=p6Date(t.restart_date||t.early_start_date||plannedStart),remainFinish=p6Date(t.reend_date||t.early_end_date||plannedFinish);
    const budget=mode==='cost'?num(r.target_cost):num(r.target_qty),actual=mode==='cost'?num(r.act_reg_cost)+num(r.act_ot_cost):num(r.act_reg_qty)+num(r.act_ot_qty),remain=mode==='cost'?num(r.remain_cost):num(r.remain_qty);
    addWindow(r,plannedStart,plannedFinish,budget,'budget');addWindow(r,actualStart,actualFinish,actual,'actual');addWindow(r,remainStart,remainFinish,remain,'remaining');
  }
  for(const x of series.values())x.forecast=x.actual+x.remaining;
  return [...series.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function cumulativeSeries(rows){let b=0,a=0,r=0,f=0;return rows.map(x=>({date:x.date,budget:(b+=x.budget),actual:(a+=x.actual),remaining:(r+=x.remaining),forecast:(f+=x.forecast)}))}
export function summarizeResources(model,projId){const rows=resourceSheetRows(model,projId),map=new Map();for(const r of rows){const k=r.resource_id||r.resource_name,x=map.get(k)||{resource_id:r.resource_id,resource_name:r.resource_name,resource_type:r.resource_type,assignments:0,budget_units:0,actual_units:0,remaining_units:0,budget_cost:0,actual_cost:0,remaining_cost:0};x.assignments++;for(const f of ['budget_units','actual_units','remaining_units','budget_cost','actual_cost','remaining_cost'])x[f]+=num(r[f]);map.set(k,x)}return [...map.values()].sort((a,b)=>String(a.resource_name).localeCompare(String(b.resource_name)))}
