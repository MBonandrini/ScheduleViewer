import { compareModels } from './compare.js';
function cloneModel(model){return structuredClone({sourceFormat:model.sourceFormat,header:model.header,tables:[...model.tables.entries()].map(([n,t])=>[n,{name:t.name,fields:[...t.fields],rows:t.rows.map(r=>({...r}))}])})}
export function snapshotModel(model,label='Snapshot'){return {id:`rev-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,label,at:new Date().toISOString(),payload:cloneModel(model)}}
export function restoreSnapshot(snapshot,ModelCtor){const x=snapshot.payload;return new ModelCtor({header:x.header,tables:new Map(x.tables),warnings:[],sourceText:''})}
export function revisionDiff(current,currentProj,snapshotModel,snapProj){return compareModels(snapshotModel,snapProj,current,currentProj)}
export function loadRevisionMeta(key='uss-revisions'){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
export function saveRevisionMeta(items,key='uss-revisions'){localStorage.setItem(key,JSON.stringify(items.slice(-100)))}
