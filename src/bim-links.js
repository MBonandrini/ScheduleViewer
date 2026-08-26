/**
 * BIM ↔ P6 activity linking.
 *
 * Design:
 * - Canonical lightweight activity links are persisted inside the XER using
 *   Activity text UDFs (UDFTYPE/UDFVALUE), so links travel with the schedule.
 * - Rich BIM metadata stays in an optional local .bimlink.json sidecar.
 * - Links use stable model/object identifiers, never transient viewer dbIds.
 */

export const BIM_UDF_PREFIX = 'BIM_LINK_';
export const BIM_UDF_DATA_TYPE = 'FT_TEXT';
export const BIM_UDF_CHUNK = 240; // comfortably below P6 text-UDF limits
export const BIM_SCHEMA_VERSION = 1;

function touch(model){ model.indexes = new Map(); }
function ensureTable(model,name,fields){
  if(!model.tables.has(name)) model.tables.set(name,{name,fields:[...fields],rows:[]});
  const t=model.tables.get(name); for(const f of fields) if(!t.fields.includes(f)) t.fields.push(f); return t;
}
function nextNumericId(rows,field,start=1){let max=start-1;for(const r of rows){const n=Number(r[field]);if(Number.isFinite(n))max=Math.max(max,n)}return String(max+1)}
function fieldLabel(i){return `${BIM_UDF_PREFIX}${String(i).padStart(2,'0')}`}
function encodePart(v){return encodeURIComponent(String(v??'').trim()).replace(/%7E/gi,'~')}
function decodePart(v){try{return decodeURIComponent(v)}catch{return v}}

export function normalizeBimLink(link){
  const modelKey=String(link?.modelKey??link?.model_id??link?.model??'').trim();
  const objectId=String(link?.objectId??link?.externalId??link?.external_id??link?.guid??link?.id??'').trim();
  if(!modelKey||!objectId) return null;
  return {modelKey,objectId};
}
export function dedupeBimLinks(links=[]){
  const out=[],seen=new Set();
  for(const raw of links){const x=normalizeBimLink(raw);if(!x)continue;const k=`${x.modelKey}\u0000${x.objectId}`;if(seen.has(k))continue;seen.add(k);out.push(x)}
  return out;
}

export function encodeBimLinks(links=[]){
  const clean=dedupeBimLinks(links);
  return clean.length?`v1|${clean.map(x=>`${encodePart(x.modelKey)}~${encodePart(x.objectId)}`).join(';')}`:'v1|';
}
export function decodeBimLinks(payload=''){
  const text=String(payload||'').trim(); if(!text)return [];
  const body=text.startsWith('v1|')?text.slice(3):text;
  return dedupeBimLinks(body.split(';').filter(Boolean).map(token=>{const i=token.indexOf('~');return i<0?null:{modelKey:decodePart(token.slice(0,i)),objectId:decodePart(token.slice(i+1))}}));
}

/** Split at whole-link boundaries where possible; each UDFVALUE stays compact. */
export function chunkBimPayload(links=[],maxLen=BIM_UDF_CHUNK){
  const clean=dedupeBimLinks(links); if(!clean.length)return [];
  const tokens=clean.map(x=>`${encodePart(x.modelKey)}~${encodePart(x.objectId)}`);
  const chunks=[];let cur='v1|';
  for(const token of tokens){
    const addition=(cur==='v1|'?'':';')+token;
    if(cur.length+addition.length<=maxLen){cur+=addition;continue}
    if(cur!=='v1|')chunks.push(cur);
    // Very long stable IDs are still preserved; serializers do not truncate.
    cur='v1|'+token;
  }
  if(cur!=='v1|')chunks.push(cur); return chunks;
}

function taskBimUdfTypes(model){
  return (model.table('UDFTYPE')||[]).filter(u=>String(u.table_name||'').toUpperCase()==='TASK'&&String(u.udf_type_label||'').startsWith(BIM_UDF_PREFIX));
}
export function ensureBimUdfTypes(model,count){
  const t=ensureTable(model,'UDFTYPE',['udf_type_id','table_name','udf_type_name','udf_type_label','logical_data_type','super_flag','indicator_expression','summary_indicator_expression','export_flag']);
  const existing=new Map(taskBimUdfTypes(model).map(u=>[u.udf_type_label,u]));
  const out=[];
  for(let i=1;i<=count;i++){
    const label=fieldLabel(i);let row=existing.get(label);
    if(!row){const id=nextNumericId(t.rows,'udf_type_id',1);row=Object.fromEntries(t.fields.map(f=>[f,'']));Object.assign(row,{udf_type_id:id,table_name:'TASK',udf_type_name:`user_field_${id}`,udf_type_label:label,logical_data_type:BIM_UDF_DATA_TYPE,super_flag:'N',export_flag:'Y'});t.rows.push(row)}
    else {row.table_name='TASK';row.logical_data_type=BIM_UDF_DATA_TYPE;row.super_flag=row.super_flag||'N';if('export_flag'in row)row.export_flag=row.export_flag||'Y'}
    out.push(row);
  }
  touch(model);return out;
}

