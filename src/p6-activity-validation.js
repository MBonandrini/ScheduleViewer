import { p6Date, num } from './parser.js';

const clampPct=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):0));
const upper=v=>String(v||'').toUpperCase();

export function isMilestoneActivity(task){
  const t=upper(task?.task_type);
  return t==='TT_STARTMILE'||t==='TT_FINMILE'||t.includes('MILE');
}
export function isStartMilestone(task){return upper(task?.task_type)==='TT_STARTMILE';}
export function isFinishMilestone(task){return upper(task?.task_type)==='TT_FINMILE';}
export function isWbsSummaryActivity(task){return upper(task?.task_type)==='TT_WBS';}
export function isLevelOfEffortActivity(task){return upper(task?.task_type)==='TT_LOE';}
export function isCompletedActivity(task){return upper(task?.status_code)==='TK_COMPLETE'||/COMPLETE/.test(upper(task?.status_code));}
export function isInProgressActivity(task){const s=upper(task?.status_code);return s==='TK_ACTIVE'||/ACTIVE|PROGRESS|STARTED/.test(s);}
export function isNotStartedActivity(task){const s=upper(task?.status_code);return s==='TK_NOTSTART'||/NOT.?START/.test(s);}

function assignmentUnitPercent(model,taskId){
  const rows=(model?.table?.('TASKRSRC')||[]).filter(r=>String(r.task_id)===String(taskId));
  let actual=0,remaining=0;
  for(const r of rows){
    actual+=num(r.act_reg_qty,0)+num(r.act_ot_qty,0);
    remaining+=num(r.remain_qty,0);
  }
  const total=actual+remaining;
  return total>0?clampPct(actual/total*100):0;
}

export function activityPercentComplete(task,model=null){
  if(!task)return 0;
  if(isMilestoneActivity(task)){
    if(isCompletedActivity(task))return 100;
    if(isStartMilestone(task)&&task.act_start_date)return 100;
    if(isFinishMilestone(task)&&task.act_end_date)return 100;
    return clampPct(num(task.phys_complete_pct,0))>=100?100:0;
  }
  const type=upper(task.complete_pct_type);
  if(type.includes('DRTN')||type.includes('DURATION')){
    const planned=Math.max(0,num(task.target_drtn_hr_cnt,0)),remaining=Math.max(0,num(task.remain_drtn_hr_cnt,0));
    if(planned<=0)return isCompletedActivity(task)?100:0;
    return clampPct((planned-remaining)/planned*100);
  }
  if(type.includes('UNIT'))return assignmentUnitPercent(model,task.task_id);
  return clampPct(num(task.phys_complete_pct,0));
}

export function percentEditMode(task){
  if(isMilestoneActivity(task))return 'milestone';
  const type=upper(task?.complete_pct_type);
  // P6 permits manual Physical % on WBS Summary activities, while Duration,
  // Units and Scope percentages are calculated/derived.
  if(isWbsSummaryActivity(task)&&!type.includes('PHYS'))return 'readonly';
  if(type.includes('UNIT')||type.includes('SCOPE'))return 'readonly';
  return 'editable';
}

function relType(v){const s=upper(v).replace(/^PR_/, '');return ['FS','SS','FF','SF'].includes(s)?s:'FS';}
function predecessorById(model,id){return model?.find?.('TASK','task_id',String(id))||null;}
function outOfSequenceWarnings(model,task){
  const warnings=[];
  const rels=(model?.table?.('TASKPRED')||[]).filter(r=>String(r.task_id)===String(task.task_id));
  for(const r of rels){
    const pred=predecessorById(model,r.pred_task_id);if(!pred)continue;
    const type=relType(r.pred_type),succStart=!!task.act_start_date,succFinish=!!task.act_end_date,predStart=!!pred.act_start_date,predFinish=!!pred.act_end_date;
    let violation=false,need='';
    if(type==='FS'&&succStart&&!predFinish){violation=true;need='predecessor Actual Finish';}
    if(type==='SS'&&succStart&&!predStart){violation=true;need='predecessor Actual Start';}
    if(type==='FF'&&succFinish&&!predFinish){violation=true;need='predecessor Actual Finish';}
    if(type==='SF'&&succFinish&&!predStart){violation=true;need='predecessor Actual Start';}
    if(violation)warnings.push(`Out-of-sequence progress: ${task.task_code||task.task_id} has ${type} progress before ${pred.task_code||pred.task_id} has a ${need}.`);
  }
  return warnings;
}

