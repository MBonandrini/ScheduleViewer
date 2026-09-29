import {db,ensureProject,createProject} from './db.js';
import {getFileBlob} from './repository.js';
const bytesTo64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s)};
const dataPrefs=['quantities','measurement','builder','builderWizard','manpower','issueRows','qaProfileId','qaCustomThresholds','baselineSlots'];
export async function exportAIWorkspace(){
 const project=await ensureProject(),files=[];
 for(const record of await db.all('files'))if(record.projectId===project.id&&record.source!=='studio'){
  const blob=await getFileBlob(record.id);if(!blob)throw new Error(`Cannot back up ${record.name}: re-authorise its linked folder first.`);
  const {handle,blob:unused,...meta}=record;files.push({...meta,data:bytesTo64(new Uint8Array(await blob.arrayBuffer()))});
 }
 const ids=new Set(files.map(f=>f.id));const prefs={};
 for(const key of dataPrefs){const v=localStorage.getItem('studio8.ai.'+key+':'+project.id);if(v!==null)prefs[key]=v;}
 return {schema:'studio8-ai-workspace',version:1,project,files,schedules:(await db.all('schedules')).filter(s=>ids.has(s.sourceFileId)),risks:(await db.all('risks')).filter(x=>x.projectId===project.id),claims:(await db.all('claims')).filter(x=>x.projectId===project.id),prefs};
}
export async function importAIWorkspace(data){
 if(data?.schema!=='studio8-ai-workspace'||data.version!==1||!Array.isArray(data.files)||!Array.isArray(data.schedules)||!Array.isArray(data.risks)||!Array.isArray(data.claims))throw new Error('Invalid AI workspace backup.');
 // Decode/validate before creating a new workspace; never overwrite an existing workspace.
 const files=data.files.map(f=>{if(typeof f.name!=='string'||typeof f.data!=='string'||!f.id)throw new Error('Invalid backed-up file.');return {...f,decoded:Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))}});
 const project=await createProject((data.project?.name||'Project')+' (restored)');const ids=new Map();
 for(const f of files){const id=crypto.randomUUID();ids.set(f.id,id);const {data:encoded,decoded,folderKey,handle,...meta}=f;await db.put('files',{...meta,id,projectId:project.id,source:'restored',blob:new Blob([decoded],{type:f.type||''})});}
 for(const s of data.schedules)if(ids.has(s.sourceFileId))await db.put('schedules',{...s,id:crypto.randomUUID(),projectId:project.id,sourceFileId:ids.get(s.sourceFileId)});
 for(const store of ['risks','claims'])for(const row of data[store])await db.put(store,{...row,id:crypto.randomUUID(),projectId:project.id});
 for(const key of dataPrefs)if(typeof data.prefs?.[key]==='string'){
  // Remap file references embedded in measurement/manpower preferences.
  let value=data.prefs[key];for(const [old,id]of ids)value=value.split(old).join(id);
  localStorage.setItem('studio8.ai.'+key+':'+project.id,value);
 }
 return project;
}
