import {taskRows,taskFinish,getDataDate} from './semantic.js';
import {p6Date} from './parser.js';
const wall=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds());
const days=(a,b)=>a&&b?(wall(b)-wall(a))/86400000:null;
const stamp=d=>d?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+' '+[d.getHours(),d.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':'):'';
export const COMPARISON_CATEGORIES=[
 ['project','General project information','PROJECT'],['budget','Project budget by WBS','PROJWBS'],['options','Scheduling options','SCHEDOPTIONS'],['wbs','WBS added deleted and changed','PROJWBS'],
 ['activities','Activities added deleted and general information','TASK'],['dates','Activity dates','TASK'],['duration','Activity durations and float','TASK'],['constraints','Activity constraints','TASK'],['progress','Activity percent complete','TASK'],
 ['relationships','Relationships added deleted and changed','TASKPRED'],['resources','Resource assignments','TASKRSRC'],['codes','Activity code assignments','TASKACTV'],['costs','Activity costs','TASKRSRC'],['units','Activity units','TASKRSRC'],['expenses','Expenses added deleted and changed','PROJCOST'],['steps','Activity steps','TASKPROC'],['notes','Notebook topics','TASKMEMO'],['udf','User defined fields','UDFVALUE']
].map(([id,label,table])=>({id,label,table}));
const dateField=f=>/date$|_date_/.test(f),durationField=f=>/drtn|float/.test(f),constraintField=f=>/^cstr/.test(f),progressField=f=>/pct|complete_pct_type/.test(f);
function wanted(id,f){if(id==='budget')return /cost|budget/.test(f);if(id==='activities'&&f==='wbs_id')return true;if(/^(proj_id|task_id|wbs_id|task_pred_id|taskrsrc_id|task_memo_id|proc_id|memo_id|proj_cost_id|udf_type_id|fk_id)$/.test(f))return false;
 if(id==='dates')return dateField(f)&&!constraintField(f);if(id==='duration')return durationField(f);if(id==='constraints')return constraintField(f);if(id==='progress')return progressField(f);
 if(id==='activities')return !dateField(f)&&!durationField(f)&&!constraintField(f)&&!progressField(f)&&f!=='task_code';
 if(id==='costs')return /cost|price/.test(f);if(id==='units')return /qty|unit/.test(f);if(id==='resources')return !/cost|price|qty|unit/.test(f);return true;
}
function context(model,project){
 const tasks=taskRows(model,project),taskMap=new Map(tasks.map(t=>[String(t.task_id),t.task_code||String(t.task_id)]));
 const wbs=new Map(model.table('PROJWBS').filter(r=>project==null||String(r.proj_id)===String(project)).map(r=>[String(r.wbs_id),r])),paths=new Map();
 const wpath=id=>{id=String(id??'');if(paths.has(id))return paths.get(id);let cur=id,out=[],seen=new Set();while(wbs.has(cur)&&!seen.has(cur)){seen.add(cur);const row=wbs.get(cur);out.unshift(row.wbs_short_name||row.wbs_name||cur);cur=String(row.parent_wbs_id)}const path=out.join(' / ');paths.set(id,path||id);return path||id};
 const map=(table,id,label)=>new Map(model.table(table).map(r=>[String(r[id]),r[label]||String(r[id])]));
 const refs={task_id:taskMap,pred_task_id:taskMap,wbs_id:new Map([...wbs.keys()].map(id=>[id,wpath(id)])),parent_wbs_id:new Map([...wbs.keys()].map(id=>[id,wpath(id)])),rsrc_id:map('RSRC','rsrc_id','rsrc_short_name'),role_id:map('ROLES','role_id','role_name'),clndr_id:map('CALENDAR','clndr_id','clndr_name'),udf_type_id:new Map(model.table('UDFTYPE').map(r=>[String(r.udf_type_id),r.udf_type_label||r.udf_type_name||String(r.udf_type_id)])),memo_type_id:map('MEMOTYPE','memo_type_id','memo_type'),actv_code_id:map('ACTVCODE','actv_code_id','short_name'),actv_code_type_id:map('ACTVTYPE','actv_code_type_id','actv_code_type')};
 const value=(r,f)=>{let v=r[f]??'';if(v!==''&&refs[f])return refs[f].get(String(v))??'[unresolved '+v+']';return String(v)};
 const rows=table=>model.table(table).filter(r=>{if(table==='PROJECT')return project==null||String(r.proj_id)===String(project);if(r.task_id!=null)return taskMap.has(String(r.task_id));if(table==='TASKPRED')return taskMap.has(String(r.task_id));if(table==='UDFVALUE')return taskMap.has(String(r.fk_id));if(r.proj_id!=null)return project==null||String(r.proj_id)===String(project);return true});
 const key=(table,r)=>{switch(table){case 'PROJECT':case 'SCHEDOPTIONS':return 'Project';case 'TASK':return taskMap.get(String(r.task_id));case 'PROJWBS':return wpath(r.wbs_id);case 'TASKPRED':return value(r,'pred_task_id')+' → '+value(r,'task_id');case 'TASKRSRC':return [value(r,'task_id'),value(r,'rsrc_id'),value(r,'role_id')].join(' / ');case 'TASKACTV':return [value(r,'task_id'),value(r,'actv_code_type_id'),value(r,'actv_code_id')].join(' / ');case 'UDFVALUE':return [taskMap.get(String(r.fk_id)),value(r,'udf_type_id')].join(' / ');case 'TASKMEMO':return [value(r,'task_id'),value(r,'memo_type_id')].join(' / ');case 'TASKPROC':return [value(r,'task_id'),r.proc_name||r.seq_num].join(' / ');case 'PROJCOST':return [value(r,'task_id'),r.cost_name||r.cost_descr||r.acct_id].join(' / ');default:return JSON.stringify(r)}};
 return {tasks,taskMap,wpath,rows,key,value};
}
const numOrNull=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
export function scheduleMovements(oldM,newM,oldProject,newProject){
 const a=context(oldM,oldProject),b=context(newM,newProject),old=new Map(),duplicate=new Set();
 for(const t of a.tasks){const k=t.task_code||t.task_id;if(old.has(k))duplicate.add(k);old.set(k,t)}
 const counts=new Map();for(const t of b.tasks){const k=t.task_code||t.task_id;counts.set(k,(counts.get(k)||0)+1)}
 const rows=[];for(const t of b.tasks){const key=t.task_code||t.task_id,o=old.get(key);if(!o||duplicate.has(key)||counts.get(key)>1)continue;const before=taskFinish(o),after=taskFinish(t),movement=days(before,after),evidence=[];
 for(const [f,label]of [['target_drtn_hr_cnt','Original duration'],['remain_drtn_hr_cnt','Remaining duration'],['cstr_type','Constraint type'],['cstr_date','Constraint date'],['cstr_type2','Secondary constraint'],['cstr_date2','Secondary constraint date'],['status_code','Status'],['phys_complete_pct','Physical progress']])if(String(o[f]??'')!==String(t[f]??''))evidence.push(label+' changed');
 const ca=oldM.find('CALENDAR','clndr_id',o.clndr_id),cb=newM.find('CALENDAR','clndr_id',t.clndr_id);if((ca?.clndr_name||o.clndr_id)!==(cb?.clndr_name||t.clndr_id)||String(ca?.clndr_data||'')!==String(cb?.clndr_data||''))evidence.push('Calendar changed');
 const signature=(m,c,id)=>m.findAll('TASKPRED','task_id',id).map(r=>[c.value(r,'pred_task_id'),r.pred_type,r.lag_hr_cnt||'0'].join(':')).sort().join('|');if(signature(oldM,a,o.task_id)!==signature(newM,b,t.task_id))evidence.push('Incoming logic changed');
 rows.push({activity:String(key),name:t.task_name||'',wbs:b.wpath(t.wbs_id),previousFinish:stamp(before),currentFinish:stamp(after),movementDays:movement,milestone:/Mile/.test(t.task_type||''),evidence:evidence.join('; ')||'No direct change identified; inspect upstream logic and data date'});
 }
 const valid=rows.filter(r=>r.movementDays!=null),oldFin=a.tasks.map(taskFinish).filter(Boolean),newFin=b.tasks.map(taskFinish).filter(Boolean),max=xs=>xs.reduce((a,b)=>!a||b>a?b:a,null);
 const critical=ts=>ts.filter(t=>numOrNull(t.total_float_hr_cnt)!==null&&Number(t.total_float_hr_cnt)<=0).length;
 return {rows,summary:{matched:rows.length,earlier:valid.filter(r=>r.movementDays<-.000001).length,later:valid.filter(r=>r.movementDays>.000001).length,unchanged:valid.filter(r=>Math.abs(r.movementDays)<=.000001).length,missingDates:rows.length-valid.length,ambiguous:duplicate.size+[...counts.values()].filter(n=>n>1).length,largestMovementDays:valid.reduce((a,r)=>Math.abs(r.movementDays)>Math.abs(a)?r.movementDays:a,0),finishMovementDays:days(max(oldFin),max(newFin)),milestonesMoved:valid.filter(r=>r.milestone&&Math.abs(r.movementDays)>.000001).length,criticalChange:critical(b.tasks)-critical(a.tasks)}};
}
export function buildComparisonReport(previous,current,{previousProject=null,currentProject=null,categories=COMPARISON_CATEGORIES.map(c=>c.id)}={}){
 const a=context(previous,previousProject),b=context(current,currentProject),sections=[];
 for(const cat of COMPARISON_CATEGORIES.filter(c=>categories.includes(c.id))){const table=cat.table,hasA=previous.tables.has(table),hasB=current.tables.has(table),section={...cat,changes:[],unavailable:[],status:'Compared'};sections.push(section);
 if(!hasA||!hasB){section.status='Unavailable';section.unavailable.push(`Table ${table} absent from ${!hasA?'previous':''}${!hasA&&!hasB?' and ':''}${!hasB?'current':''} schedule`);continue;}
 const af=previous.tables.get(table).fields,bf=current.tables.get(table).fields,fields=[...new Set([...af,...bf])].filter(f=>wanted(cat.id,f));section.unavailable=fields.filter(f=>!af.includes(f)||!bf.includes(f));const common=fields.filter(f=>af.includes(f)&&bf.includes(f));if(!common.length){section.status='Unavailable';section.unavailable.push('No comparable fields for this category');continue;}
 const index=(ctx)=>{const map=new Map();for(const row of ctx.rows(table)){const key=ctx.key(table,row);if(map.has(key))throw Error('Ambiguous '+table+' match: '+key+'. Choose one project or resolve duplicate business keys.');map.set(key,row)}return map};
 let ar,br;try{ar=index(a);br=index(b)}catch(err){section.status='Ambiguous';section.unavailable.push(err.message);continue;}
 for(const key of new Set([...ar.keys(),...br.keys()])){const o=ar.get(key),n=br.get(key),name=n?.task_name||o?.task_name||n?.wbs_name||o?.wbs_name||'';
 if(!o||!n){if(table==='TASK'&&cat.id!=='activities')continue;section.changes.push({type:o?'Deleted':'Added',key,name,field:table,previous:o?'Present':'',current:n?'Present':''});continue;}
 for(const f of common){const ov=a.value(o,f),nv=b.value(n,f);if(ov!==nv)section.changes.push({type:'Changed',key,name,field:f,previous:ov,current:nv});}
 }if(!section.changes.length)section.status=section.unavailable.length?'Partially available':'No changes';
 }
 const movement=scheduleMovements(previous,current,previousProject,currentProject),activity=sections.find(s=>s.id==='activities'),logic=sections.find(s=>s.id==='relationships');
 const summary={...movement.summary,added:activity?.status==='Unavailable'||activity?.status==='Ambiguous'?null:activity?.changes.filter(c=>c.type==='Added').length??null,deleted:activity?.status==='Unavailable'||activity?.status==='Ambiguous'?null:activity?.changes.filter(c=>c.type==='Deleted').length??null,modified:new Set(sections.filter(s=>s.table==='TASK').flatMap(s=>s.changes.filter(c=>c.type==='Changed').map(c=>c.key))).size,logicChanges:logic&& !['Unavailable','Ambiguous'].includes(logic.status)?logic.changes.length:null};
 const project=(m,id)=>m.table('PROJECT').find(p=>id==null||String(p.proj_id)===String(id));
 return {sections,summary,movement,previousName:project(previous,previousProject)?.proj_short_name||String(previousProject||'Previous'),currentName:project(current,currentProject)?.proj_short_name||String(currentProject||'Current'),previousDataDate:stamp(p6Date(getDataDate(previous,previousProject))),currentDataDate:stamp(p6Date(getDataDate(current,currentProject))),generatedAt:new Date().toISOString()};
}
