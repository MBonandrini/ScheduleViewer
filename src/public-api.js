/** Browser API: caller-owned inputs only. No repository, AI, storage or network access. */
import {parseScheduleText} from './format-adapters.js';
import {buildComparisonReport} from './comparison-report.js';
import {comparisonReportHTML} from './comparison-view.js';
import {runQSRA} from './v7-risk-engine.js';
import {calendarYearData,progressRows,resourceBreakdown,lookaheadRows} from './enterprise-data.js';
import {taskRows,predRows,getDataDate,taskFinish} from './semantic.js';
import {escapeHtml} from './parser.js';
export const API_VERSION='1.0.0';
export function loadSchedule({text,name='schedule.xer',scheduleIndex=1}={}){
 if(typeof text!=='string'||text.length>20*1024*1024)throw Error('Supply schedule text up to 20 MiB.');
 if(!Number.isInteger(scheduleIndex)||scheduleIndex<1)throw Error('scheduleIndex must be a positive integer.');
 const model=parseScheduleText(text,name),projects=model.table('PROJECT'),project=projects[scheduleIndex-1];if(!project)throw Error('Schedule index outside file PROJECT order.');
 return {model,projectId:String(project.proj_id),name:project.proj_short_name||project.proj_name||String(project.proj_id)};
}
export function listSchedules(input){const {model}=loadSchedule(input);return model.table('PROJECT').map((p,i)=>({scheduleIndex:i+1,projectId:p.proj_id,name:p.proj_short_name||p.proj_name||p.proj_id}));}
export function reportHTML(title,rows){const fields=[...new Set(rows.flatMap(Object.keys))].filter(k=>!rows.some(r=>r[k]&&typeof r[k]==='object'));return '<!doctype html><meta charset="utf-8"><title>'+escapeHtml(title)+'</title><style>body{font:14px system-ui;margin:30px;color:#16324a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd8e2;padding:8px;text-align:left}th{background:#edf3f8}</style><h1>'+escapeHtml(title)+'</h1><table><thead><tr>'+fields.map(k=>'<th>'+escapeHtml(k)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+fields.map(k=>'<td>'+escapeHtml(r[k]??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
export async function generateReport({report='summary',source,reference,options={}}={}){
 const {model,projectId,name}=loadSchedule(source);let result,rows;
 switch(report){
 case 'summary':{const tasks=taskRows(model,projectId),dates=tasks.map(taskFinish).filter(Boolean);result={name,projectId,activities:tasks.length,relationships:predRows(model,projectId).length,dataDate:getDataDate(model,projectId),finish:dates.reduce((a,b)=>!a||b>a?b:a,null)?.toISOString()||null,critical:tasks.filter(t=>t.total_float_hr_cnt!==''&&t.total_float_hr_cnt!=null&&Number(t.total_float_hr_cnt)<=0).length};rows=[result];break;}
 case 'revision-changes':{const old=loadSchedule(reference);result=buildComparisonReport(old.model,model,{previousProject:old.projectId,currentProject:projectId,...options});return {apiVersion:API_VERSION,report,result,html:'<!doctype html><meta charset="utf-8">'+comparisonReportHTML(result)};}
 case 'progress':result=progressRows(model,projectId,options);rows=result;break;
 case 'resources':result=resourceBreakdown(model,projectId,options);rows=result;break;
 case 'lookahead':result=lookaheadRows(model,projectId,options);rows=result;break;
 case 'calendar':result=calendarYearData(model,options.calendarId,+options.year);rows=result.days.map(({periods,...r})=>({...r,shifts:periods.map(p=>p.join('–')).join('; ')}));break;
 case 'risk':if(taskRows(model,projectId).length*Math.min(Number(options.iterations)||1000,50000)>20000000)throw Error('API risk workload exceeds 20 million task-trials. Reduce iterations or schedule size.');result=runQSRA(model,projectId,options);if(result.error)throw Error(result.error);rows=[{p50:result.p50,p80:result.p80,p90:result.p90,contingencyP80:result.contingencyP80,targetConfidence:result.targetConfidence,basis:result.assumptions.calendarBasis}];break;
 default:throw Error('Unknown report. Use summary, revision-changes, progress, resources, lookahead, calendar or risk.');
 }
 return {apiVersion:API_VERSION,report,result,html:reportHTML(report+' — '+name,rows)};
}
