import { num } from './parser.js';
import { ensureTable, touch } from './editor.js';

function nextNumericId(rows,field,start=1){let max=start-1;for(const r of rows){const n=Number(r[field]);if(Number.isFinite(n))max=Math.max(max,n)}return String(max+1)}

export function resourceRows(model){return [...(model.table('RSRC')||[])];}

export function buildResourceTree(model){
  const rows=resourceRows(model),nodes=new Map(rows.map(r=>[String(r.rsrc_id),{...r,children:[],orphan:false}])),roots=[];
  for(const n of nodes.values()){
    const pid=String(n.parent_rsrc_id||'');
    if(pid&&nodes.has(pid)&&pid!==String(n.rsrc_id))nodes.get(pid).children.push(n);
    else { if(pid&&!nodes.has(pid))n.orphan=true; roots.push(n); }
  }
  const sort=a=>{a.children.sort((x,y)=>num(x.rsrc_seq_num)-num(y.rsrc_seq_num)||String(x.rsrc_name||'').localeCompare(String(y.rsrc_name||'')));a.children.forEach(sort)};
  roots.sort((x,y)=>num(x.rsrc_seq_num)-num(y.rsrc_seq_num)||String(x.rsrc_name||'').localeCompare(String(y.rsrc_name||''))).forEach(sort);
  return roots;
}

export function resourceDescendantIds(model,resourceId){
  const rows=resourceRows(model),children=new Map();
  for(const r of rows){const p=String(r.parent_rsrc_id||'');if(!children.has(p))children.set(p,[]);children.get(p).push(String(r.rsrc_id));}
  const out=[],stack=[...(children.get(String(resourceId))||[])],seen=new Set();
  while(stack.length){const id=stack.pop();if(seen.has(id))continue;seen.add(id);out.push(id);for(const c of children.get(id)||[])stack.push(c)}
  return out;
}

export function resourceAssignmentCounts(model,resourceId,{includeDescendants=false}={}){
  const ids=new Set([String(resourceId),...(includeDescendants?resourceDescendantIds(model,resourceId):[])]);
  const rows=(model.table('TASKRSRC')||[]).filter(r=>ids.has(String(r.rsrc_id)));
  return {assignments:rows.length,tasks:new Set(rows.map(r=>String(r.task_id))).size};
}

export function resourceRates(model,resourceId){
  return (model.table('RSRCRATE')||[]).filter(r=>String(r.rsrc_id)===String(resourceId)).sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||'')));
}

export function addResource(model,parentResourceId='',defaults={}){
  const fields=['rsrc_id','parent_rsrc_id','clndr_id','role_id','rsrc_seq_num','rsrc_name','rsrc_short_name','rsrc_title_name','def_qty_per_hr','cost_qty_type','active_flag','auto_compute_act_flag','rsrc_type','rsrc_notes','load_tasks_flag','level_flag'];
  const t=ensureTable(model,'RSRC',fields),id=nextNumericId(t.rows,'rsrc_id',1);
  if(parentResourceId&&!model.find('RSRC','rsrc_id',String(parentResourceId)))throw new Error('Parent resource not found.');
  const siblings=t.rows.filter(r=>String(r.parent_rsrc_id||'')===String(parentResourceId||''));
  const seq=String(Math.max(0,...siblings.map(r=>Number(r.rsrc_seq_num)||0))+1);
  const row=Object.fromEntries(t.fields.map(f=>[f,'']));
  Object.assign(row,{rsrc_id:id,parent_rsrc_id:String(parentResourceId||''),rsrc_seq_num:seq,rsrc_name:'New Resource',rsrc_short_name:`R${id}`,rsrc_type:'RT_Labor',active_flag:'Y',auto_compute_act_flag:'Y',load_tasks_flag:'Y',level_flag:'Y',def_qty_per_hr:'1'},defaults);
  t.rows.push(row);touch(model);return row;
}

