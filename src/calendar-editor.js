import { parseCalendarData } from './semantic.js';
import { ensureTable, touch } from './editor.js';
import { p6Date } from './parser.js';

const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MS_DAY=86400000;

export function p6SerialToDate(value){
  const n=Number(value);if(!Number.isFinite(n))return null;
  const d=new Date(1899,11,30);d.setDate(d.getDate()+n);return d;
}
export function dateToP6Serial(value){const d=p6Date(value);if(!d)return '';const base=new Date(1899,11,30);return String(Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-base)/MS_DAY));}

export function decodeCalendar(raw=''){
  const parsed=parseCalendarData(raw),week={};
  for(const name of DAY_NAMES)week[name]=(parsed.days.find(x=>x.day===name)?.periods||[]).map(p=>({...p}));
  return {week,exceptions:{...parsed.exceptionPeriods},exceptionDates:[...parsed.exceptions],raw};
}

function periodString(periods=[]){return periods.map((p,i)=>`      (0||${i}(s|${p.start}|f|${p.finish})())`).join('\x7f\x7f')}
export function encodeCalendarData({week={},exceptions={}}={}){
  const days=DAY_NAMES.map((name,i)=>{const periods=week[name]||[];return periods.length?`    (0||${i+1}()(\x7f\x7f${periodString(periods)}))`:`    (0||${i+1}()())`}).join('\x7f\x7f');
  const ex=Object.entries(exceptions).sort(([a],[b])=>a.localeCompare(b)).map(([date,periods],i)=>{const serial=dateToP6Serial(date)||date;return (periods||[]).length?`    (0||${i}(d|${serial})(\x7f\x7f${periodString(periods)}))`:`    (0||${i}(d|${serial})())`}).join('\x7f\x7f');
  return `(0||CalendarData()(\x7f\x7f  (0||DaysOfWeek()(\x7f\x7f${days}))\x7f\x7f  (0||VIEW(ShowTotal|N)())\x7f\x7f  (0||Exceptions()(${ex?'\x7f\x7f'+ex:''}))))`;
}

export function normalizeCalendarExceptions(raw=''){
  const result={},numeric=[...String(raw).matchAll(/d\|(\d+)([^d]*?)(?=d\|\d+|$)/g)];
  for(const m of numeric){const d=p6SerialToDate(m[1]);if(!d)continue;const key=d.toISOString().slice(0,10);const periods=[...String(m[2]||'').matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));result[key]=periods;}
  const iso=[...String(raw).matchAll(/d\|(\d{4}-\d{2}-\d{2})([^d]*?)(?=d\|\d{4}-\d{2}-\d{2}|$)/g)];for(const m of iso){const periods=[...String(m[2]||'').matchAll(/s\|([^|()]+)\|f\|([^|()]+)/g)].map(x=>({start:x[1],finish:x[2]}));result[m[1]]=periods;}
  return result;
}

export function calendarDefinition(model,calendarId){
  const c=model.find('CALENDAR','clndr_id',String(calendarId));if(!c)return null;
  const decoded=decodeCalendar(c.clndr_data||'');decoded.exceptions={...normalizeCalendarExceptions(c.clndr_data||''),...decoded.exceptions};decoded.exceptionDates=Object.keys(decoded.exceptions).sort();
  return {calendar:c,...decoded};
}

export function calendarHours(periods=[]){return periods.reduce((sum,p)=>{const [sh,sm]=String(p.start||'0:0').split(':').map(Number),[fh,fm]=String(p.finish||'0:0').split(':').map(Number);return sum+Math.max(0,(fh*60+fm-sh*60-sm)/60)},0)}

export function updateCalendarDefinition(model,calendarId,{name,type,week,exceptions}={}){
  const c=model.find('CALENDAR','clndr_id',String(calendarId));if(!c)throw new Error('Calendar not found.');
  if(name!=null)c.clndr_name=name;if(type!=null)c.clndr_type=type;
  if(week||exceptions){const current=calendarDefinition(model,calendarId),w=week||current.week,e=exceptions||current.exceptions;c.clndr_data=encodeCalendarData({week:w,exceptions:e});const weekly=DAY_NAMES.reduce((s,d)=>s+calendarHours(w[d]||[]),0);c.week_hr_cnt=String(weekly);const working=DAY_NAMES.map(d=>calendarHours(w[d]||[])).filter(h=>h>0);c.day_hr_cnt=String(working.length?Math.max(...working):0);}
  touch(model);return c;
}

export function addCalendar(model,{name='New Calendar',type='CA_Base',week=null}={}){
  const t=ensureTable(model,'CALENDAR',['clndr_id','default_flag','clndr_name','proj_id','base_clndr_id','last_chng_date','clndr_type','day_hr_cnt','week_hr_cnt','month_hr_cnt','year_hr_cnt','rsrc_private','clndr_data']);
  let max=0;for(const r of t.rows){const n=Number(r.clndr_id);if(Number.isFinite(n))max=Math.max(max,n)}const id=String(max+1);
  const defaultWeek=week||Object.fromEntries(DAY_NAMES.map((d,i)=>[d,(i>=1&&i<=5)?[{start:'08:00',finish:'12:00'},{start:'13:00',finish:'17:00'}]:[]]));
  const row=Object.fromEntries(t.fields.map(f=>[f,'']));Object.assign(row,{clndr_id:id,clndr_name:name,clndr_type:type,day_hr_cnt:'8',week_hr_cnt:'40',month_hr_cnt:'172',year_hr_cnt:'2080',clndr_data:encodeCalendarData({week:defaultWeek,exceptions:{}})});t.rows.push(row);touch(model);return row;
}

export function projectDateRange(model,projId){
  const tasks=(model.table('TASK')||[]).filter(t=>!projId||String(t.proj_id)===String(projId));const dates=[];
  for(const t of tasks)for(const v of [t.target_start_date,t.early_start_date,t.act_start_date,t.target_end_date,t.early_end_date,t.act_end_date]){const d=p6Date(v);if(d)dates.push(d.getTime())}
  return dates.length?{start:new Date(Math.min(...dates)),finish:new Date(Math.max(...dates))}:{start:new Date(),finish:new Date()};
}

export function calendarDayStatus(def,date){
  const d=p6Date(date);if(!d)return {working:false,periods:[],exception:false};const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if(Object.prototype.hasOwnProperty.call(def.exceptions,key)){const periods=def.exceptions[key]||[];return {working:periods.length>0,periods,exception:true,key};}
  const periods=def.week[DAY_NAMES[d.getDay()]]||[];return {working:periods.length>0,periods,exception:false,key};
}
