import {XERModel} from '../../src/parser.js';
export function model(tasks=[],rels=[],extra={}) {
 const data={PROJECT:[{proj_id:'P',last_recalc_date:'2026-01-05 08:00',clndr_id:'C'}],CALENDAR:[{clndr_id:'C',day_hr_cnt:'8',clndr_data:''}],PROJWBS:[],TASK:tasks.map((t,i)=>({task_id:String(i+1),proj_id:'P',task_code:`A${i+1}`,clndr_id:'C',status_code:'TK_NotStart',task_type:'TT_Task',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',...t})),TASKPRED:rels.map(r=>({proj_id:'P',pred_type:'PR_FS',lag_hr_cnt:'0',...r})),...extra};
 return new XERModel({header:[],warnings:[],sourceText:'',tables:new Map(Object.entries(data).map(([name,rows])=>[name,{name,fields:[...new Set(rows.flatMap(Object.keys))],rows}]))});
}
