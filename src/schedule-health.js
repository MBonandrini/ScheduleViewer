import { num, p6Date } from './parser.js';
import { analyzeSchedule } from './analysis.js';
import { taskRows, predRows, getDataDate } from './semantic.js';

function percent(n,d){return d?100*n/d:0}
function band(value,good,warn){return value>=good?'Good':value>=warn?'Watch':'Poor'}

export function dcmaStyleHealth(model,projId=null,settings={}){
  const hpd=Number(settings.hoursPerDay||8),tasks=taskRows(model,projId),rels=predRows(model,projId),base=analyzeSchedule(model,projId,settings);
  const incomplete=tasks.filter(t=>!/Complete/i.test(String(t.status_code||'')));
  const counts={
    activities:tasks.length,relationships:rels.length,
    missingLogic:base.issues.filter(x=>x.rule==='Open start'||x.rule==='Open finish').length,
    leads:rels.filter(r=>num(r.lag_hr_cnt)<0).length,
    lags:rels.filter(r=>num(r.lag_hr_cnt)>0).length,
    ss:rels.filter(r=>/SS/i.test(String(r.pred_type||''))).length,
    ff:rels.filter(r=>/FF/i.test(String(r.pred_type||''))).length,
    sf:rels.filter(r=>/SF/i.test(String(r.pred_type||''))).length,
    hardConstraints:tasks.filter(t=>/MANDATORY|CS_MSO|CS_MEO|MUST/i.test(String(t.cstr_type||''))).length,
    highFloat:tasks.filter(t=>num(t.total_float_hr_cnt)>Number(settings.highFloatDays||44)*hpd).length,
    negativeFloat:tasks.filter(t=>num(t.total_float_hr_cnt)<0).length,
    highDuration:tasks.filter(t=>num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt)>Number(settings.longDurationDays||44)*hpd).length,
    invalidProgress:base.issues.filter(x=>x.rule==='Invalid progress'||x.rule==='Future actual').length,
    incomplete:incomplete.length
  };
  const metrics=[
    {check:'Missing Logic',count:counts.missingLogic,denominator:Math.max(1,incomplete.length),percent:percent(counts.missingLogic,Math.max(1,incomplete.length)),target:'< 5%'},
    {check:'Leads / Negative Lag',count:counts.leads,denominator:Math.max(1,rels.length),percent:percent(counts.leads,Math.max(1,rels.length)),target:'0%'},
    {check:'Positive Lags',count:counts.lags,denominator:Math.max(1,rels.length),percent:percent(counts.lags,Math.max(1,rels.length)),target:'< 5%'},
    {check:'Hard Constraints',count:counts.hardConstraints,denominator:Math.max(1,tasks.length),percent:percent(counts.hardConstraints,Math.max(1,tasks.length)),target:'Low'},
    {check:'High Float',count:counts.highFloat,denominator:Math.max(1,tasks.length),percent:percent(counts.highFloat,Math.max(1,tasks.length)),target:'< 5%'},
    {check:'Negative Float',count:counts.negativeFloat,denominator:Math.max(1,tasks.length),percent:percent(counts.negativeFloat,Math.max(1,tasks.length)),target:'0%'},
    {check:'High Duration',count:counts.highDuration,denominator:Math.max(1,tasks.length),percent:percent(counts.highDuration,Math.max(1,tasks.length)),target:'< 5%'}
  ];
  const penalties=metrics.reduce((s,m)=>s+Math.min(20,m.percent),0)+Math.min(20,counts.invalidProgress*2);
  const score=Math.max(0,Math.round(100-penalties));
  return {score,rating:band(score,85,65),counts,metrics,issues:base.issues,disclaimer:'DCMA-style analytical checks only; this is not an official DCMA certification.'};
}

