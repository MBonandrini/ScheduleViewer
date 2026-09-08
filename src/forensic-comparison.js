import { num, p6Date } from './parser.js';
import { taskRows, wbsRows } from './semantic.js';

const KEY_FIELDS = {
  PROJECT: ['proj_id'], PROJWBS: ['wbs_id'], TASK: ['task_code'], TASKPRED: ['pred_task_id','task_id'],
  CALENDAR: ['clndr_id'], RSRC: ['rsrc_short_name'], TASKRSRC: ['task_id','rsrc_id'], ACTVCODE: ['actv_code_id'],
  ACTVTYPE: ['actv_code_type_id'], TASKACTV: ['task_id','actv_code_id'], UDFTYPE: ['udf_type_id'],
  UDFVALUE: ['udf_type_id','fk_id'], RSRCCURV: ['curv_id'], ROLES: ['role_id'], MEMOTYPE: ['memo_type_id'],
  TASKMEMO: ['task_id','memo_type_id'], OBS: ['obs_id'], RISK: ['risk_id'], WBSMEMO: ['wbs_id','memo_type_id']
};

const LABELS = {
  task_name:'Activity Name', wbs_id:'WBS', task_type:'Activity Type', status_code:'Status', clndr_id:'Calendar',
  target_drtn_hr_cnt:'Original Duration', remain_drtn_hr_cnt:'Remaining Duration', act_drtn_hr_cnt:'Actual Duration',
  phys_complete_pct:'Physical %', complete_pct:'% Complete', target_start_date:'Planned Start', target_end_date:'Planned Finish',
  act_start_date:'Actual Start', act_end_date:'Actual Finish', restart_date:'Remaining Early Start', reend_date:'Remaining Early Finish',
  late_start_date:'Late Start', late_end_date:'Late Finish', total_float_hr_cnt:'Total Float', free_float_hr_cnt:'Free Float',
  cstr_type:'Primary Constraint', cstr_date:'Primary Constraint Date', cstr_type2:'Secondary Constraint', cstr_date2:'Secondary Constraint Date',
  expect_end_date:'Expected Finish', suspend_date:'Suspend Date', resume_date:'Resume Date', pred_type:'Relationship Type', lag_hr_cnt:'Lag',
  target_qty:'Budget Units', act_reg_qty:'Actual Units', remain_qty:'Remaining Units', target_cost:'Budget Cost', act_reg_cost:'Actual Cost', remain_cost:'Remaining Cost'
};

function taskIdentity(model, taskId) {
  const t=model?.find?.('TASK','task_id',String(taskId));
  return t ? `${t.proj_id||''}|${t.task_code||t.task_id}` : String(taskId||'');
}
function resourceIdentity(model, resourceId) {
  const r=model?.find?.('RSRC','rsrc_id',String(resourceId));
  return r ? String(r.rsrc_short_name||r.rsrc_name||r.rsrc_id) : String(resourceId||'');
}
function inferUnknownKeyField(oldRows,newRows){
  const rows=[...oldRows,...newRows];if(!rows.length)return null;
  const candidates=[...new Set(rows.flatMap(r=>Object.keys(r||{})))].filter(f=>/(^id$|_id$|_code$|^code$|^name$)/i.test(f));
  for(const f of candidates){let ok=true;for(const set of [oldRows,newRows]){const vals=set.map(r=>String(r?.[f]??'')).filter(Boolean);if(vals.length!==set.length||new Set(vals).size!==vals.length){ok=false;break}}if(ok)return f}
  return null;
}
function stableRowSignature(row){return JSON.stringify(Object.fromEntries(Object.entries(row||{}).filter(([k])=>!k.startsWith('__')).sort(([a],[b])=>a.localeCompare(b))))}
function keyFor(model, table, row, index = 0, inferredField = null) {
  if(table==='TASK') return `${row?.proj_id||''}|${row?.task_code||row?.task_id||index}`;
  if(table==='TASKPRED') return `${row?.proj_id||''}|${taskIdentity(model,row?.pred_task_id)}->${taskIdentity(model,row?.task_id)}`;
  if(table==='TASKRSRC') return `${row?.proj_id||''}|${taskIdentity(model,row?.task_id)}|${resourceIdentity(model,row?.rsrc_id)}|${row?.role_id||''}`;
  if(table==='TASKACTV') return `${taskIdentity(model,row?.task_id)}|${row?.actv_code_id||''}`;
  if(table==='UDFVALUE' && model?.find?.('TASK','task_id',String(row?.fk_id||''))) return `${row?.udf_type_id||''}|${taskIdentity(model,row?.fk_id)}`;
  if(inferredField && row?.[inferredField]!==undefined && row?.[inferredField]!=='') return `${inferredField}:${row[inferredField]}`;
  const fields = KEY_FIELDS[table] || [];
  const parts = fields.map(f => String(row?.[f] ?? '')).filter(Boolean);
  if (parts.length === fields.length && parts.length) return parts.join('|');
  for (const f of ['task_code','wbs_id','rsrc_short_name','clndr_id','proj_id','udf_type_id','fk_id','id','code','name']) if (row?.[f] !== undefined && row?.[f] !== '') return `${f}:${row[f]}`;
  const idLike = Object.keys(row || {}).find(f => /(^id$|_id$|_code$)/i.test(f) && row[f] !== '');
  if (idLike) return `${idLike}:${row[idLike]}`;
  return `content:${stableRowSignature(row)}`;
}

