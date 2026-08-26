import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parseXER } from '../src/parser.js';
import { addTask, addRelationship } from '../src/editor.js';
import { buildCalendar, shiftWorkHours, calculateCPM, applyCPM, detectCycles } from '../src/cpm.js';
import { serializeXER } from '../src/serializer.js';

const current=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(current);
const dt=s=>new Date(s.replace(' ','T'));

function result(calc,id){const r=calc.results.find(x=>x.task_id===String(id));assert.ok(r,`missing result ${id}`);return r}

function addSevenDayCalendar(m,id='200'){
  const t=m.tables.get('CALENDAR');
  const row=Object.fromEntries(t.fields.map(f=>[f,'']));
  Object.assign(row,{clndr_id:id,clndr_name:'7 Day / 8 Hour',clndr_type:'CA_Project',day_hr_cnt:'8',week_hr_cnt:'56',clndr_data:'(1||(s|08:00|f|12:00)(s|13:00|f|17:00))(2||(s|08:00|f|12:00)(s|13:00|f|17:00))(3||(s|08:00|f|12:00)(s|13:00|f|17:00))(4||(s|08:00|f|12:00)(s|13:00|f|17:00))(5||(s|08:00|f|12:00)(s|13:00|f|17:00))(6||(s|08:00|f|12:00)(s|13:00|f|17:00))(7||(s|08:00|f|12:00)(s|13:00|f|17:00))'});
  t.rows.push(row);m.indexes=new Map();return row;
}

test('signed lag helper moves both forwards and backwards across working time',()=>{
  const m=fresh(),cal=buildCalendar(m,'100'),mon=dt('2026-08-24 17:00');
  assert.equal(shiftWorkHours(cal,mon,-4).getHours(),13);
  const plus=shiftWorkHours(cal,mon,4);assert.equal(plus.getDay(),2);assert.equal(plus.getHours(),12);
});