export function enhancedScheduleHealth(model,projId=null,settings={}){
  const tasks=taskRows(model,projId),rels=predRows(model,projId),dcma=dcmaStyleHealth(model,projId,settings);
  const milestones=tasks.filter(t=>num(t.target_drtn_hr_cnt||t.orig_drtn_hr_cnt)===0||/MILE/i.test(String(t.task_type||''))).length;
  const loe=tasks.filter(t=>/LOE/i.test(String(t.task_type||''))).length;
  const calendars=new Set(tasks.map(t=>String(t.clndr_id||'')).filter(Boolean)).size;
  const density=tasks.length?rels.length/tasks.length:0;
  const ssShare=rels.length?rels.filter(r=>/SS/i.test(String(r.pred_type||''))).length/rels.length*100:0;
  const constraintShare=tasks.length?tasks.filter(t=>t.cstr_type).length/tasks.length*100:0;
  const milestoneShare=tasks.length?milestones/tasks.length*100:0;
  const loeShare=tasks.length?loe/tasks.length*100:0;
  const metrics=[
    {metric:'Logic Density',value:density.toFixed(2),assessment:density<1?'Poor':density<1.5?'Watch':'Good',detail:'Relationships per activity'},
    {metric:'SS Usage',value:`${ssShare.toFixed(1)}%`,assessment:ssShare>40?'Poor':ssShare>25?'Watch':'Good',detail:'High SS dependence can weaken finish predictability.'},
    {metric:'Constraint Usage',value:`${constraintShare.toFixed(1)}%`,assessment:constraintShare>15?'Poor':constraintShare>8?'Watch':'Good',detail:'Excess constraints may mask logical drivers.'},
    {metric:'Milestone Share',value:`${milestoneShare.toFixed(1)}%`,assessment:milestoneShare>20?'Watch':'Good',detail:'Excess milestones can fragment logic.'},
    {metric:'LOE Share',value:`${loeShare.toFixed(1)}%`,assessment:loeShare>10?'Watch':'Good',detail:'Excess LOE can obscure discrete work.'},
    {metric:'Calendar Count',value:calendars,assessment:calendars>25?'Watch':'Good',detail:'Calendar proliferation increases calculation complexity.'}
  ];
  const penalties=metrics.filter(m=>m.assessment==='Poor').length*10+metrics.filter(m=>m.assessment==='Watch').length*4;
  const score=Math.max(0,Math.round(dcma.score*0.7+(100-penalties)*0.3));
  return {score,rating:band(score,85,65),dcma,metrics};
}

export function progressIntegrity(model,projId=null){
  const tasks=taskRows(model,projId),dd=p6Date(getDataDate(model,projId)),issues=[];
  for(const t of tasks){
    const pct=num(t.phys_complete_pct||t.complete_pct),as=p6Date(t.act_start_date),af=p6Date(t.act_end_date),rem=num(t.remain_drtn_hr_cnt);
    if(pct>0&&!as)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Progress without actual start',detail:`${pct}% complete but no actual start.`});
    if(as&&pct===0&&!af)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Actual start with zero progress',detail:`Actual start ${t.act_start_date}.`});
    if(af&&pct<100)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Actual finish inconsistency',detail:`Actual finish exists but progress is ${pct}%.`});
    if(dd&&as&&as>dd)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Future actual start',detail:t.act_start_date});
    if(dd&&af&&af>dd)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Future actual finish',detail:t.act_end_date});
    if(/Complete/i.test(String(t.status_code||''))&&rem>0)issues.push({task:t.task_code||t.task_id,name:t.task_name,type:'Complete with remaining duration',detail:`${rem}h remaining.`});
  }
  return {issues,score:Math.max(0,100-Math.min(100,issues.length*3))};
}

export function scheduleRiskRadar(model,projId=null,settings={},forecastStabilityScore=100,resourceScore=100){
  const health=enhancedScheduleHealth(model,projId,settings),progress=progressIntegrity(model,projId);
  const negative=health.dcma.counts.negativeFloat;
  const criticalIntegrity=Math.max(0,100-Math.min(100,negative*5+health.dcma.counts.missingLogic*2));
  const categories=[
    {category:'Logic Quality',score:health.score,basis:`${health.dcma.counts.missingLogic} missing-logic findings; density ${health.metrics[0].value}.`},
    {category:'Critical Path Integrity',score:criticalIntegrity,basis:`${negative} negative-float activities and logic findings considered.`},
    {category:'Progress Integrity',score:progress.score,basis:`${progress.issues.length} progress/date integrity findings.`},
    {category:'Forecast Stability',score:forecastStabilityScore,basis:'Historical revision movement where available; defaults to 100 without history.'},
    {category:'Calendar Integrity',score:health.metrics.find(m=>m.metric==='Calendar Count')?.assessment==='Watch'?75:95,basis:`${health.metrics.find(m=>m.metric==='Calendar Count')?.value||0} activity calendars in use.`},
    {category:'Resource Credibility',score:resourceScore,basis:'Resource overload/gap findings where available.'},
    {category:'Constraint Health',score:Math.max(0,100-Math.round(Number(String(health.metrics.find(m=>m.metric==='Constraint Usage')?.value||'0').replace('%',''))*2)),basis:`Constraint usage ${health.metrics.find(m=>m.metric==='Constraint Usage')?.value||'0%'}.`}
  ];
  return {categories,overall:Math.round(categories.reduce((s,c)=>s+c.score,0)/categories.length),health,progress};
}