export function updateResource(model,resourceId,patch={}){
  const r=model.find('RSRC','rsrc_id',String(resourceId));if(!r)throw new Error('Resource not found.');
  if('parent_rsrc_id' in patch){const p=String(patch.parent_rsrc_id||'');if(p===String(resourceId))throw new Error('A resource cannot be its own parent.');if(p&&!model.find('RSRC','rsrc_id',p))throw new Error('Parent resource not found.');if(resourceDescendantIds(model,resourceId).includes(p))throw new Error('Cannot move a resource beneath one of its descendants.');}
  Object.assign(r,patch);touch(model);return r;
}

export function deleteResource(model,resourceId,{mode='block',removeAssignments=false,targetParentId=null}={}){
  const id=String(resourceId),r=model.find('RSRC','rsrc_id',id);if(!r)throw new Error('Resource not found.');
  const descendants=resourceDescendantIds(model,id),subtree=new Set([id,...descendants]);
  const assignmentRows=(model.table('TASKRSRC')||[]).filter(a=>subtree.has(String(a.rsrc_id)));
  if(assignmentRows.length&&!removeAssignments)throw new Error(`Resource/subtree has ${assignmentRows.length} assignment(s). Enable assignment removal or reassign them before deleting.`);
  if(mode==='promote'){
    const dest=targetParentId==null?String(r.parent_rsrc_id||''):String(targetParentId||'');
    if(dest&&subtree.has(dest))throw new Error('Destination cannot be within the resource subtree.');
    if(dest&&!model.find('RSRC','rsrc_id',dest))throw new Error('Destination parent resource not found.');
    for(const child of model.table('RSRC')||[])if(String(child.parent_rsrc_id||'')===id)child.parent_rsrc_id=dest;
    const rt=model.tables.get('RSRC');rt.rows=rt.rows.filter(x=>String(x.rsrc_id)!==id);
    if(removeAssignments){const at=model.tables.get('TASKRSRC');if(at)at.rows=at.rows.filter(a=>String(a.rsrc_id)!==id)}
    touch(model);return {deletedResources:1,deletedAssignments:removeAssignments?assignmentRows.filter(a=>String(a.rsrc_id)===id).length:0};
  }
  if(mode==='subtree'){
    const rt=model.tables.get('RSRC');rt.rows=rt.rows.filter(x=>!subtree.has(String(x.rsrc_id)));
    if(removeAssignments){const at=model.tables.get('TASKRSRC');if(at)at.rows=at.rows.filter(a=>!subtree.has(String(a.rsrc_id)))}
    for(const name of ['RSRCRATE','RSRCRCAT']){const t=model.tables.get(name);if(t)t.rows=t.rows.filter(x=>!subtree.has(String(x.rsrc_id)))}
    touch(model);return {deletedResources:subtree.size,deletedAssignments:removeAssignments?assignmentRows.length:0};
  }
  if(descendants.length)throw new Error('Resource has child resources. Choose Promote Children or Delete Subtree.');
  const rt=model.tables.get('RSRC');rt.rows=rt.rows.filter(x=>String(x.rsrc_id)!==id);
  if(removeAssignments){const at=model.tables.get('TASKRSRC');if(at)at.rows=at.rows.filter(a=>String(a.rsrc_id)!==id)}
  touch(model);return {deletedResources:1,deletedAssignments:removeAssignments?assignmentRows.length:0};
}

export function addResourceRate(model,resourceId,{startDate='',pricePerUnit=0,maxUnitsPerHour=''}={}){
  if(!model.find('RSRC','rsrc_id',String(resourceId)))throw new Error('Resource not found.');
  const t=ensureTable(model,'RSRCRATE',['rsrc_rate_id','rsrc_id','start_date','cost_per_qty','max_qty_per_hr']);
  const idField=t.fields.includes('rsrc_rate_id')?'rsrc_rate_id':null;
  const row=Object.fromEntries(t.fields.map(f=>[f,'']));
  if(idField)row[idField]=nextNumericId(t.rows,idField,1);
  Object.assign(row,{rsrc_id:String(resourceId),start_date:startDate,cost_per_qty:String(pricePerUnit??0),max_qty_per_hr:String(maxUnitsPerHour??'')});
  t.rows.push(row);touch(model);return row;
}
