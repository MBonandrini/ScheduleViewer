import {XERModel} from '../../../src/parser.js';
import {serializeXER} from '../../../src/serializer.js';
import {detectCycles,calculateCPM,applyCPM} from '../../../src/cpm.js';
/** Transfer reviewed authoring rows through the same deterministic schedule engine. */
export function builderXER(rows){
 if(!rows?.length)throw new Error('Add or generate activities first.');
 const codes=new Map();rows.forEach((r,i)=>{if(!r.id||codes.has(String(r.id)))throw new Error('Activity IDs must be nonempty and unique.');if(!Number.isFinite(Number(r.duration))||Number(r.duration)<0)throw new Error('Durations must be non-negative working days.');codes.set(String(r.id),String(i+1))});
 const dates=rows.map(r=>r.start).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();if(!dates.length)throw new Error('Enter a project start date.');const start=dates[0]+' 08:00';
 const groups=[...new Set(rows.map(r=>r.wbs||'Activities'))],wbs=new Map(groups.map((g,i)=>[g,String(i+1)]));
 const data={PROJECT:[{proj_id:'1',proj_short_name:'Builder draft',last_recalc_date:start,plan_start_date:start,clndr_id:'1'}],CALENDAR:[{clndr_id:'1',clndr_name:'Draft standard 5-day / 8-hour',day_hr_cnt:'8',week_hr_cnt:'40',clndr_data:''}],PROJWBS:groups.map(g=>({wbs_id:wbs.get(g),proj_id:'1',parent_wbs_id:'',wbs_name:g,wbs_short_name:g,seq_num:wbs.get(g)})),TASK:rows.map((r,i)=>({task_id:String(i+1),proj_id:'1',task_code:String(r.id),task_name:r.name||r.id,wbs_id:wbs.get(r.wbs||'Activities'),clndr_id:'1',status_code:'TK_NotStart',task_type:r.milestone?'TT_FinMile':'TT_Task',complete_pct_type:'CP_Drtn',target_drtn_hr_cnt:String(r.milestone?0:Number(r.duration)*8),remain_drtn_hr_cnt:String(r.milestone?0:Number(r.duration)*8),target_start_date:(r.start||dates[0])+' 08:00',target_end_date:(r.finish||r.start||dates[0])+' 17:00'})),TASKPRED:[]};
 for(const r of rows)for(const token of String(r.predecessors||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean)){
  const m=token.match(/^([^:]+)(?::(FS|SS|FF|SF)([+-]\d+(?:\.\d+)?)?)?$/i);if(!m||!codes.has(m[1]))throw new Error(`Invalid predecessor '${token}' on ${r.id}. Use ID:FS, ID:SS+2 etc. Lag is in 8-hour working days.`);
  data.TASKPRED.push({task_pred_id:String(data.TASKPRED.length+1),proj_id:'1',pred_task_id:codes.get(m[1]),task_id:codes.get(String(r.id)),pred_type:'PR_'+(m[2]||'FS').toUpperCase(),lag_hr_cnt:String(Number(m[3]||0)*8)});
 }
 const model=new XERModel({header:[],warnings:[],sourceText:'',tables:new Map(Object.entries(data).map(([name,rows])=>[name,{name,fields:[...new Set(rows.flatMap(Object.keys))],rows}]))});
 if(detectCycles(model,'1').length)throw new Error('Builder relationships contain a cycle.');
 const result=calculateCPM(model,'1',{});applyCPM(model,'1',result);return serializeXER(model);
}