function taskContext(model, row) {
  const taskId = row?.task_id || row?.fk_id || row?.pred_task_id || '';
  const task = taskId ? model.find('TASK','task_id',taskId) : null;
  const wbs = task?.wbs_id ? model.find('PROJWBS','wbs_id',task.wbs_id) : null;
  return { taskId: task?.task_id || '', activity: task?.task_code || '', activityName: task?.task_name || '', wbs: wbs?.wbs_short_name || wbs?.wbs_name || task?.wbs_id || '' };
}

function numericDifference(oldValue, newValue) {
  const a = Number(oldValue), b = Number(newValue);
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
}

export function compareAllTables(oldModel, newModel, { tables = null } = {}) {
  const names = tables || [...new Set([...oldModel.tableNames(), ...newModel.tableNames()])].sort();
  const changes = [];
  for (const table of names) {
    const oldRows = oldModel.table(table), newRows = newModel.table(table);
    const inferredField=KEY_FIELDS[table]?.length?null:inferUnknownKeyField(oldRows,newRows);
    const a = new Map(oldRows.map((r,i) => [keyFor(oldModel,table,r,i,inferredField), r]));
    const b = new Map(newRows.map((r,i) => [keyFor(newModel,table,r,i,inferredField), r]));
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      const oldRow = a.get(key), newRow = b.get(key);
      const ctx = taskContext(newModel, newRow || oldRow);
      if (!oldRow) {
        changes.push({ table, entityKey:key, type:'Added', field:'Record', oldValue:'', newValue:'Added', ...ctx });
        continue;
      }
      if (!newRow) {
        const oldCtx = taskContext(oldModel, oldRow);
        changes.push({ table, entityKey:key, type:'Deleted', field:'Record', oldValue:'Present', newValue:'Deleted', ...oldCtx });
        continue;
      }
      const fields = [...new Set([...Object.keys(oldRow), ...Object.keys(newRow)])].filter(f => !f.startsWith('__')).sort();
      for (const field of fields) {
        const ov = oldRow[field] ?? '', nv = newRow[field] ?? '';
        if (String(ov) === String(nv)) continue;
        changes.push({ table, entityKey:key, type:'Changed', field:LABELS[field] || field, sourceField:field, oldValue:ov, newValue:nv, difference:numericDifference(ov,nv), ...ctx });
      }
    }
  }
  return { changes, summary: summarizeChanges(changes) };
}

export function classifyMateriality(change, settings = {}) {
  const hpd = Number(settings.hoursPerDay || 8);
  const materialDateDays = Number(settings.materialDateChangeDays ?? 5);
  const materialFloatDays = Number(settings.materialFloatChangeDays ?? 10);
  const lagDays = Number(settings.materialLagChangeDays ?? 2);
  const field = String(change.sourceField || change.field || '').toLowerCase();
  const text = `${change.table} ${change.field}`.toLowerCase();
  let severity = 'Informational', reason = 'Underlying value changed.';
  if (change.type === 'Added' || change.type === 'Deleted') { severity = change.table === 'TASKPRED' ? 'Material' : 'Minor'; reason = `${change.type} ${change.table} record.`; }
  if (/cstr|constraint/.test(text)) { severity = 'Material'; reason = 'Constraint changed.'; }
  if (/calendar|clndr/.test(text)) { severity = 'Material'; reason = 'Calendar/working-time basis changed.'; }
  if (/pred_type|relationship type/.test(text)) { severity = 'Critical'; reason = 'Relationship type changed.'; }
  if (/lag/.test(text) && change.difference !== null && Math.abs(change.difference) >= lagDays*hpd) { severity = 'Material'; reason = `Lag changed by at least ${lagDays} working day(s).`; }
  if (/float/.test(text) && change.difference !== null && Math.abs(change.difference) >= materialFloatDays*hpd) { severity = 'Material'; reason = `Float changed by at least ${materialFloatDays} working day(s).`; }
  if (/date|start|finish|end/.test(field)) {
    const a = p6Date(change.oldValue), b = p6Date(change.newValue);
    if (a && b) {
      const days = Math.abs((b-a)/86400000);
      change.dateDifferenceDays = (b-a)/86400000;
      if (days >= materialDateDays) { severity = 'Material'; reason = `Date moved by ${days.toFixed(1)} calendar day(s).`; }
    }
  }
  if (change.table === 'TASKPRED' && change.type === 'Deleted') { severity = 'Critical'; reason = 'Relationship deleted; network path may have changed.'; }
  return { ...change, criticality: severity, scheduleImpact: reason };
}

export function materialChangeRegister(oldModel, newModel, settings = {}) {
  const base = compareAllTables(oldModel,newModel);
  const changes = base.changes.map(c => classifyMateriality(c,settings));
  return { changes, summary:{...summarizeChanges(changes),critical:changes.filter(c=>c.criticality==='Critical').length,material:changes.filter(c=>c.criticality==='Material').length} };
}

export function summarizeChanges(changes = []) {
  const byTable = {};
  for (const c of changes) byTable[c.table] = (byTable[c.table] || 0) + 1;
  return {
    total:changes.length,
    added:changes.filter(c=>c.type==='Added').length,
    deleted:changes.filter(c=>c.type==='Deleted').length,
    changed:changes.filter(c=>c.type==='Changed').length,
    activitiesAffected:new Set(changes.map(c=>c.activity).filter(Boolean)).size,
    byTable
  };
}

export function activityMatchMap(model, projId = null) {
  return new Map(taskRows(model,projId).map(t => [String(t.task_code || t.task_id), t]));
}

export function wbsCodeMap(model, projId = null) {
  return new Map(wbsRows(model,projId).map(w => [String(w.wbs_id), w.wbs_short_name || w.wbs_name || w.wbs_id]));
}
