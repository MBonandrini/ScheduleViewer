import { num, p6Date } from './parser.js';
import { taskRows, predRows, wbsRows, getDataDate } from './semantic.js';
import { parseCalendarData } from './semantic.js';

const pct=(n,d)=>d?100*n/d:0;
const id=t=>String(t?.task_code||t?.task_id||'');
const isComplete=t=>/COMPLETE/i.test(String(t?.status_code||'')) || num(t?.phys_complete_pct||t?.complete_pct)>=100;
const isMilestone=t=>/MILE/i.test(String(t?.task_type||'')) || num(t?.target_drtn_hr_cnt||t?.orig_drtn_hr_cnt)===0;
const relType=r=>String(r?.pred_type||'FS').replace(/^PR_/,'').toUpperCase();
const date=t=>p6Date(t);
const badDateOrder=(a,b)=>{const x=date(a),y=date(b);return !!(x&&y&&y<x)};
const row=(key,label,category,count,denominator,threshold,status,detail,affected=[],value=null)=>({key,label,category,count,denominator,percent:pct(count,denominator||1),threshold,status,detail,affected,value:value??pct(count,denominator||1)});
const result=(count,denominator,maxPercent=0,maxCount=null)=>{
  if(maxCount!==null&&count>maxCount)return 'fail';
  return pct(count,Math.max(1,denominator))<=maxPercent?'pass':'fail';
};

/**
 * Transparent, deterministic schedule assurance catalogue. The checks are
 * intentionally documented and configurable rather than pretending to clone
 * proprietary scoring from another product.
 */
