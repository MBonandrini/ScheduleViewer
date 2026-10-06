import {XERModel} from './parser.js';
import {exportXER,exportMSPXML,conversionAudit} from './format-adapters.js';
import {serializeProjectPackage} from './project-package.js';
import {validateModelIntegrity,integritySummary,isExternalWBSRoot} from './integrity.js';

export const SAVE_FORMATS={
  xer:{label:'Primavera P6 XER',extension:'.xer',mime:'text/plain',scope:'All loaded projects and shared dictionaries'},
  mspxml:{label:'Microsoft Project XML',extension:'.xml',mime:'application/xml',scope:'Selected project; conversion limitations apply'},
  package:{label:'Schedule Studio Project Package',extension:'.ussproj',mime:'application/json',scope:'Complete workspace, settings, baselines and revisions'}
};
export function saveFileName(value,format){
  const spec=SAVE_FORMATS[format];if(!spec)throw new Error('Choose a supported save format.');
  let name=String(value||'').trim();
  if(!name||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/^\.+$/.test(name))throw new Error('Enter a filename, without folder separators or reserved characters.');
  name=name.replace(/\.(xer|xml|ussproj|json)$/i,'').replace(/[. ]+$/,'');
  if(!name||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))throw new Error('Choose a non-reserved filename.');
  return name+spec.extension;
}
export function prepareSave(model,{format='xer',fileName='schedule',projectId=null,packageData=null}={}){
  const name=saveFileName(fileName,format),spec=SAVE_FORMATS[format];
  if(format==='package'){
    if(!packageData)throw new Error('Project package data is missing.');
    return {name,format,...spec,text:serializeProjectPackage(packageData),warnings:[]};
  }
  if(format==='mspxml'&&!model.find('PROJECT','proj_id',String(projectId)))throw new Error('Choose a project before exporting Microsoft Project XML.');
  const check=validateModelIntegrity(model,{projectId:format==='xer'?null:projectId});
  if(!check.ok)throw new Error(`Save stopped because the schedule contains structural errors.\n${integritySummary(check)}\nA project package can still be saved for recovery.`);
  const exportModel=new XERModel({header:[...(model.header||[])],tables:new Map([...model.tables].map(([name,t])=>[name,{...t,fields:[...t.fields],rows:t.rows.map(r=>({...r}))}])),warnings:[],sourceText:''});exportModel.sourceFormat=model.sourceFormat;
  const exportedWbsIds=new Set(exportModel.table('PROJWBS').map(w=>String(w.wbs_id)));
  for(const w of exportModel.table('PROJWBS'))if(w.parent_wbs_id&&!exportedWbsIds.has(String(w.parent_wbs_id))&&isExternalWBSRoot(exportModel,w))w.parent_wbs_id='';
  const text=format==='xer'?exportXER(exportModel):exportMSPXML(exportModel,projectId);
  const warnings=conversionAudit(model,format).warnings;
  return {name,format,...spec,text,warnings};
}
/** A download request is not a confirmed save; cancellation never falls back to download. */
export async function writeSave(payload,{handle=null,picker=globalThis.showSaveFilePicker?.bind(globalThis),download}={}){
  try{
    if(!handle&&picker)handle=await picker({suggestedName:payload.name,types:[{description:payload.label,accept:{[payload.mime]:[payload.extension]}}],excludeAcceptAllOption:true});
    if(handle){
      if(typeof handle.createWritable!=='function')throw new Error('The selected file is not writable. Use Save As to choose a new file.');
      // Some browsers let users type a conflicting extension despite the picker filter.
      if(handle.name&&!handle.name.toLowerCase().endsWith(payload.extension))throw new Error(`Choose a filename ending in ${payload.extension}. No file was written.`);
      const writer=await handle.createWritable();
      try{await writer.write(payload.text);await writer.close();}catch(error){try{await writer.abort?.();}catch{}throw error;}
      return {status:'saved',handle,name:handle.name||payload.name};
    }
    if(!download)throw new Error('No save or download capability is available.');
    await download(payload.name,payload.text,payload.mime+';charset=utf-8');
    return {status:'downloaded',name:payload.name,handle:null};
  }catch(error){if(error?.name==='AbortError')return {status:'cancelled',handle:null};throw error;}
}
