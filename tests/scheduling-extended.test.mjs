import test from 'node:test';
import assert from 'node:assert/strict';
import {model} from './helpers/model.mjs';
import {p6Date} from '../src/parser.js';
import {calculateCPM,applyCPM,buildCalendar,addWorkHours,subtractWorkHours,workHoursBetween,detectCycles,fmtP6} from '../src/cpm.js';
import {encodeCalendarData,decodeCalendar} from '../src/calendar-editor.js';
import {runQSRA} from '../src/v7-risk-engine.js';
const week=Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>[d,[{start:'00:00',finish:'24:00'}]]));
const calendar={clndr_id:'C',clndr_data:encodeCalendarData({week}),day_hr_cnt:'24'};
const full=(tasks,rels)=>model(tasks,rels,{CALENDAR:[calendar]});
for(const [type,lag,expected] of [['FS',0,24],['FS',8,32],['FS',-8,16],['SS',0,0],['SS',8,8],['FF',0,16],['FF',8,24],['SF',16,8]])test(`CPM ${type} lag ${lag} forward/backward`,()=>{
 const m=full([{remain_drtn_hr_cnt:'24'},{remain_drtn_hr_cnt:'8'}],[{pred_task_id:'1',task_id:'2',pred_type:`PR_${type}`,lag_hr_cnt:String(lag)}]);
 const c=calculateCPM(m,'P'),a=c.results[0],b=c.results[1];
 assert.equal((b.es-c.dataDate)/3600000,expected);
 for(const r of c.results){assert.ok(r.ls>=r.es);assert.ok(r.lf>=r.ef);assert.equal(workHoursBetween(buildCalendar(m,'C'),r.es,r.ef),r.duration)}
});
test('FS finish milestone remains at predecessor finish',()=>{const m=model([{}, {task_type:'TT_FinMile',remain_drtn_hr_cnt:'0',target_drtn_hr_cnt:'0'}],[{pred_task_id:'1',task_id:'2'}]);const c=calculateCPM(m,'P');assert.equal(+c.results[0].ef,+c.results[1].ef)});
test('calendar split shifts, weekend and holiday arithmetic',()=>{
 const weekdays=Object.fromEntries(['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d=>[d,[{start:'08:00',finish:'12:00'},{start:'13:00',finish:'17:00'}]]));
 const raw=encodeCalendarData({week:weekdays,exceptions:{'2026-01-12':[],'2026-01-13':[{start:'08:00',finish:'12:00'}]}});
 const m=model([],[],{CALENDAR:[{clndr_id:'C',clndr_data:raw}]}),c=buildCalendar(m,'C'),start=p6Date('2026-01-09 08:00'),end=addWorkHours(c,start,16);
 assert.equal(fmtP6(end),'2026-01-14 12:00');assert.equal(workHoursBetween(c,start,end),16);assert.equal(+subtractWorkHours(c,end,16),+start);
 assert.deepEqual(decodeCalendar(raw).exceptions['2026-01-12'],[]);
});
test('finish-by date creates negative total float',()=>{const c=calculateCPM(full([{remain_drtn_hr_cnt:'48'}],[]),'P',{floatMode:'finishBy',finishBy:'2026-01-06 08:00'});assert.equal(c.results[0].totalFloat,-24)});
test('cycles are rejected without mutating model',()=>{const m=model([{},{}],[{pred_task_id:'1',task_id:'2'},{pred_task_id:'2',task_id:'1'}]);assert.equal(detectCycles(m,'P').length,1);assert.throws(()=>calculateCPM(m,'P'),/cycle/);assert.match(runQSRA(m,'P').error,/cycle/)});
test('retained logic differs from progress override for started successor',()=>{const m=full([{remain_drtn_hr_cnt:'48'},{status_code:'TK_Active',act_start_date:'2026-01-01 08:00'}],[{pred_task_id:'1',task_id:'2'}]);const a=calculateCPM(m,'P',{outOfSequenceMode:'retainedLogic'}),b=calculateCPM(m,'P',{outOfSequenceMode:'progressOverride'});assert.equal((a.results[1].es-b.results[1].es)/3600000,48)});
test('completed actuals preserved by applyCPM',()=>{const m=full([{status_code:'TK_Complete',act_start_date:'2026-01-01 08:00',act_end_date:'2026-01-02 08:00'}],[]);applyCPM(m,'P',calculateCPM(m,'P'));assert.equal(m.table('TASK')[0].act_end_date,'2026-01-02 08:00')});
test('external predecessor stored dates and ignore modes',()=>{const m=full([{task_id:'1',proj_id:'Q',target_start_date:'2026-01-08 08:00',target_end_date:'2026-01-09 08:00'},{task_id:'2'}],[{pred_task_id:'1',task_id:'2'}]);const a=calculateCPM(m,'P',{externalRelationshipMode:'storedDates'}),b=calculateCPM(m,'P',{externalRelationshipMode:'ignore'});assert.ok(a.results[0].es>b.results[0].es)});
test('200 randomized DAGs match independent 24h forward-pass oracle',()=>{
 let seed=29;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(let k=0;k<200;k++){
  const tasks=Array.from({length:12},()=>({remain_drtn_hr_cnt:String(1+Math.floor(random()*20))})),rels=[],starts=[],finishes=[];
  for(let s=0;s<tasks.length;s++){let start=0;const dur=+tasks[s].remain_drtn_hr_cnt;
   for(let p=0;p<s;p++)if(random()<.18){const type=['FS','SS','FF','SF'][Math.floor(random()*4)],lag=Math.floor(random()*17)-4;rels.push({pred_task_id:String(p+1),task_id:String(s+1),pred_type:`PR_${type}`,lag_hr_cnt:String(lag)});const endpoint=type[0]==='F'?finishes[p]:starts[p];start=Math.max(start,endpoint+lag-(type[1]==='F'?dur:0))}
   starts.push(start);finishes.push(start+dur);
  }
  const m=full(tasks,rels),c=calculateCPM(m,'P');for(const r of c.results){const i=+r.task_id-1;assert.equal((r.es-c.dataDate)/3600000,starts[i],`case ${k} activity ${i}`);assert.equal((r.ef-c.dataDate)/3600000,finishes[i]);}
  const q=runQSRA(m,'P',{iterations:100,minFactor:1,modeFactor:1,maxFactor:1});assert.ok(Math.abs(q.p50-Math.max(...finishes)/24)<1e-10);
 }
});
test('Beta-PERT sample mean and lower-tail mass match expected shape',()=>{
 const r=runQSRA(full([{remain_drtn_hr_cnt:'24'}],[]),'P',{iterations:50000,seed:37,distribution:'pert',minFactor:0,modeFactor:.1,maxFactor:1});
 const expected=(0+4*.1+1)/6;assert.ok(Math.abs(r.meanDays-expected)<.005);assert.ok(r.minDays>=0&&r.maxDays<=1);
 // Distribution mass below 0.05 is material for Beta(1.4,4.6), unlike the previous clipped-normal surrogate.
 assert.ok(r.histogram[0].count>1000);assert.ok(r.histogram[0].count<10000);
});
test('explicit all-nonworking calendar fails instead of inventing weekdays',()=>{const m=model([{}],[],{CALENDAR:[{clndr_id:'C',clndr_data:encodeCalendarData({week:{}})}]});assert.throws(()=>calculateCPM(m,'P'),/No working time/)});
for(const [constraint,date,field] of [['CS_SNET','2026-01-10 08:00','es'],['CS_FNET','2026-01-10 08:00','ef'],['CS_MSO','2026-01-10 08:00','es'],['CS_MEO','2026-01-10 08:00','ef']])test(`constraint ${constraint} respected`,()=>{const c=calculateCPM(full([{cstr_type:constraint,cstr_date:date}],[]),'P');assert.equal(fmtP6(c.results[0][field]),date)});
test('suspended activity waits for explicit resume and strict mode rejects missing resume',()=>{const m=full([{status_code:'TK_Active',act_start_date:'2026-01-01 08:00',suspend_date:'2026-01-02 08:00',resume_date:'2026-01-10 08:00'}],[]);assert.equal(fmtP6(calculateCPM(m,'P').results[0].es),'2026-01-10 08:00');m.table('TASK')[0].resume_date='';assert.throws(()=>calculateCPM(m,'P',{suspendResumeMode:'strict'}),/resume date/)});
test('resource leveling separates two tasks sharing one-unit capacity',()=>{const m=full([{},{}],[]);m.tables.set('RSRC',{name:'RSRC',fields:['rsrc_id','max_qty_per_hr'],rows:[{rsrc_id:'R',max_qty_per_hr:'1'}]});m.tables.set('TASKRSRC',{name:'TASKRSRC',fields:['task_id','rsrc_id','remain_qty'],rows:[{task_id:'1',rsrc_id:'R',remain_qty:'8'},{task_id:'2',rsrc_id:'R',remain_qty:'8'}]});const c=calculateCPM(m,'P',{resourceLevelingEnabled:true});assert.ok(c.results[1].es>=c.results[0].ef);assert.equal(c.leveling.conflicts.filter(x=>x.unresolved).length,0)});