export function scheduleAssurance(model,projId=null,settings={}){
  const tasks=taskRows(model,projId), rels=predRows(model,projId), wbs=wbsRows(model,projId), hpd=Number(settings.hoursPerDay||8);
  const incomplete=tasks.filter(t=>!isComplete(t)), dd=date(getDataDate(model,projId));
  const predCount=new Map(tasks.map(t=>[String(t.task_id),0])), succCount=new Map(tasks.map(t=>[String(t.task_id),0]));
  for(const r of rels){predCount.set(String(r.task_id),(predCount.get(String(r.task_id))||0)+1);succCount.set(String(r.pred_task_id),(succCount.get(String(r.pred_task_id))||0)+1)}
  const relKeys=new Set(),dupRels=[],selfRels=[],badTypes=[];
  for(const r of rels){const k=`${r.pred_task_id}|${r.task_id}|${relType(r)}|${num(r.lag_hr_cnt)}`;if(relKeys.has(k))dupRels.push(r);relKeys.add(k);if(String(r.pred_task_id)===String(r.task_id))selfRels.push(r);if(!['FS','SS','FF','SF'].includes(relType(r)))badTypes.push(r)}
  const taskCodes=new Map(),dupCodes=[];for(const t of tasks){const k=id(t).trim().toLowerCase();if(!k)continue;if(taskCodes.has(k))dupCodes.push(t);else taskCodes.set(k,t)}
  const calendars=model.table('CALENDAR'),calendarIds=new Set(calendars.map(c=>String(c.clndr_id))),wbsIds=new Set(wbs.map(x=>String(x.wbs_id)));
  const taskAssignments=new Set(model.table('TASKRSRC').map(r=>String(r.task_id)));
  const openStarts=incomplete.filter(t=>(predCount.get(String(t.task_id))||0)===0),openFinishes=incomplete.filter(t=>(succCount.get(String(t.task_id))||0)===0);
  const isolated=incomplete.filter(t=>(predCount.get(String(t.task_id))||0)===0&&(succCount.get(String(t.task_id))||0)===0);
  const leads=rels.filter(r=>num(r.lag_hr_cnt)<0),lags=rels.filter(r=>num(r.lag_hr_cnt)>0),ss=rels.filter(r=>relType(r)==='SS'),sf=rels.filter(r=>relType(r)==='SF');
  const hard=tasks.filter(t=>/MANDATORY|MUST|CS_MSO|CS_MEO/i.test(String(t.cstr_type||''))),soft=tasks.filter(t=>t.cstr_type&&!hard.includes(t));
  const highFloat=incomplete.filter(t=>num(t.total_float_hr_cnt)>Number(settings.highFloatDays||44)*hpd),negativeFloat=incomplete.filter(t=>num(t.total_float_hr_cnt)<0),longDur=incomplete.filter(t=>num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt)>Number(settings.longDurationDays||44)*hpd);
  const progressNoStart=tasks.filter(t=>num(t.phys_complete_pct||t.complete_pct)>0&&!date(t.act_start_date));
  const completeNoFinish=tasks.filter(t=>isComplete(t)&&!date(t.act_end_date));
  const finishIncomplete=tasks.filter(t=>date(t.act_end_date)&&!isComplete(t));
  const futureAS=tasks.filter(t=>dd&&date(t.act_start_date)&&date(t.act_start_date)>dd),futureAF=tasks.filter(t=>dd&&date(t.act_end_date)&&date(t.act_end_date)>dd);
  const finishBeforeStart=tasks.filter(t=>badDateOrder(t.target_start_date||t.early_start_date,t.target_end_date||t.early_end_date)),actualBeforeStart=tasks.filter(t=>badDateOrder(t.act_start_date,t.act_end_date));
  const milestoneDuration=tasks.filter(t=>isMilestone(t)&&num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt)!==0),nonMilestoneZero=tasks.filter(t=>!isMilestone(t)&&num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt)===0);
  const milestonePct=tasks.filter(t=>isMilestone(t)&&![0,100].includes(num(t.phys_complete_pct||t.complete_pct)));
  const pctRange=tasks.filter(t=>{const p=num(t.phys_complete_pct||t.complete_pct);return p<0||p>100});
  const completeRem=tasks.filter(t=>isComplete(t)&&num(t.remain_drtn_hr_cnt)>0),incompleteZeroRem=incomplete.filter(t=>!isMilestone(t)&&num(t.remain_drtn_hr_cnt)<=0);
  const missingWbs=tasks.filter(t=>t.wbs_id&&!wbsIds.has(String(t.wbs_id))),missingCal=tasks.filter(t=>t.clndr_id&&!calendarIds.has(String(t.clndr_id))),noCal=tasks.filter(t=>!String(t.clndr_id||'').trim()),noWbs=tasks.filter(t=>!String(t.wbs_id||'').trim());
  const negativeDur=tasks.filter(t=>num(t.target_drtn_hr_cnt)<0||num(t.remain_drtn_hr_cnt)<0),missingDates=incomplete.filter(t=>!date(t.target_start_date||t.early_start_date)&&!date(t.target_end_date||t.early_end_date));
  const forecastBeforeDD=incomplete.filter(t=>dd&&date(t.target_end_date||t.early_end_date)&&date(t.target_end_date||t.early_end_date)<dd);
  const cstrNoDate=tasks.filter(t=>t.cstr_type&&!date(t.cstr_date)),dateNoCstr=tasks.filter(t=>date(t.cstr_date)&&!t.cstr_type);
  const suspendNoResume=tasks.filter(t=>date(t.suspend_date)&&!date(t.resume_date)),resumeNoSuspend=tasks.filter(t=>date(t.resume_date)&&!date(t.suspend_date)),resumeBeforeSuspend=tasks.filter(t=>badDateOrder(t.suspend_date,t.resume_date));
  const expectedPast=incomplete.filter(t=>dd&&date(t.expect_end_date)&&date(t.expect_end_date)<dd);
  const loe=tasks.filter(t=>/LOE|LEVEL/i.test(String(t.task_type||''))),wbsSummary=tasks.filter(t=>/WBS/i.test(String(t.task_type||'')));
  const unresourced=incomplete.filter(t=>!taskAssignments.has(String(t.task_id)));
  const merge=tasks.filter(t=>(predCount.get(String(t.task_id))||0)>=Number(settings.mergeHotspotPreds||5)),diverge=tasks.filter(t=>(succCount.get(String(t.task_id))||0)>=Number(settings.mergeHotspotSuccs||5));
  const excessivePred=tasks.filter(t=>(predCount.get(String(t.task_id))||0)>Number(settings.excessivePredecessors||10)),excessiveSucc=tasks.filter(t=>(succCount.get(String(t.task_id))||0)>Number(settings.excessiveSuccessors||10));
  const oos=rels.filter(r=>{const p=model.find('TASK','task_id',String(r.pred_task_id)),s=model.find('TASK','task_id',String(r.task_id));if(!p||!s||!date(s.act_start_date))return false;const typ=relType(r);if(typ==='FS'&&!date(p.act_end_date))return true;if(typ==='SS'&&!date(p.act_start_date))return true;if(typ==='FF'&&date(s.act_end_date)&&!date(p.act_end_date))return true;return false});
  const calendarExceptionHeavy=calendars.filter(c=>parseCalendarData(c.clndr_data||'').exceptions.length>Number(settings.maxCalendarExceptions||100));
  const usedCalendars=new Set(tasks.map(t=>String(t.clndr_id||'')).filter(Boolean)),unusedCalendars=calendars.filter(c=>!usedCalendars.has(String(c.clndr_id)));
  const relDensity=tasks.length?rels.length/tasks.length:0;

  const checks=[];
  const add=(key,label,category,items,den,threshold,status,detail,value=null)=>checks.push(row(key,label,category,items.length,Math.max(1,den),threshold,status,detail,items.map(x=>id(x)||`${x.pred_task_id||''}->${x.task_id||''}`).filter(Boolean),value));
  add('open-start','Open Starts','Logic',openStarts,incomplete.length,'≤ 2%',result(openStarts.length,incomplete.length,2),'Incomplete activities with no predecessor.');
  add('open-finish','Open Finishes','Logic',openFinishes,incomplete.length,'≤ 2%',result(openFinishes.length,incomplete.length,2),'Incomplete activities with no successor.');
  add('isolated','Isolated Activities','Logic',isolated,incomplete.length,'0%',result(isolated.length,incomplete.length,0),'Activities with neither predecessor nor successor.');
  add('leads','Leads / Negative Lag','Logic',leads,rels.length,'0%',result(leads.length,rels.length,0),'Negative lag can obscure network intent.');
  add('lags','Positive Lags','Logic',lags,rels.length,'≤ 5%',result(lags.length,rels.length,5),'Review material positive lag usage.');
  add('ss','Start-to-Start Usage','Logic',ss,rels.length,'≤ 30%',result(ss.length,rels.length,30),'High SS share can weaken finish predictability.');
  add('sf','Start-to-Finish Usage','Logic',sf,rels.length,'0%',result(sf.length,rels.length,0),'SF logic is unusual and should be justified.');
  add('duplicate-rel','Duplicate Relationships','Logic',dupRels,rels.length,'0',dupRels.length?'fail':'pass','Exact duplicate predecessor/successor/type/lag relationships.');
  add('self-rel','Self Relationships','Logic',selfRels,rels.length,'0',selfRels.length?'fail':'pass','Activity linked to itself.');
  add('bad-rel-type','Invalid Relationship Types','Logic',badTypes,rels.length,'0',badTypes.length?'fail':'pass','Relationship type outside FS/SS/FF/SF.');
  add('oos','Out-of-Sequence Progress','Progress',oos,rels.length,'Review',oos.length?'warn':'pass','Progressed successor appears to violate predecessor progress sequence.');
  add('hard-constraints','Hard Constraints','Constraints',hard,tasks.length,'≤ 5%',result(hard.length,tasks.length,5),'Mandatory/must constraints can override logic.');
  add('soft-constraints','Soft Constraints','Constraints',soft,tasks.length,'≤ 15%',result(soft.length,tasks.length,15),'Review constraint reliance.');
  add('cstr-no-date','Constraint Without Date','Constraints',cstrNoDate,tasks.length,'0',cstrNoDate.length?'fail':'pass','Constraint type exists without a constraint date.');
  add('date-no-cstr','Constraint Date Without Type','Constraints',dateNoCstr,tasks.length,'0',dateNoCstr.length?'fail':'pass','Constraint date exists without a constraint type.');
  add('high-float','High Float','Float',highFloat,incomplete.length,`≤ 5% > ${Number(settings.highFloatDays||44)}d`,result(highFloat.length,incomplete.length,5),'High float can indicate weak or incomplete logic.');
  add('negative-float','Negative Float','Float',negativeFloat,incomplete.length,'0%',result(negativeFloat.length,incomplete.length,0),'Negative float indicates missed imposed/contractual dates or constraints.');
  add('long-duration','Long Duration','Duration',longDur,incomplete.length,`≤ 5% > ${Number(settings.longDurationDays||44)}d`,result(longDur.length,incomplete.length,5),'Long activities may need decomposition.');
  add('negative-duration','Negative Duration','Duration',negativeDur,tasks.length,'0',negativeDur.length?'fail':'pass','Negative original or remaining duration.');
  add('milestone-duration','Milestone With Duration','Duration',milestoneDuration,tasks.length,'0',milestoneDuration.length?'fail':'pass','Milestones should have zero duration.');
  add('zero-nonmilestone','Zero-Duration Non-Milestones','Duration',nonMilestoneZero,tasks.length,'Review',nonMilestoneZero.length?'warn':'pass','Zero-duration tasks not typed as milestones.');
  add('progress-no-start','Progress Without Actual Start','Progress',progressNoStart,tasks.length,'0',progressNoStart.length?'fail':'pass','Positive progress requires an Actual Start.');
  add('complete-no-finish','Complete Without Actual Finish','Progress',completeNoFinish,tasks.length,'0',completeNoFinish.length?'fail':'pass','Completed activity has no Actual Finish.');
  add('finish-incomplete','Actual Finish But Incomplete','Progress',finishIncomplete,tasks.length,'0',finishIncomplete.length?'fail':'pass','Actual Finish exists while activity is incomplete.');
  add('future-as','Future Actual Starts','Progress',futureAS,tasks.length,'0',futureAS.length?'fail':'pass','Actual Start after Data Date.');
  add('future-af','Future Actual Finishes','Progress',futureAF,tasks.length,'0',futureAF.length?'fail':'pass','Actual Finish after Data Date.');
  add('milestone-pct','Milestone % Not 0/100','Progress',milestonePct,tasks.length,'0',milestonePct.length?'fail':'pass','Milestone completion should be 0% or 100%.');
  add('pct-range','Percent Outside 0–100','Progress',pctRange,tasks.length,'0',pctRange.length?'fail':'pass','Percent complete outside valid range.');
  add('complete-rem','Complete With Remaining Duration','Progress',completeRem,tasks.length,'0',completeRem.length?'fail':'pass','Completed activities should have zero remaining duration.');
  add('incomplete-zero-rem','Incomplete With Zero Remaining','Progress',incompleteZeroRem,incomplete.length,'Review',incompleteZeroRem.length?'warn':'pass','Incomplete non-milestone with no remaining duration.');
  add('finish-before-start','Finish Before Start','Dates',finishBeforeStart,tasks.length,'0',finishBeforeStart.length?'fail':'pass','Forecast/planned finish precedes start.');
  add('actual-before-start','Actual Finish Before Actual Start','Dates',actualBeforeStart,tasks.length,'0',actualBeforeStart.length?'fail':'pass','Actual finish precedes actual start.');
  add('missing-dates','Incomplete Without Forecast Dates','Dates',missingDates,incomplete.length,'0',missingDates.length?'fail':'pass','Incomplete activity lacks usable start/finish dates.');
  add('forecast-before-dd','Incomplete Finish Before Data Date','Dates',forecastBeforeDD,incomplete.length,'0',forecastBeforeDD.length?'fail':'pass','Incomplete forecast finish is before Data Date.');
  add('expected-past','Expected Finish Before Data Date','Dates',expectedPast,incomplete.length,'Review',expectedPast.length?'warn':'pass','Expected Finish already lies before Data Date.');
  add('duplicate-ids','Duplicate Activity IDs','Identity',dupCodes,tasks.length,'0',dupCodes.length?'fail':'pass','Activity IDs should be unique within the project.');
  add('missing-wbs','Invalid WBS Assignment','Structure',missingWbs,tasks.length,'0',missingWbs.length?'fail':'pass','Activity references a WBS not present in the project WBS table.');
  add('blank-wbs','Blank WBS Assignment','Structure',noWbs,tasks.length,'0',noWbs.length?'fail':'pass','Activity has no WBS assignment.');
  add('missing-calendar','Invalid Calendar Assignment','Calendars',missingCal,tasks.length,'0',missingCal.length?'fail':'pass','Activity references a calendar not present in the calendar table.');
  add('blank-calendar','Blank Calendar Assignment','Calendars',noCal,tasks.length,'0',noCal.length?'fail':'pass','Activity has no calendar assignment.');
  add('unused-calendar','Unused Calendars','Calendars',unusedCalendars,Math.max(1,calendars.length),'Informational','info','Calendar exists but is not assigned to an activity.');
  add('exception-heavy','Calendars With Many Exceptions','Calendars',calendarExceptionHeavy,Math.max(1,calendars.length),`≤ ${Number(settings.maxCalendarExceptions||100)} exceptions`,'info','Calendars with unusually large exception sets.');
  add('suspend-no-resume','Suspend Without Resume','Dates',suspendNoResume,tasks.length,'0',suspendNoResume.length?'warn':'pass','Suspended activity has no Resume date.');
  add('resume-no-suspend','Resume Without Suspend','Dates',resumeNoSuspend,tasks.length,'0',resumeNoSuspend.length?'warn':'pass','Resume date exists without Suspend date.');
  add('resume-before-suspend','Resume Before Suspend','Dates',resumeBeforeSuspend,tasks.length,'0',resumeBeforeSuspend.length?'fail':'pass','Resume precedes Suspend.');
  add('loe-share','LOE / Level-of-Effort Share','Structure',loe,tasks.length,'≤ 10%',result(loe.length,tasks.length,10),'Excessive LOE can obscure discrete work.');
  add('wbs-summary','WBS Summary Activities','Structure',wbsSummary,tasks.length,'Informational','info','WBS Summary activities are calculated summaries, not discrete CPM work.');
  add('unresourced','Incomplete Activities Without Resources','Resources',unresourced,incomplete.length,'Project-dependent','info','Informational unless the contract requires full resource loading.');
  add('merge-hotspot','Merge Hotspots','Network',merge,tasks.length,`< ${Number(settings.mergeHotspotPreds||5)} predecessors`,'info','Activities with many incoming relationships.');
  add('divergence-hotspot','Divergence Hotspots','Network',diverge,tasks.length,`< ${Number(settings.mergeHotspotSuccs||5)} successors`,'info','Activities with many outgoing relationships.');
  add('excessive-pred','Excessive Predecessors','Network',excessivePred,tasks.length,`≤ ${Number(settings.excessivePredecessors||10)}`,'info','Review highly convergent logic nodes.');
  add('excessive-succ','Excessive Successors','Network',excessiveSucc,tasks.length,`≤ ${Number(settings.excessiveSuccessors||10)}`,'info','Review highly divergent logic nodes.');
  checks.push({key:'logic-density',label:'Logic Density',category:'Network',count:rels.length,denominator:tasks.length,percent:0,threshold:'1.0–4.0 rel/activity',status:relDensity<1||relDensity>4?'warn':'pass',detail:'Overall relationships per activity.',affected:[],value:relDensity});
  checks.push({key:'calendar-count',label:'Calendar Proliferation',category:'Calendars',count:usedCalendars.size,denominator:1,percent:0,threshold:'≤ 25 used calendars',status:usedCalendars.size>25?'warn':'pass',detail:'Large calendar catalogues increase calculation complexity.',affected:[],value:usedCalendars.size});

  const actionable=checks.filter(c=>['pass','fail','warn'].includes(c.status));
  const fail=actionable.filter(c=>c.status==='fail').length,warn=actionable.filter(c=>c.status==='warn').length,pass=actionable.filter(c=>c.status==='pass').length;
  const weightedPenalty=checks.reduce((s,c)=>s+(c.status==='fail'?3:c.status==='warn'?1:0),0);
  const score=Math.max(0,Math.round(100-100*weightedPenalty/Math.max(1,actionable.length*3)));
  return {score,rating:score>=85?'Good':score>=70?'Watch':'Poor',checks,summary:{pass,warn,fail,informational:checks.length-actionable.length,total:checks.length},counts:{activities:tasks.length,relationships:rels.length,incomplete:incomplete.length,calendars:calendars.length,wbs:wbs.length},disclaimer:'Deterministic schedule assurance checks. Thresholds are configurable analytical screens, not an official certification.'};
}

export function assuranceCategories(result){
  const map=new Map();for(const c of result?.checks||[]){if(!map.has(c.category))map.set(c.category,[]);map.get(c.category).push(c)}
  return [...map].map(([category,checks])=>({category,checks,fail:checks.filter(x=>x.status==='fail').length,warn:checks.filter(x=>x.status==='warn').length,pass:checks.filter(x=>x.status==='pass').length}));
}

export function assuranceCheck(result,key){return result?.checks?.find(x=>x.key===key)||null}
