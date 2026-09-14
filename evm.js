import { taskRows } from './semantic.js';
import { num,p6Date } from './parser.js';
export function evmRows(model,projId,statusDate=new Date()){
 const dd=statusDate instanceof Date?statusDate:new Date(statusDate);return taskRows(model,projId).map(t=>{const bac=num(t.target_cost||t.target_work_qty||t.target_drtn_hr_cnt),pct=num(t.phys_complete_pct||t.complete_pct)/100,ev=bac*pct;const s=p6Date(t.target_start_date),f=p6Date(t.target_end_date);let planned=0;if(s&&f){if(dd>=f)planned=1;else if(dd>s)planned=Math.max(0,Math.min(1,(dd-s)/Math.max(1,f-s)))}const pv=bac*planned,ac=num(t.act_cost||t.act_work_qty||0),spi=pv?ev/pv:null,cpi=ac?ev/ac:null,eac=cpi?bac/cpi:bac,vac=bac-eac;return {task_id:t.task_id,task_code:t.task_code,task_name:t.task_name,bac,pv,ev,ac,spi,cpi,eac,vac}})
}
export function evmSummary(rows){const s=rows.reduce((a,r)=>{for(const k of ['bac','pv','ev','ac'])a[k]+=Number(r[k]||0);return a},{bac:0,pv:0,ev:0,ac:0});s.spi=s.pv?s.ev/s.pv:null;s.cpi=s.ac?s.ev/s.ac:null;s.eac=s.cpi?s.bac/s.cpi:s.bac;s.vac=s.bac-s.eac;s.tcpi=(s.bac-s.ev)/(Math.max(0.0001,s.bac-s.ac));return s}
