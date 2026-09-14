import { taskRows } from './semantic.js';
import { p6Date, num } from './parser.js';

const FIELDS=['early_start_date','early_end_date','late_start_date','late_end_date','target_start_date','target_end_date','total_float_hr_cnt','free_float_hr_cnt'];

export function captureImportedCalculation(model,projId){
  const rows=[];
  for(const t of taskRows(model,projId)){
    const x={task_id:String(t.task_id),task_code:String(t.task_code||t.task_id),task_name:String(t.task_name||'')};
    for(const f of FIELDS)x[f]=t[f]??'';
    rows.push(x);
  }
  return {projectId:String(projId??''),capturedAt:new Date().toISOString(),rows};
}

function hoursDelta(a,b){const da=p6Date(a),db=p6Date(b);return da&&db?(db-da)/3600000:null}

export function calculationDiscrepancies(imported,model,projId,{dateToleranceHours=.01,floatToleranceHours=.01}={}){
  if(!imported)return [];
  const before=new Map(imported.rows.map(r=>[String(r.task_id),r])),out=[];
  for(const t of taskRows(model,projId)){
    const b=before.get(String(t.task_id));if(!b)continue;
    for(const f of ['early_start_date','early_end_date','late_start_date','late_end_date']){
      if(!b[f]&&!t[f])continue;
      const delta=hoursDelta(b[f],t[f]);
      if(delta===null?String(b[f]||'')!==String(t[f]||''):Math.abs(delta)>dateToleranceHours)
        out.push({task_id:t.task_id,task_code:t.task_code||t.task_id,task_name:t.task_name||'',field:f,imported:b[f]||'',calculated:t[f]||'',deltaHours:delta,kind:'Date'});
    }
    for(const f of ['total_float_hr_cnt','free_float_hr_cnt']){
      const a=num(b[f],NaN),c=num(t[f],NaN);if(!Number.isFinite(a)&&!Number.isFinite(c))continue;
      const delta=(Number.isFinite(a)?c-a:null);
      if(delta===null||Math.abs(delta)>floatToleranceHours)
        out.push({task_id:t.task_id,task_code:t.task_code||t.task_id,task_name:t.task_name||'',field:f,imported:b[f]??'',calculated:t[f]??'',deltaHours:delta,kind:'Float'});
    }
  }
  return out;
}

export function discrepancySummary(rows=[]){
  const activities=new Set(rows.map(r=>String(r.task_id)));
  return {fields:rows.length,activities:activities.size,dateFields:rows.filter(r=>r.kind==='Date').length,floatFields:rows.filter(r=>r.kind==='Float').length};
}