function dateAfter(a,b){const da=p6Date(a),db=p6Date(b);return !!(da&&db&&da>db);}
function sameOrAfter(a,b){const da=p6Date(a),db=p6Date(b);return !!(da&&db&&da>=db);}

/**
 * P6-style activity validation/normalisation for user edits.
 * Returns a safe patch plus warnings. Hard inconsistencies throw.
 */
export function prepareP6ActivityPatch(model,projId,taskId,patch={},options={}){
  const task=model?.find?.('TASK','task_id',String(taskId));
  if(!task)throw new Error('Activity not found.');
  const changed=new Set(Object.keys(patch));
  const candidate={...task,...patch};
  const warnings=[];

  const type=upper(candidate.task_type),pctType=upper(candidate.complete_pct_type),milestone=isMilestoneActivity(candidate),summary=isWbsSummaryActivity(candidate);
  const rawPct=Number(candidate.phys_complete_pct),rawPlanned=Number(candidate.target_drtn_hr_cnt),rawRemaining=Number(candidate.remain_drtn_hr_cnt);
  if(changed.has('phys_complete_pct')&&(!Number.isFinite(rawPct)||rawPct<0||rawPct>100))throw new Error('Activity % Complete must be between 0% and 100%.');
  if(changed.has('target_drtn_hr_cnt')&&(!Number.isFinite(rawPlanned)||rawPlanned<0))throw new Error('Original / Planned Duration cannot be negative or non-numeric.');
  if(changed.has('remain_drtn_hr_cnt')&&(!Number.isFinite(rawRemaining)||rawRemaining<0))throw new Error('Remaining Duration cannot be negative or non-numeric.');
  for(const key of ['target_start_date','target_end_date','early_start_date','early_end_date','act_start_date','act_end_date','expect_end_date','suspend_date','resume_date','cstr_date','cstr_date2']){
    if(changed.has(key)&&candidate[key]&&!p6Date(candidate[key]))throw new Error(`${key.replaceAll('_',' ')} is not a valid date/time.`);
  }
  let pct=clampPct(num(candidate.phys_complete_pct,0));
  let planned=Math.max(0,num(candidate.target_drtn_hr_cnt,0));
  let remaining=num(candidate.remain_drtn_hr_cnt,planned);

  if(summary&&[...changed].some(k=>['target_start_date','target_end_date','early_start_date','early_end_date','target_drtn_hr_cnt','remain_drtn_hr_cnt'].includes(k))){
    throw new Error('WBS Summary dates and durations are calculated from the underlying WBS activities in P6 and cannot be edited directly here.');
  }
  if(summary&&changed.has('phys_complete_pct')&&!pctType.includes('PHYS')){
    throw new Error('For a WBS Summary activity, Activity % Complete is only directly editable when Percent Complete Type is Physical.');
  }

  if(milestone){
    if(changed.has('phys_complete_pct')&&pct!==0&&pct!==100)throw new Error('P6 milestones can only be 0% or 100% complete.');
    if(changed.has('phys_complete_pct')&&pct===0&&(isCompletedActivity(candidate)||(isStartMilestone(candidate)&&candidate.act_start_date)||(isFinishMilestone(candidate)&&candidate.act_end_date)))throw new Error('A completed milestone cannot be changed to 0% while its completed status/actual milestone date remains. Clear the actual event date and set the milestone to Not Started in the Status detail first.');
    candidate.target_drtn_hr_cnt='0';candidate.remain_drtn_hr_cnt='0';planned=0;remaining=0;
    // A P6 milestone is a single zero-duration event. Keep both stored planning
    // endpoints on the same event date so exports do not create a false span.
    if(isStartMilestone(candidate)&&candidate.target_start_date)candidate.target_end_date=candidate.target_start_date;
    if(isFinishMilestone(candidate)&&candidate.target_end_date)candidate.target_start_date=candidate.target_end_date;
  }else{
    if(!Number.isFinite(remaining)||remaining<0)throw new Error('Remaining Duration cannot be negative.');
  }

  const actStart=p6Date(candidate.act_start_date),actFinish=p6Date(candidate.act_end_date);
  if(actFinish&&!actStart&&!isFinishMilestone(candidate))throw new Error('An Actual Finish requires an Actual Start.');
  if(actStart&&actFinish&&actFinish<actStart)throw new Error('Actual Finish cannot be earlier than Actual Start.');

  const start=p6Date(candidate.target_start_date||candidate.early_start_date),finish=p6Date(candidate.target_end_date||candidate.early_end_date);
  if(start&&finish&&finish<start)throw new Error('Finish cannot be earlier than Start.');

  if(changed.has('phys_complete_pct')){
    if(pctType.includes('UNIT'))throw new Error('Units % Complete is calculated from Actual and Remaining Units in P6. Edit the resource units instead.');
    if(pctType.includes('SCOPE'))throw new Error('Scope % Complete is calculated externally and is read-only in P6.');
    if(!milestone&&pct>0&&!actStart)throw new Error('Progress greater than 0% requires an Actual Start. Enter the Actual Start first.');
    if(!milestone&&pct>=100&&!actFinish)throw new Error('100% complete requires an Actual Finish. Enter the Actual Finish first.');
  }

  if(pctType.includes('DRTN')&&!milestone){
    if(changed.has('phys_complete_pct')){
      remaining=planned<=0?0:Math.max(0,planned*(1-pct/100));
      candidate.remain_drtn_hr_cnt=String(Math.round(remaining*1000)/1000);
    }else if(changed.has('remain_drtn_hr_cnt')){
      remaining=Math.max(0,num(candidate.remain_drtn_hr_cnt,0));
      pct=planned<=0?(isCompletedActivity(candidate)?100:0):clampPct((planned-remaining)/planned*100);
      candidate.phys_complete_pct=String(Math.round(pct*100)/100);
    }
  }

  if(pctType.includes('UNIT')&&!milestone){
    pct=activityPercentComplete(candidate,model);
    candidate.phys_complete_pct=String(Math.round(pct*100)/100);
  }

  if(milestone){
    const eventComplete=isCompletedActivity(candidate)||(isStartMilestone(candidate)&&!!candidate.act_start_date)||(isFinishMilestone(candidate)&&!!candidate.act_end_date)||pct>=100;
    pct=eventComplete?100:0;
    candidate.phys_complete_pct=String(pct);
    candidate.status_code=eventComplete?'TK_Complete':'TK_NotStart';
    if(eventComplete&&isStartMilestone(candidate)&&!candidate.act_start_date)throw new Error('A completed Start Milestone requires an Actual Start.');
    if(eventComplete&&isFinishMilestone(candidate)&&!candidate.act_end_date)throw new Error('A completed Finish Milestone requires an Actual Finish.');
  }

  if(candidate.act_end_date){candidate.status_code='TK_Complete';candidate.remain_drtn_hr_cnt='0';candidate.phys_complete_pct='100';pct=100;}
  else if(candidate.act_start_date&&isNotStartedActivity(candidate))candidate.status_code='TK_Active';

  if(isCompletedActivity(candidate)){
    if(!candidate.act_start_date&&!isFinishMilestone(candidate))throw new Error('A completed activity requires an Actual Start.');
    if(!candidate.act_end_date&&!isStartMilestone(candidate))throw new Error('A completed activity requires an Actual Finish.');
    candidate.remain_drtn_hr_cnt='0';candidate.phys_complete_pct='100';pct=100;
  }else if(isInProgressActivity(candidate)){
    if(!candidate.act_start_date)throw new Error('An In Progress activity requires an Actual Start.');
    if(candidate.act_end_date)throw new Error('An activity with an Actual Finish must be Completed, not In Progress.');
    if(!milestone&&pct>=100)throw new Error('An In Progress activity cannot be 100% complete without an Actual Finish.');
  }else if(isNotStartedActivity(candidate)){
    if(candidate.act_start_date||candidate.act_end_date)throw new Error('A Not Started activity cannot contain Actual Start or Actual Finish dates.');
    if(pct>0)throw new Error('A Not Started activity must be 0% complete.');
    candidate.phys_complete_pct='0';pct=0;
    if(!milestone){
      if(changed.has('remain_drtn_hr_cnt')&&!changed.has('target_drtn_hr_cnt')&&Math.abs(num(candidate.remain_drtn_hr_cnt,0)-planned)>1e-9){
        // In P6, before an activity starts its remaining duration is its planned
        // duration. Treat an edit to Remaining Duration as a planned-duration
        // change rather than allowing an internally inconsistent state.
        planned=Math.max(0,num(candidate.remain_drtn_hr_cnt,0));candidate.target_drtn_hr_cnt=String(planned);
      }else candidate.remain_drtn_hr_cnt=String(planned);
    }
  }

  if(!milestone&&num(candidate.remain_drtn_hr_cnt,0)===0&&!isCompletedActivity(candidate)&&pct<100)warnings.push('Remaining Duration is zero while the activity is not complete. P6 normally uses zero remaining duration for completed activities.');

  const hasConstraint=v=>!!String(v||'').trim()&&!/^(CS_NONE|NONE)$/i.test(String(v||'').trim());
  if(hasConstraint(candidate.cstr_type)&&!candidate.cstr_date)throw new Error('The Primary Constraint requires a Constraint Date.');
  if(hasConstraint(candidate.cstr_type2)&&!candidate.cstr_date2)throw new Error('The Secondary Constraint requires a Constraint Date.');

  if(candidate.suspend_date||candidate.resume_date){
    if(!candidate.suspend_date||!candidate.resume_date)throw new Error('Suspend and Resume dates must be entered as a pair.');
    if(!candidate.act_start_date)throw new Error('Suspend/Resume dates require an Actual Start.');
    if(dateAfter(candidate.suspend_date,candidate.resume_date))throw new Error('Resume must be on or after Suspend.');
    if(dateAfter(candidate.act_start_date,candidate.suspend_date))throw new Error('Suspend cannot be earlier than Actual Start.');
  }

  const dd=options.dataDate||null;
  if(dd){
    if(dateAfter(candidate.act_start_date,dd))warnings.push('Actual Start is after the project Data Date.');
    if(dateAfter(candidate.act_end_date,dd))warnings.push('Actual Finish is after the project Data Date.');
  }
  if(isLevelOfEffortActivity(candidate)&&[...changed].some(k=>['target_start_date','target_end_date','early_start_date','early_end_date','target_drtn_hr_cnt','remain_drtn_hr_cnt'].includes(k)))warnings.push('Level of Effort dates/duration are normally driven by its predecessor and successor relationships in P6 and may move when you schedule (F9).');

  warnings.push(...outOfSequenceWarnings(model,candidate));

  const derived=milestone?['target_start_date','target_end_date']:[];
  const safePatch={};
  for(const k of new Set([...changed,...derived,'status_code','target_drtn_hr_cnt','remain_drtn_hr_cnt','phys_complete_pct'])){
    if(candidate[k]!==task[k]||changed.has(k))safePatch[k]=candidate[k]??'';
  }
  return {task,candidate,patch:safePatch,warnings:[...new Set(warnings)]};
}

export function validateUniqueActivityCode(model,projId,taskId,taskCode){
  const code=String(taskCode||'').trim();
  if(!code)throw new Error('Activity ID cannot be blank.');
  const duplicate=(model?.table?.('TASK')||[]).find(t=>String(t.proj_id)===String(projId)&&String(t.task_id)!==String(taskId)&&String(t.task_code||'').trim().toLowerCase()===code.toLowerCase());
  if(duplicate)throw new Error(`Activity ID "${code}" is already used by ${duplicate.task_name||duplicate.task_id}. P6 requires activity IDs to be unique within a project.`);
  return code;
}

export function warningMessage(warnings=[]){
  if(!warnings.length)return '';
  return `P6-style validation warning${warnings.length===1?'':'s'}:\n\n${warnings.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nContinue with this edit?`;
}
