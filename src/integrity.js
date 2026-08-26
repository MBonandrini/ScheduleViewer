/**
 * Cross-table schedule integrity validation.
 * These checks deliberately validate domain references rather than vendor formatting.
 */
export function validateModelIntegrity(model,{projectId=null,maxIssues=5000}={}){
  const issues=[]; const add=(severity,code,message,context={})=>{if(issues.length<maxIssues)issues.push({severity,code,message,context})};
  const rows=n=>model.table(n)||[];
  const ids=(n,f)=>new Set(rows(n).map(r=>String(r[f]??'')).filter(Boolean));
  const projects=ids('PROJECT','proj_id'), tasks=ids('TASK','task_id'), wbs=ids('PROJWBS','wbs_id'), calendars=ids('CALENDAR','clndr_id'), resources=ids('RSRC','rsrc_id');
  const taskById=new Map(rows('TASK').map(r=>[String(r.task_id),r]));
  const wbsById=new Map(rows('PROJWBS').map(r=>[String(r.wbs_id),r]));

  unique(rows('PROJECT'),'proj_id','PROJECT',add);
  unique(rows('PROJWBS'),'wbs_id','PROJWBS',add);
  unique(rows('TASK'),'task_id','TASK',add);
  unique(rows('TASKPRED'),'task_pred_id','TASKPRED',add,{allowBlank:true});
  unique(rows('RSRC'),'rsrc_id','RSRC',add);
  unique(rows('TASKRSRC'),'taskrsrc_id','TASKRSRC',add,{allowBlank:true});

  for(const w of rows('PROJWBS')){
    if(projects.size && w.proj_id && !projects.has(String(w.proj_id))) add('error','WBS_PROJECT_MISSING',`WBS ${w.wbs_short_name||w.wbs_id} references missing project ${w.proj_id}.`,{wbs_id:w.wbs_id,proj_id:w.proj_id});
    const p=String(w.parent_wbs_id||'');
    if(p && !wbs.has(p)) add('error','WBS_PARENT_MISSING',`WBS ${w.wbs_short_name||w.wbs_id} references missing parent WBS ${p}.`,{wbs_id:w.wbs_id,parent_wbs_id:p});
    if(p===String(w.wbs_id)) add('error','WBS_SELF_PARENT',`WBS ${w.wbs_short_name||w.wbs_id} is its own parent.`,{wbs_id:w.wbs_id});
  }
  // iterative WBS cycle detection
  for(const w of rows('PROJWBS')){
    const start=String(w.wbs_id), seen=new Set([start]); let p=String(w.parent_wbs_id||'');
    while(p){if(seen.has(p)){add('error','WBS_CYCLE',`Circular WBS hierarchy detected at ${start}.`,{wbs_id:start});break}seen.add(p);p=String(wbsById.get(p)?.parent_wbs_id||'')}
  }
  for(const t of rows('TASK')){
    if(projectId!=null && String(t.proj_id)!==String(projectId))continue;
    if(projects.size && t.proj_id && !projects.has(String(t.proj_id))) add('error','TASK_PROJECT_MISSING',`Activity ${t.task_code||t.task_id} references missing project ${t.proj_id}.`,{task_id:t.task_id});
    if(t.wbs_id && !wbs.has(String(t.wbs_id))) add('error','TASK_WBS_MISSING',`Activity ${t.task_code||t.task_id} references missing WBS ${t.wbs_id}.`,{task_id:t.task_id,wbs_id:t.wbs_id});
    if(t.clndr_id && calendars.size && !calendars.has(String(t.clndr_id))) add('warning','TASK_CALENDAR_MISSING',`Activity ${t.task_code||t.task_id} references missing calendar ${t.clndr_id}.`,{task_id:t.task_id,clndr_id:t.clndr_id});
    const od=Number(t.target_drtn_hr_cnt||0), rd=Number(t.remain_drtn_hr_cnt||0), pct=Number(t.phys_complete_pct||0);
    if(!Number.isFinite(od)||od<0)add('error','TASK_DURATION_INVALID',`Activity ${t.task_code||t.task_id} has invalid original duration.`,{task_id:t.task_id,value:t.target_drtn_hr_cnt});
    if(!Number.isFinite(rd)||rd<0)add('error','TASK_REMAINING_INVALID',`Activity ${t.task_code||t.task_id} has invalid remaining duration.`,{task_id:t.task_id,value:t.remain_drtn_hr_cnt});
    if(!Number.isFinite(pct)||pct<0||pct>100)add('warning','TASK_PERCENT_INVALID',`Activity ${t.task_code||t.task_id} has Physical % outside 0–100.`,{task_id:t.task_id,value:t.phys_complete_pct});
  }
  for(const r of rows('TASKPRED')){
    if(projectId!=null && r.proj_id && String(r.proj_id)!==String(projectId))continue;
    const pred=String(r.pred_task_id||''), succ=String(r.task_id||'');
    if(!tasks.has(pred))add('error','REL_PRED_MISSING',`Relationship ${r.task_pred_id||'(no id)'} references missing predecessor task ${pred}.`,{task_pred_id:r.task_pred_id,pred_task_id:pred,task_id:succ});
    if(!tasks.has(succ))add('error','REL_SUCC_MISSING',`Relationship ${r.task_pred_id||'(no id)'} references missing successor task ${succ}.`,{task_pred_id:r.task_pred_id,pred_task_id:pred,task_id:succ});
    if(pred&&succ&&pred===succ)add('error','REL_SELF',`Activity ${taskById.get(succ)?.task_code||succ} has a relationship to itself.`,{task_pred_id:r.task_pred_id,task_id:succ});
    if(pred&&succ&&taskById.has(pred)&&taskById.has(succ)&&String(taskById.get(pred).proj_id)!==String(taskById.get(succ).proj_id))add('warning','REL_CROSS_PROJECT',`Relationship ${r.task_pred_id||'(no id)'} crosses project boundaries.`,{task_pred_id:r.task_pred_id});
    if(r.pred_type && !['PR_FS','PR_SS','PR_FF','PR_SF'].includes(String(r.pred_type)))add('error','REL_TYPE_INVALID',`Relationship ${r.task_pred_id||'(no id)'} has unsupported type ${r.pred_type}.`,{task_pred_id:r.task_pred_id});
    if(r.lag_hr_cnt!==''&&r.lag_hr_cnt!=null&&!Number.isFinite(Number(r.lag_hr_cnt)))add('error','REL_LAG_INVALID',`Relationship ${r.task_pred_id||'(no id)'} has non-numeric lag.`,{task_pred_id:r.task_pred_id,value:r.lag_hr_cnt});
  }
  for(const a of rows('TASKRSRC')){
    if(a.task_id && !tasks.has(String(a.task_id)))add('error','ASSIGN_TASK_MISSING',`Resource assignment ${a.taskrsrc_id||'(no id)'} references missing activity ${a.task_id}.`,{taskrsrc_id:a.taskrsrc_id});
    if(a.rsrc_id && resources.size && !resources.has(String(a.rsrc_id)))add('error','ASSIGN_RESOURCE_MISSING',`Resource assignment ${a.taskrsrc_id||'(no id)'} references missing resource ${a.rsrc_id}.`,{taskrsrc_id:a.taskrsrc_id});
  }
  const errors=issues.filter(x=>x.severity==='error'), warnings=issues.filter(x=>x.severity==='warning');
  return {ok:errors.length===0,errors,warnings,issues,truncated:issues.length>=maxIssues,counts:{errors:errors.length,warnings:warnings.length,total:issues.length}};
}
function unique(rows,field,table,add,{allowBlank=false}={}){const seen=new Set();for(const r of rows){const v=String(r[field]??'');if(!v){if(!allowBlank)add('error','ID_BLANK',`${table}.${field} contains a blank identifier.`,{table,field});continue}if(seen.has(v))add('error','ID_DUPLICATE',`${table}.${field} contains duplicate identifier ${v}.`,{table,field,value:v});seen.add(v)}}

export function integritySummary(result,limit=8){
  const top=result.issues.slice(0,limit).map((x,i)=>`${i+1}. ${x.message}`);
  const more=result.issues.length>limit?`\n…and ${result.issues.length-limit} more issue(s).`:'';
  return `${result.counts.errors} error(s), ${result.counts.warnings} warning(s).${top.length?'\n\n'+top.join('\n'):''}${more}`;
}
