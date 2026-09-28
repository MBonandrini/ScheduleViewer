import {buildWBSTree,taskRows} from './semantic.js';
import {num} from './parser.js';
/** Iterative preorder, with postorder numeric rollups. Roots are WBS level 1. */
export function wbsRollup(model,project,records,fields){
 const tasks=new Map(taskRows(model,project).map(t=>[String(t.task_id),t]));
 const roots=buildWBSTree(model,project),ordered=[],byId=new Map(),stack=roots.slice().reverse().map(node=>({node,depth:0,parent:null}));
 while(stack.length){const {node,depth,parent}=stack.pop(),r={wbsId:String(node.wbs_id),wbsName:node.wbs_name||node.wbs_short_name||String(node.wbs_id),depth,parent,records:[],count:0,...Object.fromEntries(fields.map(f=>[f,0]))};ordered.push(r);byId.set(r.wbsId,r);for(const n of node.children.slice().reverse())stack.push({node:n,depth:depth+1,parent:r});}
 for(const record of records){const id=String(record.wbs_id??tasks.get(String(record.task_id))?.wbs_id??'');let r=byId.get(id);if(!r){r={wbsId:id,wbsName:id?'Unassigned WBS ('+id+')':'Unassigned',depth:0,parent:null,records:[],count:0,...Object.fromEntries(fields.map(f=>[f,0]))};byId.set(id,r);ordered.push(r)}r.records.push(record);r.count++;for(const f of fields)r[f]+=num(record[f]);}
 for(let i=ordered.length-1;i>=0;i--){const r=ordered[i];if(r.parent){r.parent.count+=r.count;for(const f of fields)r.parent[f]+=r[f];}}
 return ordered.filter(r=>r.count).map(({parent,...r})=>r);
}
export function groupedReportRows(model,project,records,fields=[],derive=x=>x){return wbsRollup(model,project,records,fields).flatMap(r=>[{...derive(r),kind:'wbs'},...r.records.map(x=>({...x,kind:'activity',depth:r.depth+1}))]);}
export function activityMatchesFilters(t,selected=['all']){return selected.includes('all')||selected.some(f=>f==='critical'?t.total_float_hr_cnt!==''&&t.total_float_hr_cnt!=null&&num(t.total_float_hr_cnt)<=0:f==='active'?t.status_code==='TK_Active':f==='notstarted'?t.status_code==='TK_NotStart':false);}
