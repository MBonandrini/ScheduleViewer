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
  // P6 exports IDs as text, but imported/edited models can contain numeric values.
  // Normalize every key so parent-child hierarchy never degrades into false roots.
  const nodes = new Map(rows.map(r => [String(r.wbs_id??''), {...r, children:[]} ]));
  const roots=[];
  for (const n of nodes.values()) {
    const id=String(n.wbs_id??''), parentId=String(n.parent_wbs_id??'');
    const p = parentId ? nodes.get(parentId) : null;
    if (p && String(p.wbs_id??'') !== id) p.children.push(n); else roots.push(n);
  }
  const sort = a => { a.children.sort((x,y)=>num(x.seq_num)-num(y.seq_num)||String(x.wbs_short_name||x.wbs_name||'').localeCompare(String(y.wbs_short_name||y.wbs_name||''),undefined,{numeric:true,sensitivity:'base'})); a.children.forEach(sort); };
  roots.sort((x,y)=>num(x.seq_num)-num(y.seq_num)||String(x.wbs_short_name||x.wbs_name||'').localeCompare(String(y.wbs_short_name||y.wbs_name||''),undefined,{numeric:true,sensitivity:'base'})).forEach(sort);
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
  // Native P6 XER calendar strings normally encode weekdays as (0||1()(...)) through
  // (0||7()(...)). Older fixtures/exports may use the shorter (1||...) form.
  let markers=[...raw.matchAll(/\(0\|\|([1-7])\(\)\(/g)].map(m=>({m,dayNo:Number(m[1])}));
  if(!markers.length)markers=[...raw.matchAll(/\(([1-7])\|\|/g)].map(m=>({m,dayNo:Number(m[1])}));
  for (let j=0;j<markers.length;j++) {
    const {m,dayNo}=markers[j];
    const start=m.index + m[0].length;
    const next=markers[j+1]?.m?.index;
    const view=raw.indexOf('(0||VIEW',start),exceptions=raw.indexOf('(0||Exceptions',start);
    const candidates=[next,view,exceptions].filter(x=>Number.isFinite(x)&&x>=start);
    const end=candidates.length?Math.min(...candidates):raw.length;
    const seg=raw.slice(start,end);
    const times=[...seg.matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));
    result.days.push({day:dayNames[dayNo-1],periods:times});
  }
  for(const name of dayNames)if(!result.days.some(x=>x.day===name))result.days.push({day:name,periods:[]});
  result.days.sort((a,b)=>dayNames.indexOf(a.day)-dayNames.indexOf(b.day));
  // P6 calendar strings vary by release. Exception dates can be ISO text or
  // Excel/OLE-style serial day numbers with a 1899-12-30 base.
  const addException=(token,seg='')=>{
    let date=token;
    if(/^\d+$/.test(token)){
      const d=new Date(1899,11,30);d.setDate(d.getDate()+Number(token));
      date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const times=[...seg.matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));
    if(!result.exceptions.includes(date))result.exceptions.push(date);
    result.exceptionPeriods[date]=times;
  };
  const exStart=raw.indexOf('(0||Exceptions');
  const exRaw=exStart>=0?raw.slice(exStart):raw;
  const exMatches=[...exRaw.matchAll(/d\|(\d{4}-\d{2}-\d{2}|\d+)([\s\S]*?)(?=\(0\|\|\d+\(d\||d\|(?:\d{4}-\d{2}-\d{2}|\d+)|$)/g)];
  for(const m of exMatches)addException(m[1],m[2]||'');
  // Fallback for compact exception strings.
  if(!exMatches.length){for(const m of exRaw.matchAll(/d\|(\d{4}-\d{2}-\d{2}|\d+)/g))addException(m[1],'');}
  result.exceptions.sort();
  return result;
}
