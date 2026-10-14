import {num,p6Date} from './parser.js';
import {taskRows,wbsRows,taskStart,taskFinish,getDataDate,buildWBSTree} from './semantic.js';
import {buildCalendar} from './cpm.js';
export const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function calendarYearData(model,id,year){
 if(!Number.isInteger(+year)||+year<1900||+year>2200)throw Error('Choose a year between 1900 and 2200.');
 const row=model.find('CALENDAR','clndr_id',String(id));if(!row)throw Error('Choose a calendar.');
 const cal=buildCalendar(model,id),days=[];let hours=0,workDays=0,holidays=0,restDays=0;
 for(let d=new Date(+year,0,1);d.getFullYear()===+year;d.setDate(d.getDate()+1)){
  const date=dateKey(d),exception=cal.exceptionMap.has(date),periods=exception?cal.exceptionMap.get(date):cal.dayMap.get(d.getDay())||[],h=periods.reduce((s,[a,b])=>s+Math.max(0,b-a)/60,0);
  hours+=h;if(h>0)workDays++;else if(exception)holidays++;else restDays++;
  days.push({date,month:d.getMonth(),day:d.getDate(),weekday:d.getDay(),hours:h,exception,holiday:exception&&h===0,periods});
 }
 return {id,name:row.clndr_name,year:+year,hours,workDays,holidays,restDays,days,assumedWeek:!row.clndr_data};
}
export function wbsOutline(model,project){const out=[],stack=buildWBSTree(model,project).reverse().map(n=>({n,depth:0,parent:''}));while(stack.length){const {n,depth,parent}=stack.pop();out.push({id:String(n.wbs_id),name:n.wbs_name||n.wbs_short_name||n.wbs_id,depth,parent});for(const c of [...n.children].reverse())stack.push({n:c,depth:depth+1,parent:String(n.wbs_id)});}return out;}
export function descendants(outline,id){const result=new Set(id?[String(id)]:outline.map(r=>r.id));if(id)for(const r of outline)if(result.has(r.parent))result.add(r.id);return result;}
export function progressRows(model,project,{metric='activities',resourceId=''}={}){
 const outline=wbsOutline(model,project),map=new Map(outline.map(r=>[r.id,{...r,count:0,numerator:0,denominator:0,completed:0}])),tasks=taskRows(model,project),assign=new Map();
 if(metric==='units'&&!resourceId)throw Error('Choose one resource so unlike units are not added.');
 for(const a of model.table('TASKRSRC')){if(resourceId&&String(a.rsrc_id)!==String(resourceId))continue;const list=assign.get(String(a.task_id))||[];list.push(a);assign.set(String(a.task_id),list);}
 for(const t of tasks){const id=String(t.wbs_id||'');if(!map.has(id)){const r={id,name:'Unassigned WBS',parent:'',depth:0,count:0,numerator:0,denominator:0,completed:0};map.set(id,r);outline.push(r);}const r=map.get(id);r.count++;const complete=t.status_code==='TK_Complete';r.completed+=complete?1:0;
  const original=Math.max(0,num(t.target_drtn_hr_cnt)),remaining=Math.max(0,num(t.remain_drtn_hr_cnt));
  if(metric==='activities'){r.denominator++;r.numerator+=complete?1:0;}
  else if(metric==='time'){r.denominator+=original;r.numerator+=complete?original:Math.max(0,original-remaining);}
  else if(metric==='units'){for(const a of assign.get(String(t.task_id))||[]){const actual=num(a.act_reg_qty)+num(a.act_ot_qty),rem=num(a.remain_qty);r.numerator+=actual;r.denominator+=actual+rem;}}
  else {r.denominator++;r.numerator+=complete?1:Math.max(0,Math.min(100,num(t.phys_complete_pct)))/100;}
 }
 for(const r of [...outline].reverse()){const v=map.get(r.id),p=map.get(r.parent);if(p)for(const k of ['count','numerator','denominator','completed'])p[k]+=v[k];}
 return outline.map(r=>{const v=map.get(r.id);return {...v,percent:v.denominator?100*v.numerator/v.denominator:null};}).filter(r=>r.count);
}
export function resourceBreakdown(model,project,{level=2,resourceId=''}={}){
 const outline=wbsOutline(model,project),byWbs=new Map(outline.map(r=>[r.id,r])),tasks=new Map(taskRows(model,project).map(t=>[String(t.task_id),t])),resources=new Map(model.table('RSRC').map(r=>[String(r.rsrc_id),r])),units=new Map(model.table('UOMTYPE').map(r=>[String(r.uom_id),r.unit_name||r.uom_short_name||r.uom_id])),out=new Map();
 for(const a of model.table('TASKRSRC')){const t=tasks.get(String(a.task_id));if(!t||(resourceId&&String(a.rsrc_id)!==String(resourceId)))continue;let w=byWbs.get(String(t.wbs_id));while(w&&w.depth>=Number(level)&&byWbs.has(w.parent))w=byWbs.get(w.parent);const resource=resources.get(String(a.rsrc_id)),key=String(a.rsrc_id)+'|'+(w?.id||'');if(!out.has(key))out.set(key,{resourceId:String(a.rsrc_id),resource:resource?.rsrc_name||a.rsrc_id||'Unassigned',unit:units.get(String(resource?.uom_id))||(/Labor|Equip/.test(resource?.rsrc_type||'')?'h':'unspecified'),wbs:w?.name||'Unassigned',planned:0,actual:0,remaining:0});const r=out.get(key);r.planned+=num(a.target_qty);r.actual+=num(a.act_reg_qty)+num(a.act_ot_qty);r.remaining+=num(a.remain_qty);}
 return [...out.values()];
}
export function lookaheadRows(model,project,{start='',weeks=6,wbsId='',codeIds=[],status='all',search=''}={}){
 const from=p6Date(start||getDataDate(model,project));if(!from)throw Error('Set a valid lookahead start date.');const end=new Date(from);end.setDate(end.getDate()+Number(weeks)*7);const allowed=descendants(wbsOutline(model,project),wbsId),codes=new Map();for(const a of model.table('TASKACTV')){const list=codes.get(String(a.task_id))||[];list.push(String(a.actv_code_id));codes.set(String(a.task_id),list);}
 return taskRows(model,project).filter(t=>{const s=taskStart(t),f=taskFinish(t);return s&&f&&s<end&&f>=from&&(!wbsId||allowed.has(String(t.wbs_id)))&&(status==='all'||t.status_code===status)&&(!codeIds.length||codeIds.some(id=>codes.get(String(t.task_id))?.includes(String(id))))&&`${t.task_code} ${t.task_name}`.toLowerCase().includes(search.toLowerCase());}).map(t=>({...t,start:dateKey(taskStart(t)),finish:dateKey(taskFinish(t)),durationHours:num(t.target_drtn_hr_cnt),floatHours:t.total_float_hr_cnt===''?'':num(t.total_float_hr_cnt)}));
}
