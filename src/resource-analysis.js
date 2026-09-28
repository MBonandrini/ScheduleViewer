import { num, p6Date } from './parser.js';
import { taskRows, resourceAssignments, getDataDate } from './semantic.js';
import { resourceDescendantIds } from './resource-tools.js';
import { wbsDescendantIds } from './editor.js';

const HOUR=3600000, DAY=86400000;
function floorDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`} 
function taskDates(t){const s=p6Date(t.act_start_date||t.restart_date||t.early_start_date||t.target_start_date);const f=p6Date(t.act_end_date||t.reend_date||t.early_end_date||t.target_end_date);return {start:s,finish:f};}
export function resourceSheetRows(model,projId){
  return resourceAssignments(model,projId).map(r=>{const t=model.find('TASK','task_id',r.task_id)||{},res=model.find('RSRC','rsrc_id',r.rsrc_id)||{},w=model.find('PROJWBS','wbs_id',t.wbs_id)||{};const {start,finish}=taskDates(t);return {assignment_id:r.taskrsrc_id||'',task_id:t.task_id||r.task_id,task_code:t.task_code||r.task_id,task_name:t.task_name||'',wbs_id:t.wbs_id||'',wbs_name:w.wbs_name||w.wbs_short_name||t.wbs_id||'',resource_id:r.rsrc_id||'',resource_name:res.rsrc_name||r.rsrc_id||'',resource_type:res.rsrc_type||'',role_id:r.role_id||'',role:r.role_name||r.role_id||'',start:start?.toISOString?.().slice(0,16).replace('T',' ')||'',finish:finish?.toISOString?.().slice(0,16).replace('T',' ')||'',budget_units:num(r.target_qty),actual_units:num(r.act_reg_qty)+num(r.act_ot_qty),remaining_units:num(r.remain_qty),budget_cost:num(r.target_cost),actual_cost:num(r.act_reg_cost)+num(r.act_ot_cost),remaining_cost:num(r.remain_cost),curve_id:r.curv_id||r.curve_id||'',target_qty_per_hr:num(r.target_qty_per_hr||r.target_qty_per_day)};});
}
function curveWeights(model,assignment,buckets){const cid=assignment.curv_id||assignment.curve_id;if(!cid)return Array(buckets).fill(1/buckets);const rows=(model.table('RSRCCURVDATA')||model.table('CURVEDATA')||[]).filter(r=>String(r.curv_id||r.curve_id)===String(cid));if(!rows.length)return Array(buckets).fill(1/buckets);const vals=rows.map(r=>num(r.curv_value||r.value||r.pct||r.curv_pct)).filter(v=>v>=0),sum=vals.reduce((a,b)=>a+b,0);if(!sum)return Array(buckets).fill(1/buckets);const sampled=Array.from({length:buckets},(_,i)=>vals[Math.min(vals.length-1,Math.floor(i*vals.length/buckets))]),sampledSum=sampled.reduce((a,b)=>a+b,0)||1;return sampled.map(v=>v/sampledSum);}
function bucketStart(value,bucket){const d=floorDay(value);if(bucket==='week'){const day=d.getDay(),shift=(day+6)%7;d.setDate(d.getDate()-shift)}else if(bucket==='month'){d.setDate(1)}else if(bucket==='quarter'){d.setMonth(Math.floor(d.getMonth()/3)*3,1)}return d}
function nextBucket(value,bucket){const d=new Date(value);if(bucket==='day')d.setDate(d.getDate()+1);else if(bucket==='week')d.setDate(d.getDate()+7);else if(bucket==='month')d.setMonth(d.getMonth()+1,1);else if(bucket==='quarter')d.setMonth(d.getMonth()+3,1);return d}
function bucketDates(start,finish,bucket){const out=[];let d=bucketStart(start,bucket),guard=0;const f=floorDay(finish);while(d<=f&&guard++<20000){out.push(new Date(d));d=nextBucket(d,bucket)}return out.length?out:[bucketStart(start,bucket)]}
function activityCodeMatch(model,taskId,typeId,valueId){if(!typeId&&!valueId)return true;return (model.table('TASKACTV')||[]).some(x=>String(x.task_id)===String(taskId)&&(!typeId||String(x.actv_code_type_id)===String(typeId))&&(!valueId||String(x.actv_code_id)===String(valueId)));}
export function filterResourceAssignments(model,projId,opts={}){
  const {resourceId='',includeResourceDescendants=false,resourceType='',roleId='',wbsId='',includeWbsDescendants=true,status='',activityCodeTypeId='',activityCodeValueId=''}=opts;
  const rids=resourceId?new Set([String(resourceId),...(includeResourceDescendants?resourceDescendantIds(model,resourceId):[])]):null;
  const wids=wbsId?new Set([String(wbsId),...(includeWbsDescendants?wbsDescendantIds(model,wbsId):[])]):null;
  return resourceAssignments(model,projId).filter(r=>{const t=model.find('TASK','task_id',r.task_id),res=model.find('RSRC','rsrc_id',r.rsrc_id);if(!t)return false;if(rids&&!rids.has(String(r.rsrc_id)))return false;if(resourceType&&String(res?.rsrc_type||'')!==String(resourceType))return false;if(roleId&&String(r.role_id||'')!==String(roleId))return false;if(wids&&!wids.has(String(t.wbs_id||'')))return false;if(status&&String(t.status_code||'')!==String(status))return false;if(!activityCodeMatch(model,t.task_id,activityCodeTypeId,activityCodeValueId))return false;return true;});
}
export function buildResourceTimeSeries(model,projId,opts={}){
  const {bucket='week',mode='units',startDate='',finishDate=''}=opts,assignments=filterResourceAssignments(model,projId,opts),series=new Map(),dataDate=p6Date(getDataDate(model,projId)),clipStart=p6Date(startDate),clipFinish=p6Date(finishDate);
  if(!['day','week','month','quarter'].includes(bucket))throw new Error('Unsupported time interval');
  const addWindow=(r,start,finish,qty,field)=>{if(!start||!finish||isNaN(start)||isNaN(finish)||!qty)return;
   const s=new Date(start),f=new Date(Math.max(+s,+finish));const dates=bucketDates(s,new Date(Math.max(+s,+f-1)),'day');
   const base=curveWeights(model,r,dates.length),weights=dates.map((d,i)=>base[i]*Math.max(0,Math.min(+nextBucket(d,'day'),+f)-Math.max(+d,+s))),total=weights.reduce((a,b)=>a+b,0);
   for(let i=0;i<dates.length;i++){const d=bucketStart(dates[i],bucket);if(clipStart&&d<bucketStart(clipStart,bucket))continue;if(clipFinish&&d>bucketStart(clipFinish,bucket))continue;const key=dateKey(d),x=series.get(key)||{date:key,periodEnd:dateKey(nextBucket(d,bucket)),budget:0,actual:0,remaining:0,forecast:0};x[field]+=qty*(total?weights[i]/total:1/dates.length);series.set(key,x)}
  };
  for(const r of assignments){const t=model.find('TASK','task_id',r.task_id);if(!t)continue;const plannedStart=p6Date(t.target_start_date||t.early_start_date||t.act_start_date),plannedFinish=p6Date(t.target_end_date||t.early_end_date||t.act_end_date),actualStart=p6Date(t.act_start_date||plannedStart),actualFinish=p6Date(t.act_end_date)||(dataDate&&actualStart?new Date(Math.max(actualStart.getTime()+HOUR,dataDate.getTime())):plannedFinish),remainStart=p6Date(t.restart_date||t.early_start_date||plannedStart),remainFinish=p6Date(t.reend_date||t.early_end_date||plannedFinish),budget=mode==='cost'?num(r.target_cost):num(r.target_qty),actual=mode==='cost'?num(r.act_reg_cost)+num(r.act_ot_cost):num(r.act_reg_qty)+num(r.act_ot_qty),remain=mode==='cost'?num(r.remain_cost):num(r.remain_qty);addWindow(r,plannedStart,plannedFinish,budget,'budget');addWindow(r,actualStart,actualFinish,actual,'actual');addWindow(r,dataDate&&remainStart&&remainStart<dataDate?dataDate:remainStart,remainFinish,remain,'remaining');}
  if(series.size){const keys=[...series.keys()].sort();for(const d of bucketDates(p6Date(keys[0]),p6Date(keys.at(-1)),bucket)){const key=dateKey(d);if(!series.has(key))series.set(key,{date:key,periodEnd:dateKey(nextBucket(d,bucket)),budget:0,actual:0,remaining:0,forecast:0})}}
  for(const x of series.values())x.forecast=x.actual+x.remaining;return [...series.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function cumulativeSeries(rows){let b=0,a=0,r=0,f=0;return rows.map(x=>({date:x.date,periodEnd:x.periodEnd,budget:(b+=x.budget),actual:(a+=x.actual),remaining:(r+=x.remaining),forecast:(f+=x.forecast)}))}
export function summarizeResources(model,projId){const rows=resourceSheetRows(model,projId),map=new Map();for(const r of rows){const k=r.resource_id||r.resource_name,x=map.get(k)||{resource_id:r.resource_id,resource_name:r.resource_name,resource_type:r.resource_type,assignments:0,budget_units:0,actual_units:0,remaining_units:0,budget_cost:0,actual_cost:0,remaining_cost:0};x.assignments++;for(const f of ['budget_units','actual_units','remaining_units','budget_cost','actual_cost','remaining_cost'])x[f]+=num(r[f]);map.set(k,x)}return [...map.values()].sort((a,b)=>String(a.resource_name).localeCompare(String(b.resource_name)))}

/** Replace only planned values; preserve all current actual and remaining quantities. */
export function mergePlannedSeries(current,planned){const map=new Map(current.map(r=>[r.date,{...r,budget:0}]));for(const p of planned){const r=map.get(p.date)||{date:p.date,periodEnd:p.periodEnd,budget:0,actual:0,remaining:0,forecast:0};r.budget=p.budget;map.set(p.date,r)}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
/** Match filtered comparison schedules using business keys, never export-specific IDs. */
export function buildPlannedTimeSeries(currentModel,currentProject,plannedModel,plannedProject,opts={}){
 const scoped=!!(opts.resourceId||opts.resourceType||opts.roleId||opts.wbsId||opts.status||opts.activityCodeTypeId||opts.activityCodeValueId);
 const selected=filterResourceAssignments(currentModel,currentProject,opts),codes=new Set(selected.map(r=>String(currentModel.find('TASK','task_id',r.task_id)?.task_code||'')));
 const resourceKey=(m,id)=>{const r=m.find('RSRC','rsrc_id',id);return String(r?.rsrc_short_name||r?.rsrc_name||id||'')};
 const resourceScoped=!!(opts.resourceId||opts.resourceType),resources=new Set(selected.map(r=>resourceKey(currentModel,r.rsrc_id)));
 const roleKey=(m,id)=>{const r=m.find('ROLE','role_id',id)||m.find('ROLES','role_id',id);return String(r?.role_short_name||r?.role_name||id||'')};
 const roles=new Set(selected.map(r=>roleKey(currentModel,r.role_id)));
 const ids=new Set(taskRows(plannedModel,plannedProject).filter(t=>!scoped||codes.has(String(t.task_code||''))).map(t=>String(t.task_id)));
 const proxy={table:name=>name==='TASKRSRC'?plannedModel.table(name).filter(r=>ids.has(String(r.task_id))&&(!resourceScoped||resources.has(resourceKey(plannedModel,r.rsrc_id)))&&(!opts.roleId||roles.has(roleKey(plannedModel,r.role_id)))):plannedModel.table(name),find:(...args)=>plannedModel.find(...args)};
 return buildResourceTimeSeries(proxy,plannedProject,{bucket:opts.bucket,mode:opts.mode,startDate:opts.startDate,finishDate:opts.finishDate});
}