test('negative FS lag is honored rather than clamped to zero',()=>{
  const m=fresh();
  for(const t of m.table('TASK')) if(!['1030','1040'].includes(t.task_id)) t.proj_id='999';
  const pred=m.find('TASK','task_id','1030'),succ=m.find('TASK','task_id','1040');
  Object.assign(pred,{status_code:'TK_NotStart',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',clndr_id:'100'});
  Object.assign(succ,{status_code:'TK_NotStart',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',clndr_id:'100',cstr_type:'',cstr_date:''});
  m.tables.get('TASKPRED').rows=[{task_pred_id:'x',proj_id:'1',task_id:'1040',pred_task_id:'1030',pred_type:'PR_FS',lag_hr_cnt:'-4'}];m.indexes=new Map();
  const calc=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00'});const a=result(calc,'1030'),b=result(calc,'1040');
  assert.equal(a.ef.getHours(),17);assert.equal(b.es.getHours(),13);assert.equal(b.es.getDate(),24);
});

test('completed predecessor drives FS successor from actual finish, not actual start',()=>{
  const m=fresh();
  const calc=calculateCPM(m,'1',{dataDate:'2026-08-15 17:00'});const active=result(calc,'1020');
  assert.ok(active.es>=dt('2026-08-17 08:00'));
});

test('active activity remaining work is anchored at data date and apply writes restart/reend',()=>{
  const m=fresh(),t=m.find('TASK','task_id','1020');t.restart_date='';t.reend_date='';
  const calc=calculateCPM(m,'1',{dataDate:'2026-08-18 08:00'}),r=result(calc,'1020');
  assert.ok(r.es>=dt('2026-08-18 08:00'));applyCPM(m,'1',calc);
  assert.match(t.restart_date,/2026-08-18/);assert.ok(t.reend_date);
});

test('finish-no-earlier-than and start-no-later-than constraints affect correct endpoints',()=>{
  const m=fresh(),t=m.find('TASK','task_id','1030');
  t.cstr_type='CS_FNET';t.cstr_date='2026-10-02 17:00';t.cstr_type2='CS_SNLT';t.cstr_date2='2026-09-07 08:00';
  const calc=calculateCPM(m,'1',{dataDate:'2026-08-15 17:00'}),r=result(calc,'1030');
  assert.ok(r.ef>=dt('2026-10-02 17:00'));assert.ok(r.ls<=dt('2026-09-07 08:00'));
});

test('mandatory start pins early start even when network would otherwise push later',()=>{
  const m=fresh(),t=m.find('TASK','task_id','1030');t.cstr_type='CS_MSO';t.cstr_date='2026-08-24 08:00';
  const r=result(calculateCPM(m,'1',{dataDate:'2026-08-15 17:00'}),'1030');
  assert.equal(r.es.getTime(),dt('2026-08-24 08:00').getTime());
});

test('mixed calendars and selectable lag calendar produce deterministic different dates',()=>{
  const m=fresh();addSevenDayCalendar(m);
  for(const t of m.table('TASK')) if(!['1030','1040'].includes(t.task_id))t.proj_id='999';
  const p=m.find('TASK','task_id','1030'),s=m.find('TASK','task_id','1040');Object.assign(p,{clndr_id:'200',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',status_code:'TK_NotStart'});Object.assign(s,{clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',status_code:'TK_NotStart',cstr_type:'',cstr_date:''});
  m.tables.get('TASKPRED').rows=[{task_pred_id:'x',proj_id:'1',task_id:'1040',pred_task_id:'1030',pred_type:'PR_FS',lag_hr_cnt:'8'}];m.indexes=new Map();
  const predLag=result(calculateCPM(m,'1',{dataDate:'2026-08-21 08:00',relationshipLagCalendar:'predecessor'}),'1040');
  const succLag=result(calculateCPM(m,'1',{dataDate:'2026-08-21 08:00',relationshipLagCalendar:'successor'}),'1040');
  assert.notEqual(predLag.es.getTime(),succLag.es.getTime());
});

test('invalid relationships to missing/out-of-project activities are reported and ignored safely',()=>{
  const m=fresh();m.table('TASKPRED').push({task_pred_id:'bad',proj_id:'1',task_id:'1030',pred_task_id:'DOES_NOT_EXIST',pred_type:'PR_FS',lag_hr_cnt:'0'});m.indexes=new Map();
  const calc=calculateCPM(m,'1');assert.equal(calc.invalidRelationships.length,1);assert.equal(calc.results.length,7);
});

test('all four relationship types obey basic forward-pass endpoint invariants',()=>{
  for(const type of ['PR_FS','PR_SS','PR_FF','PR_SF']){
    const m=fresh();for(const t of m.table('TASK'))if(!['1030','1040'].includes(t.task_id))t.proj_id='999';
    const p=m.find('TASK','task_id','1030'),s=m.find('TASK','task_id','1040');Object.assign(p,{target_drtn_hr_cnt:'16',remain_drtn_hr_cnt:'16',status_code:'TK_NotStart'});Object.assign(s,{target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',status_code:'TK_NotStart',cstr_type:'',cstr_date:''});
    m.tables.get('TASKPRED').rows=[{task_pred_id:'x',proj_id:'1',task_id:'1040',pred_task_id:'1030',pred_type:type,lag_hr_cnt:'0'}];m.indexes=new Map();
    const c=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00'}),a=result(c,'1030'),b=result(c,'1040');
    if(type==='PR_FS')assert.ok(b.es>=a.ef);if(type==='PR_SS')assert.ok(b.es>=a.es);if(type==='PR_FF')assert.ok(b.ef>=a.ef);if(type==='PR_SF')assert.ok(b.ef>=a.es);
  }
});

test('serialized calculated XER reimports with calculated dates and preserves row counts',()=>{
  const m=fresh(),before=m.rowCount();const c=calculateCPM(m,'1');applyCPM(m,'1',c);const rt=parseXER(serializeXER(m));
  assert.equal(rt.rowCount(),before);assert.ok(rt.find('TASK','task_id','1040').late_end_date);
});

test('3000-activity linear schedule calculates without stack overflow or pathological delay',()=>{
  const m=fresh();m.tables.get('TASK').rows=[];m.tables.get('TASKPRED').rows=[];m.indexes=new Map();
  for(let i=1;i<=3000;i++)addTask(m,'1',{task_id:String(i),task_code:`T${i}`,task_name:`Task ${i}`,wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
  // addTask auto IDs collide with explicit task_id after row insertion only if not reset; explicit IDs remain unique here.
  m.tables.get('TASKPRED').rows=[];for(let i=2;i<=3000;i++)m.tables.get('TASKPRED').rows.push({task_pred_id:String(i-1),proj_id:'1',task_id:String(i),pred_task_id:String(i-1),pred_type:'PR_FS',lag_hr_cnt:'0'});m.indexes=new Map();
  const t0=performance.now(),c=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00'}),ms=performance.now()-t0;
  assert.equal(c.results.length,3000);assert.ok(ms<5000,`calculation took ${ms.toFixed(1)}ms`);
});

test('randomized acyclic networks calculate finite dates and late/early values',()=>{
  let seed=123456789;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
  for(let run=0;run<12;run++){
    const m=fresh();m.tables.get('TASK').rows=[];m.tables.get('TASKPRED').rows=[];m.indexes=new Map();
    for(let i=1;i<=80;i++)addTask(m,'1',{task_id:String(i),task_code:`R${i}`,task_name:`Random ${i}`,wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:String(4+Math.floor(rnd()*36)),remain_drtn_hr_cnt:String(4+Math.floor(rnd()*36))});
    let rid=1;for(let i=2;i<=80;i++){for(let k=0;k<Math.min(3,i-1);k++)if(rnd()<0.35){const p=1+Math.floor(rnd()*(i-1));m.tables.get('TASKPRED').rows.push({task_pred_id:String(rid++),proj_id:'1',task_id:String(i),pred_task_id:String(p),pred_type:['PR_FS','PR_SS','PR_FF','PR_SF'][Math.floor(rnd()*4)],lag_hr_cnt:String(Math.floor(rnd()*17)-8)})}}m.indexes=new Map();
    const c=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00'});assert.equal(c.results.length,80);for(const r of c.results){assert.ok(Number.isFinite(r.es.getTime()));assert.ok(Number.isFinite(r.ef.getTime()));assert.ok(Number.isFinite(r.totalFloat));}
  }
});

test('cycle detection handles a 10000-activity chain without recursion overflow',()=>{
  const m=fresh();m.tables.get('TASK').rows=[];m.tables.get('TASKPRED').rows=[];m.indexes=new Map();
  for(let i=1;i<=10000;i++)addTask(m,'1',{task_id:String(i),task_code:`L${i}`,task_name:`Large ${i}`,wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
  for(let i=2;i<=10000;i++)m.tables.get('TASKPRED').rows.push({task_pred_id:String(i-1),proj_id:'1',task_id:String(i),pred_task_id:String(i-1),pred_type:'PR_FS',lag_hr_cnt:'0'});m.indexes=new Map();
  assert.deepEqual(detectCycles(m,'1'),[]);
});
