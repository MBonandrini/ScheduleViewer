import { parseScheduleText } from './format-adapters.js';
import { validateModelIntegrity } from './integrity.js';

function fmt(format){return format==='xml'?'Microsoft Project XML':'Primavera P6 XER'}
export function preflightScheduleText(text,fileName='schedule.xer',{maxMB=500,maxLines=2000000,maxLineLength=2000000,maxFields=5000}={}){
  text=String(text||'').replace(/^\uFEFF/,'');
  const issues=[],warnings=[],bytes=new Blob([text]).size,ext=(fileName.split('.').pop()||'').toLowerCase();
  if(text.includes('\u0000'))issues.push('File contains NUL bytes and may be binary or corrupt.');
  if(!String(text||'').trim())issues.push('File is empty.');
  if(bytes>maxMB*1024*1024)issues.push(`File exceeds configured ${maxMB} MB import limit.`);
  if(ext==='xer'){
    const lines=text.replace(/\r\n?/g,'\n').split('\n');let current='',fields=[];const tables=new Set();
    if(lines.length>maxLines)issues.push(`File contains ${lines.length.toLocaleString()} lines, exceeding the configured safety limit of ${maxLines.toLocaleString()}.`);
    const overlong=lines.findIndex(l=>l.length>maxLineLength);if(overlong>=0)issues.push(`Line ${overlong+1} exceeds the configured maximum line length.`);
    if(!lines.some(l=>l.startsWith('ERMHDR\t')))warnings.push('ERMHDR header was not found.');
    lines.forEach((line,i)=>{if(line.startsWith('%T\t')){current=line.split('\t')[1]||'';fields=[];if(current)tables.add(current);else warnings.push(`Line ${i+1}: missing table name.`)}else if(line.startsWith('%F\t')){fields=line.split('\t').slice(1);if(fields.length>maxFields)issues.push(`Line ${i+1}: ${current||'table'} declares ${fields.length} fields, exceeding the safety limit of ${maxFields}.`);}else if(line.startsWith('%R\t')){if(!current)warnings.push(`Line ${i+1}: record outside table.`);else if(!fields.length)warnings.push(`Line ${i+1}: record before fields in ${current}.`);else{const n=line.split('\t').length-1;if(n!==fields.length)warnings.push(`Line ${i+1}: ${current} has ${n} values for ${fields.length} fields.`)}}});
    if(!tables.has('TASK'))warnings.push('TASK table is not present.');
    if(!tables.has('PROJECT'))warnings.push('PROJECT table is not present.');
  }else if(ext==='xml'){
    if(!/^\s*<\?xml|^\s*<Project\b|<Project\b/i.test(String(text||'')))warnings.push('XML does not contain an obvious Project root element.');
  }
  return {fileName,format:ext==='xml'?'xml':'xer',bytes,megabytes:bytes/1024/1024,issues,warnings,ok:issues.length===0};
}

export function diagnoseImportedSchedule(text,fileName='schedule.xer',options={}){
  const preflight=preflightScheduleText(text,fileName,options);if(!preflight.ok)return {...preflight,model:null,integrity:null,parserWarnings:[]};
  try{const model=parseScheduleText(text,fileName),projectId=model.table('PROJECT')[0]?.proj_id||model.table('TASK')[0]?.proj_id||null,integrity=validateModelIntegrity(model,{projectId});return {...preflight,model,integrity,parserWarnings:[...(model.warnings||[])],ok:preflight.ok&&!integrity.counts?.errors};}catch(error){return {...preflight,ok:false,model:null,integrity:null,parserWarnings:[],issues:[...preflight.issues,error.message]};}
}
