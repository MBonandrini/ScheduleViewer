import {db,ensureProject} from '../repository/db.js';
import {parseXER} from '../parsers/xer.js';
/** A repeatable projection of Studio-owned sources, separate from user-added evidence. */
export async function syncStudioSources(sources, projectId) {
  const workspace=await ensureProject();
  const existing=await db.all('files');
  const keep=new Set(); let selected=null;
  for(const source of sources){
    if(typeof source.text!=='string'||typeof source.id!=='string') throw new Error('Invalid schedule snapshot');
    const id=`studio:${workspace.id}:${source.id}`; keep.add(id);
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source.text))),n=>n.toString(16).padStart(2,'0')).join('');
    const old=existing.find(f=>f.id===id);
    if(old?.fingerprint!==fingerprint){
      const parsed=parseXER(source.text,source.name);
      // Parse successfully before touching existing repository records.
      const schedules=parsed.schedules.filter(s=>!source.projectId||String(s.projectId)===String(source.projectId)).map(s=>({...s,id:`${id}:${s.projectId}`,studioProjectId:s.projectId,originalProjectId:s.projectId,projectId:workspace.id,sourceFileId:id,sourceName:source.name,studioSource:source.id}));
      for(const s of schedules) await db.put('schedules',s);
      const scheduleIds=new Set(schedules.map(s=>s.id));
      for(const s of await db.all('schedules')) if(s.sourceFileId===id&&!scheduleIds.has(s.id)) await db.del('schedules',s.id);
      await db.put('files',{id,projectId:workspace.id,name:source.name,source:'studio',category:source.role||'Viewer schedule',checked:old?.checked??true,fingerprint,blob:new Blob([source.text],{type:'text/plain'}),size:new Blob([source.text]).size,relativePath:source.name,updatedAt:new Date().toISOString()});
    }
    if(source.id==='current') selected=`${id}:${projectId}`;
  }
  // Never remove uploaded evidence, risks, claims or standalone schedules.
  for(const f of existing) if(f.projectId===workspace.id&&f.source==='studio'&&!keep.has(f.id)){
    await db.del('files',f.id);
    for(const s of await db.all('schedules')) if(s.sourceFileId===f.id) await db.del('schedules',s.id);
  }
  return selected;
}
