import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parseXER, XERModel} from '../src/parser.js';
import {serializeXER} from '../src/serializer.js';
import {semanticFingerprint} from '../src/determinism.js';
import {calculateCPM, detectCycles} from '../src/cpm.js';
import {scheduleAssurance, assuranceCheck} from '../src/v7-schedule-assurance.js';
import {runQSRA} from '../src/v7-risk-engine.js';
import {applyFilterGroup} from '../src/filters.js';
import {defaultLayout, normalizeLayout, exportLayout, importLayout} from '../src/layouts.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const sample=()=>parseXER(fs.readFileSync(path.join(root,'sample/sample-project.xer'),'utf8'));

test('sample XER round-trips without semantic mutation',()=>{
 const m=sample();
 const before=semanticFingerprint(m);
 const text=serializeXER(m);
 const m2=parseXER(text);
 assert.equal(semanticFingerprint(m2),before);
 assert.equal(m2.table('TASK').length,5);
 assert.equal(m2.table('TASKPRED').length,4);
});

test('sample deterministic CPM calculates without cycles',()=>{
 const m=sample();
 assert.equal(detectCycles(m,'P1').length,0);
 const c=calculateCPM(m,'P1',{hoursPerDay:8,dataDate:'2026-02-13 17:00'});
 assert.ok(c.projectFinish instanceof Date);
 assert.equal(c.invalidRelationships?.length||0,0);
});

test('assurance catalogue catches explicit P6-style integrity defects',()=>{
 const m=sample();
 const task=m.find('TASK','task_id','3');
 task.phys_complete_pct='25'; task.act_start_date='';
 const mile=m.find('TASK','task_id','5'); mile.phys_complete_pct='50'; mile.target_drtn_hr_cnt='8';
 m.table('TASKPRED').push({...m.table('TASKPRED')[0]}); m.indexes.clear();
 const a=scheduleAssurance(m,'P1',{hoursPerDay:8});
 assert.equal(assuranceCheck(a,'progress-no-start').status,'fail');
 assert.equal(assuranceCheck(a,'milestone-pct').status,'fail');
 assert.equal(assuranceCheck(a,'milestone-duration').status,'fail');
 assert.equal(assuranceCheck(a,'duplicate-rel').status,'fail');
});

test('advanced filter operators cover text, sets, numeric ranges, dates and blanks',()=>{
 const rows=[{s:'Alpha Beta',n:5,d:'2026-02-10',blank:''},{s:'Gamma',n:12,d:'2026-03-15',blank:'x'}];
 const cases=[
  ['contains','s','beta','Alpha Beta'],['notcontains','s','beta','Gamma'],['startswith','s','alp','Alpha Beta'],['endswith','s','mma','Gamma'],
  ['in','s','Gamma,Delta','Gamma'],['notin','s','Gamma,Delta','Alpha Beta'],['gt','n','10','Gamma'],['gte','n','12','Gamma'],['lt','n','10','Alpha Beta'],['lte','n','5','Alpha Beta'],
  ['between','n','4,6','Alpha Beta'],['before','d','2026-03-01','Alpha Beta'],['after','d','2026-03-01','Gamma'],['blank','blank','','Alpha Beta'],['notblank','blank','','Gamma'],['regex','s','^Gamma$','Gamma']
 ];
 for(const [op,field,value,expected] of cases){const out=applyFilterGroup(rows,{mode:'AND',rules:[{field,op,value}]});assert.equal(out.length,1,op);assert.equal(out[0].s,expected,op)}
});

test('layout JSON round-trip preserves V7 bars, fields and widths',()=>{
 const l=normalizeLayout({...defaultLayout(),id:'planner',name:'Planner',columns:['task_code','task_name'],columnWidths:{task_name:333},barSettings:{normalColor:'#123456',labelMode:'id-name',barHeight:16}});
 const out=importLayout(exportLayout(l));
 assert.deepEqual(out.columns,l.columns);
 assert.equal(out.columnWidths.task_name,333);
 assert.equal(out.barSettings.normalColor,'#123456');
 assert.equal(out.barSettings.labelMode,'id-name');
 assert.equal(out.barSettings.barHeight,16);
});

test('all V7 QSRA distributions produce ordered percentiles',()=>{
 for(const distribution of ['triangular','pert','uniform','normal']){
  const r=runQSRA(sample(),'P1',{iterations:300,seed:99,distribution,minFactor:.9,modeFactor:1,maxFactor:1.25});
  assert.equal(r.error,undefined,distribution);
  assert.ok(r.p10<=r.p50 && r.p50<=r.p80 && r.p80<=r.p90,distribution);
  assert.equal(r.histogram.reduce((s,x)=>s+x.count,0),300,distribution);
 }
});

test('parser tolerates 250 fuzzed record-value combinations without losing table structure',()=>{
 let seed=123456789;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 const chars='ABCxyz0123 -_/&<>';
 for(let i=0;i<250;i++){
  let value='';for(let j=0;j<25;j++)value+=chars[Math.floor(rnd()*chars.length)];
  value=value.replace(/[\t\r\n]/g,' ');
  const x=`ERMHDR\t8.4\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\tP${i}\t${value}\n%T\tTASK\n%F\tproj_id\ttask_id\ttask_code\ttask_name\n%R\tP${i}\t1\tA${i}\t${value}\n%E`;
  const m=parseXER(x);assert.equal(m.table('PROJECT').length,1);assert.equal(m.table('TASK').length,1);assert.equal(m.table('TASK')[0].task_id,'1');
 }
});
