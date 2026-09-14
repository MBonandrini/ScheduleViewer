import { p6Date, num } from './parser.js';
import { taskRows } from './semantic.js';
export function issueGraphicData(model,projId,issues=[]){
  const bySeverity={high:0,medium:0,low:0,info:0};for(const i of issues){const s=String(i.severity||'info').toLowerCase();bySeverity[s]=(bySeverity[s]||0)+1}
  const taskIds=new Set(issues.map(i=>String(i.task_id||'')).filter(Boolean)),tasks=taskRows(model,projId).filter(t=>taskIds.has(String(t.task_id)));
  const wbs=new Map();for(const t of tasks){const k=String(t.wbs_id||'Unassigned');wbs.set(k,(wbs.get(k)||0)+1)}
  const dated=tasks.map(t=>({task:t,start:p6Date(t.act_start_date||t.restart_date||t.early_start_date||t.target_start_date),finish:p6Date(t.act_end_date||t.reend_date||t.early_end_date||t.target_end_date),float:num(t.total_float_hr_cnt)})).filter(x=>x.start||x.finish);
  return {bySeverity,tasks,dated,wbs:[...wbs.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)};
}
export function severityBarHTML(bySeverity={}){const entries=[['high','High'],['medium','Medium'],['low','Low'],['info','Info']],max=Math.max(1,...entries.map(([k])=>Number(bySeverity[k]||0)));return `<div class="analysis-bars">${entries.map(([k,l])=>`<div class="analysis-bar-row"><span>${l}</span><i class="${k}" style="width:${(Number(bySeverity[k]||0)/max*100).toFixed(1)}%"></i><b>${Number(bySeverity[k]||0)}</b></div>`).join('')}</div>`;}
