import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER } from '../src/parser.js';
import { serializeXER } from '../src/serializer.js';
import { EditHistory, updateTask, addTask, deleteTask, addRelationship, deleteRelationship, addResourceAssignment, deleteResourceAssignment } from '../src/editor.js';
import { buildCalendar, addWorkHours, subtractWorkHours, workHoursBetween, detectCycles, calculateCPM, applyCPM } from '../src/cpm.js';

const current=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(current);

test('XER round-trip serializer preserves generic tables and rows',()=>{
  const m=fresh(); const text=serializeXER(m); const rt=parseXER(text);
  assert.deepEqual(rt.tableNames(),m.tableNames());
  assert.equal(rt.table('TASK').length,m.table('TASK').length);
  assert.equal(rt.find('TASK','task_code','A1020').task_name,'Foundations');
});

test('activity create/update/delete mutates generic model safely',()=>{
  const m=fresh(); const n0=m.table('TASK').length; const t=addTask(m,'1',{task_code:'TEST1',task_name:'Test Activity',wbs_id:'11',clndr_id:'100'});
  assert.equal(m.table('TASK').length,n0+1); updateTask(m,t.task_id,{task_name:'Changed'}); assert.equal(m.find('TASK','task_id',t.task_id).task_name,'Changed'); deleteTask(m,t.task_id); assert.equal(m.table('TASK').length,n0);
});

test('undo/redo restores table state',()=>{
  const m=fresh(),h=new EditHistory(m); h.push('change'); updateTask(m,'1020',{task_name:'Changed'}); assert.equal(m.find('TASK','task_id','1020').task_name,'Changed'); h.undo(); assert.equal(m.find('TASK','task_id','1020').task_name,'Foundations'); h.redo(); assert.equal(m.find('TASK','task_id','1020').task_name,'Changed');
});

test('relationship and resource CRUD works',()=>{
  const m=fresh(); const r=addRelationship(m,'1','1030','1040','PR_SS',4); assert.equal(m.find('TASKPRED','task_pred_id',r.task_pred_id).lag_hr_cnt,'4'); deleteRelationship(m,r.task_pred_id); assert.equal(m.find('TASKPRED','task_pred_id',r.task_pred_id),null);
  const a=addResourceAssignment(m,'1050','201',{target_qty:'80'}); assert.equal(m.find('TASKRSRC','taskrsrc_id',a.taskrsrc_id).target_qty,'80'); deleteResourceAssignment(m,a.taskrsrc_id); assert.equal(m.find('TASKRSRC','taskrsrc_id',a.taskrsrc_id),null);
});

test('working calendar adds/subtracts hours across non-working time',()=>{
  const m=fresh(),cal=buildCalendar(m,'100'); const s=new Date(2026,7,24,8,0); const f=addWorkHours(cal,s,16); assert.equal(f.getDay(),2); assert.equal(f.getHours(),17); assert.equal(workHoursBetween(cal,s,f),16); const b=subtractWorkHours(cal,f,16); assert.equal(b.getDay(),1); assert.equal(b.getHours(),8);
});

test('cycle detection catches circular logic',()=>{
  const m=fresh(); addRelationship(m,'1','1060','1010','PR_FS',0); const cycles=detectCycles(m,'1'); assert.ok(cycles.length>0);
});

test('CPM calculates early/late dates and float',()=>{
  const m=fresh(); const calc=calculateCPM(m,'1'); assert.equal(calc.results.length,7); const a1030=calc.results.find(x=>x.task_id==='1030'); const a1050=calc.results.find(x=>x.task_id==='1050'); assert.ok(a1030.es instanceof Date); assert.ok(a1050.ef>a1030.es); assert.ok(Number.isFinite(a1030.totalFloat));
});

test('CPM apply writes calculated fields and round-trips to XER',()=>{
  const m=fresh(); const calc=calculateCPM(m,'1'); applyCPM(m,'1',calc); const t=m.find('TASK','task_id','1030'); assert.match(t.early_start_date,/^2026-/); assert.notEqual(t.total_float_hr_cnt,''); const rt=parseXER(serializeXER(m)); assert.equal(rt.find('TASK','task_id','1030').early_start_date,t.early_start_date);
});

test('FS/SS/FF/SF relationship types are accepted by calculation engine',()=>{
  for(const type of ['PR_FS','PR_SS','PR_FF','PR_SF']){const m=fresh(); const rel=m.find('TASKPRED','task_pred_id','3'); rel.pred_type=type; const calc=calculateCPM(m,'1'); assert.equal(calc.results.length,7);}
});

test('relationship editor rejects missing, cross-project and invalid relationship inputs',()=>{
  const m=fresh();
  assert.throws(()=>addRelationship(m,'1','NOPE','1030','PR_FS',0),/must exist/);
  const t=m.find('TASK','task_id','1030');t.proj_id='2';m.indexes=new Map();
  assert.throws(()=>addRelationship(m,'1','1020','1030','PR_FS',0),/selected project/);
  t.proj_id='1';m.indexes=new Map();
  assert.throws(()=>addRelationship(m,'1','1020','1030','PR_XY',0),/Unsupported/);
  assert.throws(()=>addRelationship(m,'1','1020','1030','PR_FS','abc'),/must be a number/);
});
