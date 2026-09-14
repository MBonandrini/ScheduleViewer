import { num, p6Date } from './parser.js';
import { taskRows, predRows, getDataDate, taskStart, taskFinish } from './semantic.js';

export function analyzeSchedule(model, projId, settings = {}) {
  const hpd = Number(settings.hoursPerDay || 8);
  const longDays = Number(settings.longDurationDays || 44);
  const highFloatDays = Number(settings.highFloatDays || 44);
  const lagDays = Number(settings.lagDays || 0);
  const tasks = taskRows(model, projId);
  const rels = predRows(model, projId);
  const predCount = new Map(), succCount = new Map();
  rels.forEach(r => { predCount.set(r.task_id,(predCount.get(r.task_id)||0)+1); succCount.set(r.pred_task_id,(succCount.get(r.pred_task_id)||0)+1); });
  const issues=[];
  const add=(severity,rule,t,detail)=>issues.push({severity,rule,task_code:t?.task_code||'',task_name:t?.task_name||'',task_id:t?.task_id||'',detail});
  const isMilestone=t=>/MILESTONE/i.test(t.task_type||'') || num(t.target_drtn_hr_cnt)===0;
  const isComplete=t=>/COMPLETE/i.test(t.status_code||'') || /TK_Complete/i.test(t.status_code||'');

  for (const t of tasks) {
    if (!isComplete(t)) {
      if (!isMilestone(t) && !predCount.get(t.task_id)) add('high','Open start',t,'No predecessor relationship');
      if (!isMilestone(t) && !succCount.get(t.task_id)) add('high','Open finish',t,'No successor relationship');
    }
    const dur=num(t.target_drtn_hr_cnt || t.orig_drtn_hr_cnt);
    if (dur > longDays*hpd) add('medium','Long duration',t,`${(dur/hpd).toFixed(1)} days`);
    const tf=num(t.total_float_hr_cnt);
    if (tf < 0) add('high','Negative float',t,`${(tf/hpd).toFixed(1)} days`);
    else if (tf > highFloatDays*hpd) add('medium','High float',t,`${(tf/hpd).toFixed(1)} days`);
    if (t.cstr_type) add(/MANDATORY|CS_MSO|CS_MEO/i.test(t.cstr_type)?'high':'medium','Constraint',t,`${t.cstr_type}${t.cstr_date?' @ '+t.cstr_date:''}`);
    if (!t.clndr_id) add('medium','Missing calendar',t,'No activity calendar assigned');
    const pct=num(t.phys_complete_pct || t.complete_pct);
    if (pct < 0 || pct > 100) add('high','Invalid progress',t,`${pct}%`);
  }
  for (const r of rels) {
    const lag=num(r.lag_hr_cnt);
    const t=model.find('TASK','task_id',r.task_id);
    if (lag < 0) add('high','Negative lag',t,`${(lag/hpd).toFixed(1)} days (${r.pred_type||''})`);
    else if (lag > lagDays*hpd && lagDays >= 0 && lag > 0) add('medium','Positive lag',t,`${(lag/hpd).toFixed(1)} days (${r.pred_type||''})`);
  }
  const dd=p6Date(getDataDate(model,projId));
  if (dd) for (const t of tasks) {
    if (isComplete(t)) continue;
    const aStart=p6Date(t.act_start_date), aFinish=p6Date(t.act_end_date);
    if (aStart && aStart > dd) add('high','Future actual',t,`Actual start ${t.act_start_date} is after data date`);
    if (aFinish && aFinish > dd) add('high','Future actual',t,`Actual finish ${t.act_end_date} is after data date`);
    const start=taskStart(t), finish=taskFinish(t);
    if (/NOTSTART|TK_NotStart/i.test(t.status_code||'') && start && start < dd) add('medium','Late start',t,'Planned/forecast start is before data date');
    if (!isComplete(t) && finish && finish < dd) add('high','Late finish',t,'Forecast finish is before data date');
  }
  const byRule = Object.groupBy ? Object.groupBy(issues, x=>x.rule) : issues.reduce((a,x)=>((a[x.rule]??=[]).push(x),a),{});
  return { issues, byRule, counts:{activities:tasks.length,relationships:rels.length,high:issues.filter(x=>x.severity==='high').length,medium:issues.filter(x=>x.severity==='medium').length,critical:tasks.filter(t=>num(t.total_float_hr_cnt)<=0 && !isComplete(t)).length}, dataDate:getDataDate(model,projId) };
}
