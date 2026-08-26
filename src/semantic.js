import { num, p6Date } from './parser.js';

const pick = (r, ...keys) => { for (const k of keys) if (r?.[k] !== undefined && r[k] !== '') return r[k]; return ''; };

export function projectRows(model) { return model.table('PROJECT'); }
export function taskRows(model, projId = null) {
  const rows = model.table('TASK');
  return projId ? rows.filter(r => r.proj_id === String(projId)) : rows;
}
export function wbsRows(model, projId = null) {
  const rows = model.table('PROJWBS');
  return projId ? rows.filter(r => r.proj_id === String(projId)) : rows;
}
export function predRows(model, projId = null) {
  const rows = model.table('TASKPRED');
  return projId ? rows.filter(r => r.proj_id === String(projId)) : rows;
}

export function activityView(model, task) {
  if (!task) return null;
  const wbs = model.find('PROJWBS', 'wbs_id', task.wbs_id);
  const cal = model.find('CALENDAR', 'clndr_id', task.clndr_id);
  const project = model.find('PROJECT', 'proj_id', task.proj_id);
  const preds = model.findAll('TASKPRED', 'task_id', task.task_id);
  const succs = model.findAll('TASKPRED', 'pred_task_id', task.task_id);
  const resources = model.findAll('TASKRSRC', 'task_id', task.task_id);
  const codes = model.findAll('TASKACTV', 'task_id', task.task_id).map(link => {
    const cv = model.find('ACTVCODE', 'actv_code_id', link.actv_code_id);
    const ct = cv ? model.find('ACTVTYPE', 'actv_code_type_id', cv.actv_code_type_id) : null;
    return { type: pick(ct, 'actv_code_type', 'actv_code_type_name'), code: pick(cv, 'short_name', 'actv_code_name'), description: pick(cv, 'actv_code_name', 'short_name') };
  });
  const udf = model.findAll('UDFVALUE', 'fk_id', task.task_id).map(v => {
    const t = model.find('UDFTYPE', 'udf_type_id', v.udf_type_id);
    return { title: pick(t,'udf_type_label','udf_type_name'), value: pick(v,'udf_text','udf_number','udf_date','udf_code_id') };
  });
  return {
    raw: task, project, wbs, cal, preds, succs, resources, codes, udf,
    id: pick(task, 'task_code', 'task_id'), name: task.task_name,
    status: task.status_code, type: task.task_type,
    start: pick(task,'act_start_date','early_start_date','target_start_date'),
    finish: pick(task,'act_end_date','early_end_date','target_end_date'),
    remainingStart: pick(task,'restart_date','early_start_date'),
    remainingFinish: pick(task,'reend_date','early_end_date'),
    originalDuration: num(pick(task,'target_drtn_hr_cnt','orig_drtn_hr_cnt')),
    remainingDuration: num(pick(task,'remain_drtn_hr_cnt')),
    actualDuration: num(pick(task,'act_work_qty','act_drtn_hr_cnt')),
    totalFloat: num(pick(task,'total_float_hr_cnt')),
    freeFloat: num(pick(task,'free_float_hr_cnt')),
    pct: num(pick(task,'phys_complete_pct','complete_pct')),
    pctType: pick(task,'complete_pct_type'),
    primaryConstraint: pick(task,'cstr_type'), primaryConstraintDate: pick(task,'cstr_date'),
    secondaryConstraint: pick(task,'cstr_type2'), secondaryConstraintDate: pick(task,'cstr_date2'),
    calendarName: pick(cal,'clndr_name') || task.clndr_id,
    wbsName: pick(wbs,'wbs_name') || task.wbs_id,
    wbsCode: pick(wbs,'wbs_short_name','wbs_code'),
    projectName: pick(project,'proj_short_name','proj_name')
  };
}

export function getDataDate(model, projId) {
  const p = model.find('PROJECT','proj_id',projId) ?? model.table('PROJECT')[0];
  return pick(p,'last_recalc_date','data_date','scd_end_date');
}

export function taskStart(t) { return p6Date(pick(t,'act_start_date','restart_date','early_start_date','target_start_date')); }
export function taskFinish(t) { return p6Date(pick(t,'act_end_date','reend_date','early_end_date','target_end_date')); }

export function buildWBSTree(model, projId) {
  const rows = wbsRows(model, projId);
  const nodes = new Map(rows.map(r => [r.wbs_id, {...r, children:[]} ]));
  const roots=[];
  for (const n of nodes.values()) {
    const p = nodes.get(n.parent_wbs_id);
    if (p && p !== n) p.children.push(n); else roots.push(n);
  }
  const sort = a => { a.children.sort((x,y)=>num(x.seq_num)-num(y.seq_num)); a.children.forEach(sort); };
  roots.sort((x,y)=>num(x.seq_num)-num(y.seq_num)).forEach(sort);
  return roots;
}

export function resourceAssignments(model, projId) {
  const tasks = new Set(taskRows(model, projId).map(t=>t.task_id));
  return model.table('TASKRSRC').filter(r => tasks.has(r.task_id)).map(r => {
    const res = model.find('RSRC','rsrc_id',r.rsrc_id);
    const role = model.find('ROLES','role_id',r.role_id);
    const task = model.find('TASK','task_id',r.task_id);
    return {...r, task_code: task?.task_code||r.task_id, task_name: task?.task_name||'', rsrc_name:res?.rsrc_name||r.rsrc_id, role_name:role?.role_name||r.role_id||''};
  });
}

export function parseCalendarData(raw='') {
  const result = { days: [], exceptions: [], exceptionPeriods: {}, raw };
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const markers = [...raw.matchAll(/\(([1-7])\|\|/g)];
  for (let j=0;j<markers.length;j++) {
    const m=markers[j], dayNo=Number(m[1]);
    const start=m.index + m[0].length;
    const end=j+1<markers.length ? markers[j+1].index : raw.length;
    const seg=raw.slice(start,end);
    const times=[...seg.matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));
    result.days.push({day:dayNames[dayNo-1],periods:times});
  }
  // P6 calendar strings vary by release. Capture ISO-date exception tokens and, when
  // shift periods occur in the same local segment, retain them as dated working periods.
  const exMatches=[...raw.matchAll(/d\|(\d{4}-\d{2}-\d{2})([^d]*?)(?=d\|\d{4}-\d{2}-\d{2}|$)/g)];
  for(const m of exMatches){
    const date=m[1],seg=m[2]||'';
    const times=[...seg.matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));
    result.exceptions.push(date);
    result.exceptionPeriods[date]=times;
  }
  // Backward-compatible fallback for simpler d|date forms.
  if(!result.exceptions.length){for (const m of raw.matchAll(/d\|(\d{4}-\d{2}-\d{2})/g)){result.exceptions.push(m[1]);result.exceptionPeriods[m[1]]=[]}}
  return result;
}