export function getActivityBimLinks(model,taskId){
  const types=taskBimUdfTypes(model).sort((a,b)=>String(a.udf_type_label).localeCompare(String(b.udf_type_label),undefined,{numeric:true}));
  if(!types.length)return [];
  const ids=new Set(types.map(x=>String(x.udf_type_id))), order=new Map(types.map((x,i)=>[String(x.udf_type_id),i]));
  const vals=(model.table('UDFVALUE')||[]).filter(v=>String(v.fk_id)===String(taskId)&&ids.has(String(v.udf_type_id))).sort((a,b)=>(order.get(String(a.udf_type_id))??0)-(order.get(String(b.udf_type_id))??0));
  const merged=[];for(const v of vals){const links=decodeBimLinks(v.udf_text||'');for(const x of links)merged.push(x)}return dedupeBimLinks(merged);
}

export function setActivityBimLinks(model,projId,taskId,links=[]){
  const task=model.find('TASK','task_id',String(taskId));if(!task)throw new Error('Activity not found.');
  if(String(task.proj_id)!==String(projId))throw new Error('Activity does not belong to the selected project.');
  const chunks=chunkBimPayload(links);
  const types=ensureBimUdfTypes(model,Math.max(1,chunks.length));
  const allTypeIds=new Set(taskBimUdfTypes(model).map(x=>String(x.udf_type_id)));
  const t=ensureTable(model,'UDFVALUE',['udf_type_id','fk_id','proj_id','udf_code_id','udf_date','udf_number','udf_text']);
  t.rows=t.rows.filter(v=>!(String(v.fk_id)===String(taskId)&&allTypeIds.has(String(v.udf_type_id))));
  chunks.forEach((payload,i)=>{const u=types[i];const row=Object.fromEntries(t.fields.map(f=>[f,'']));Object.assign(row,{udf_type_id:String(u.udf_type_id),fk_id:String(taskId),proj_id:String(projId),udf_text:payload});t.rows.push(row)});
  touch(model);return dedupeBimLinks(links);
}
export function addActivityBimLinks(model,projId,taskId,links=[]){return setActivityBimLinks(model,projId,taskId,[...getActivityBimLinks(model,taskId),...links])}
export function removeActivityBimLinks(model,projId,taskId,links=[]){const remove=new Set(dedupeBimLinks(links).map(x=>`${x.modelKey}\u0000${x.objectId}`));return setActivityBimLinks(model,projId,taskId,getActivityBimLinks(model,taskId).filter(x=>!remove.has(`${x.modelKey}\u0000${x.objectId}`)))}

export function allActivityBimLinks(model,projId){
  return (model.table('TASK')||[]).filter(t=>String(t.proj_id)===String(projId)).map(t=>({taskId:String(t.task_id),taskCode:t.task_code||'',taskName:t.task_name||'',links:getActivityBimLinks(model,t.task_id)})).filter(x=>x.links.length);
}

export function makeBimSidecar(model,projId,{models=[]}={}){
  const p=model.find('PROJECT','proj_id',String(projId));
  return {schema:'p6-xer-bim-links',schemaVersion:BIM_SCHEMA_VERSION,project:{projId:String(projId),projectCode:p?.proj_short_name||'',projectName:p?.proj_name||''},models,activityLinks:allActivityBimLinks(model,projId),exportedAt:new Date().toISOString()};
}
export function applyBimSidecar(model,projId,sidecar,{replace=true}={}){
  if(!sidecar||sidecar.schema!=='p6-xer-bim-links')throw new Error('Not a P6 BIM link sidecar file.');
  let count=0;
  for(const a of sidecar.activityLinks||[]){const task=model.find('TASK','task_id',String(a.taskId));if(!task||String(task.proj_id)!==String(projId))continue;const links=replace?dedupeBimLinks(a.links):dedupeBimLinks([...getActivityBimLinks(model,a.taskId),...(a.links||[])]);setActivityBimLinks(model,projId,a.taskId,links);count+=links.length}
  return {activityCount:(sidecar.activityLinks||[]).length,linkCount:count,models:Array.isArray(sidecar.models)?sidecar.models:[]};
}

/** Normalize a simple local web-model metadata bundle for the link manager. */
export function normalizeModelMetadata(data,fileName='model.json'){
  const source=data?.model||data||{};
  const modelKey=String(source.modelKey||source.model_id||source.id||source.guid||fileName.replace(/\.json$/i,'')).trim();
  const name=String(source.name||source.modelName||source.title||modelKey);
  const version=String(source.version||source.revision||source.modelVersion||'');
  const rawObjects=Array.isArray(source.objects)?source.objects:Array.isArray(data?.objects)?data.objects:[];
  const objects=rawObjects.map((o,i)=>{
    const objectId=String(o.externalId||o.external_id||o.sourceGuid||o.guid||o.uniqueId||o.id||'').trim();
    if(!objectId)return null;
    return {objectId,name:String(o.name||o.displayName||o.label||`Object ${i+1}`),category:String(o.category||o.type||''),level:String(o.level||o.storey||o.floor||''),system:String(o.system||o.systemName||''),sourceFile:String(o.sourceFile||o.file||''),path:String(o.path||o.hierarchyPath||''),properties:o.properties&&typeof o.properties==='object'?o.properties:{}};
  }).filter(Boolean);
  return {modelKey,name,version,sourceFile:String(source.sourceFile||fileName),objects};
}
