import { num, p6Date } from './parser.js';
import { taskRows, predRows, taskStart, taskFinish } from './semantic.js';
import { traceFloatPaths } from './float-paths.js';

const code=t=>String(t?.task_code||t?.task_id||'');
const rtype=r=>String(r?.pred_type||'FS').replace(/^PR_/,'').toUpperCase();
export function networkIntelligence(model,projId=null,{mergeThreshold=5,divergenceThreshold=5}={}){
 const tasks=taskRows(model,projId),rels=predRows(model,projId),byId=new Map(tasks.map(t=>[String(t.task_id),t])),pred=new Map(),succ=new Map();
 for(const t of tasks){pred.set(String(t.task_id),[]);succ.set(String(t.task_id),[])}
 for(const r of rels){pred.get(String(r.task_id))?.push(r);succ.get(String(r.pred_task_id))?.push(r)}
 const nodes=tasks.map(t=>({taskId:String(t.task_id),activity:code(t),name:t.task_name||'',wbsId:t.wbs_id||'',predecessors:pred.get(String(t.task_id))?.length||0,successors:succ.get(String(t.task_id))?.length||0,totalFloatHours:num(t.total_float_hr_cnt),durationHours:num(t.target_drtn_hr_cnt),critical:num(t.total_float_hr_cnt)<=0,mergeIndex:pred.get(String(t.task_id))?.length||0,divergenceIndex:succ.get(String(t.task_id))?.length||0,centrality:(pred.get(String(t.task_id))?.length||0)*(succ.get(String(t.task_id))?.length||0)}));
 const seen=new Set(),components=[];
 for(const n of nodes){if(seen.has(n.taskId))continue;const q=[n.taskId],ids=[];let qi=0;seen.add(n.taskId);while(qi<q.length){const x=q[qi++];ids.push(x);for(const r of pred.get(x)||[]){const y=String(r.pred_task_id);if(byId.has(y)&&!seen.has(y)){seen.add(y);q.push(y)}}for(const r of succ.get(x)||[]){const y=String(r.task_id);if(byId.has(y)&&!seen.has(y)){seen.add(y);q.push(y)}}}components.push(ids)}
 const mergeHotspots=nodes.filter(n=>n.predecessors>=mergeThreshold).sort((a,b)=>b.predecessors-a.predecessors||b.centrality-a.centrality),divergenceHotspots=nodes.filter(n=>n.successors>=divergenceThreshold).sort((a,b)=>b.successors-a.successors||b.centrality-a.centrality),isolated=nodes.filter(n=>!n.predecessors&&!n.successors),density=tasks.length?rels.length/tasks.length:0;
 const distribution=(field)=>{const m=new Map();for(const n of nodes){const v=n[field],bucket=v>=10?'10+':String(v);m.set(bucket,(m.get(bucket)||0)+1)}return [...m].map(([bucket,count])=>({bucket,count})).sort((a,b)=>{const na=parseInt(a.bucket),nb=parseInt(b.bucket);return na-nb})};
 return {nodes,relationships:rels.length,density,components:components.sort((a,b)=>b.length-a.length),mergeHotspots,divergenceHotspots,isolated,predecessorDistribution:distribution('predecessors'),successorDistribution:distribution('successors')};
}

export function pathExplorer(model,projId,targetTaskId,{maxPaths=10,maxDepth=300}={}){
 const raw=traceFloatPaths(model,projId,targetTaskId,{maxPaths,maxDepth});
 return raw.map(p=>{const acts=p.activities||[],start=acts.map(taskStart).filter(Boolean).sort((a,b)=>a-b)[0]||null,finish=acts.map(taskFinish).filter(Boolean).sort((a,b)=>b-a)[0]||null,durationDays=start&&finish?(finish-start)/86400000:0;return {rank:p.rank,floatHours:p.floatHours,durationDays,activities:acts.length,start:start?.toISOString()||'',finish:finish?.toISOString()||'',activityIds:acts.map(code),activityNames:acts.map(a=>a.task_name||''),relationships:p.relationships||[]}}).sort((a,b)=>a.floatHours-b.floatHours||b.durationDays-a.durationDays);
}

/** Compare one activity between two model revisions and list direct evidence. */
export function dateMoveContributions(oldModel,newModel,oldProjId,newProjId,activityKey){
 const find=(m,p)=>taskRows(m,p).find(t=>code(t)===String(activityKey)||String(t.task_id)===String(activityKey));
 const a=find(oldModel,oldProjId),b=find(newModel,newProjId);if(!a||!b)return {activity:activityKey,found:false,contributions:[],movementDays:null};
 const od=p6Date(a.target_end_date||a.early_end_date||a.reend_date),nd=p6Date(b.target_end_date||b.early_end_date||b.reend_date),movementDays=od&&nd?(nd-od)/86400000:null,contributions=[];
 const push=(type,oldValue,newValue,weight,detail)=>{if(String(oldValue??'')===String(newValue??''))return;contributions.push({type,oldValue,newValue,weight,detail})};
 push('Start',a.target_start_date||a.early_start_date,b.target_start_date||b.early_start_date,3,'Activity start moved.');
 push('Finish',a.target_end_date||a.early_end_date||a.reend_date,b.target_end_date||b.early_end_date||b.reend_date,4,'Activity finish moved.');
 push('Original Duration',num(a.target_drtn_hr_cnt),num(b.target_drtn_hr_cnt),3,'Original duration changed.');
 push('Remaining Duration',num(a.remain_drtn_hr_cnt),num(b.remain_drtn_hr_cnt),2,'Remaining duration changed.');
 push('Calendar',a.clndr_id,b.clndr_id,3,'Calendar assignment changed.');
 push('Primary Constraint',`${a.cstr_type||''} ${a.cstr_date||''}`,`${b.cstr_type||''} ${b.cstr_date||''}`,3,'Constraint changed.');
 push('Actual Start',a.act_start_date,b.act_start_date,2,'Progress timing changed.');
 push('Actual Finish',a.act_end_date,b.act_end_date,2,'Completion timing changed.');
 const relKey=r=>`${r.pred_task_id}|${rtype(r)}|${num(r.lag_hr_cnt)}`;
 const ra=new Set(predRows(oldModel,oldProjId).filter(r=>String(r.task_id)===String(a.task_id)).map(relKey)),rb=new Set(predRows(newModel,newProjId).filter(r=>String(r.task_id)===String(b.task_id)).map(relKey));
 const added=[...rb].filter(x=>!ra.has(x)),removed=[...ra].filter(x=>!rb.has(x));if(added.length)contributions.push({type:'Predecessor Logic Added',oldValue:'',newValue:added.join(', '),weight:4,detail:`${added.length} predecessor relationship(s) added.`});if(removed.length)contributions.push({type:'Predecessor Logic Removed',oldValue:removed.join(', '),newValue:'',weight:4,detail:`${removed.length} predecessor relationship(s) removed.`});
 contributions.sort((x,y)=>y.weight-x.weight);return {found:true,activity:code(b),name:b.task_name||'',movementDays,oldFinish:od?.toISOString()||'',newFinish:nd?.toISOString()||'',contributions,caveat:'Direct field and logic changes are confirmed evidence. Exact causal apportionment requires a scheduling replay/window analysis.'};
}
