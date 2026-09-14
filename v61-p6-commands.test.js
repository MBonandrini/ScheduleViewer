import test from 'node:test';
import assert from 'node:assert/strict';
import {P6_COMMANDS,commandById,commandEnabled,commandForKeyboardEvent} from '../src/p6-commands.js';
import {parseXER} from '../src/parser.js';
import {captureImportedCalculation,calculationDiscrepancies,discrepancySummary} from '../src/calc-audit.js';

const critical=['open','save','undo','redo','find','addActivity','deleteActivity','relationships','assignResource','columns','groupSort','filter','schedule','scheduleOptions','levelResources','updateProgress','baselines','traceLogic','resourceProfiles'];

test('P6 command catalog contains critical day-one commands',()=>{
  for(const id of critical)assert.ok(commandById(id),id);
  assert.equal(new Set(P6_COMMANDS.map(x=>x.id)).size,P6_COMMANDS.length);
});

test('command enablement respects model and selection',()=>{
  assert.equal(commandEnabled('schedule',{hasModel:false}),false);
  assert.equal(commandEnabled('schedule',{hasModel:true}),true);
  assert.equal(commandEnabled('deleteActivity',{hasModel:true,hasSelection:false}),false);
  assert.equal(commandEnabled('deleteActivity',{hasModel:true,hasSelection:true}),true);
});

test('keyboard events resolve to P6 commands',()=>{
  assert.equal(commandForKeyboardEvent({key:'F9'})?.id,'schedule');
  assert.equal(commandForKeyboardEvent({key:'f',ctrlKey:true})?.id,'find');
  assert.equal(commandForKeyboardEvent({key:'Insert'})?.id,'addActivity');
  assert.equal(commandForKeyboardEvent({key:'Delete'})?.id,'deleteActivity');
  assert.equal(commandForKeyboardEvent({key:'s',ctrlKey:true})?.id,'save');
});

test('calculation audit reports changed imported values without losing original',()=>{
  const text=`ERMHDR\t20.12\t2026-01-01\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\tlast_recalc_date\n%R\t1\tP1\t2026-01-01 08:00\n%T\tTASK\n%F\ttask_id\tproj_id\ttask_code\ttask_name\tearly_start_date\tearly_end_date\ttotal_float_hr_cnt\tfree_float_hr_cnt\n%R\t10\t1\tA100\tTest\t2026-01-02 08:00\t2026-01-03 17:00\t8\t4\n%E\n`;
  const m=parseXER(text),snap=captureImportedCalculation(m,'1');
  const t=m.find('TASK','task_id','10');t.early_end_date='2026-01-06 17:00';t.total_float_hr_cnt='0';
  const rows=calculationDiscrepancies(snap,m,'1'),sum=discrepancySummary(rows);
  assert.ok(rows.some(x=>x.field==='early_end_date'));
  assert.ok(rows.some(x=>x.field==='total_float_hr_cnt'));
  assert.equal(snap.rows[0].early_end_date,'2026-01-03 17:00');
  assert.equal(sum.activities,1);
});

test('inter-project predecessor relationship is allowed for a loaded external project',async()=>{
  const {addRelationship}=await import('../src/editor.js');
  const text=`ERMHDR\t20.12\t2026-01-01\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\t1\tP1\n%R\t2\tP2\n%T\tTASK\n%F\ttask_id\tproj_id\ttask_code\ttask_name\n%R\t10\t1\tA100\tExternal Pred\n%R\t20\t2\tB100\tLocal Succ\n%E\n`;
  const m=parseXER(text);const r=addRelationship(m,'2','10','20','PR_FS',0);
  assert.equal(r.proj_id,'2');assert.equal(r.pred_task_id,'10');assert.equal(r.task_id,'20');
});

test('zoom shortcuts normalize keyboard plus and minus',()=>{
  assert.equal(commandForKeyboardEvent({key:'=',ctrlKey:true,shiftKey:true})?.id,'zoomIn');
  assert.equal(commandForKeyboardEvent({key:'-',ctrlKey:true})?.id,'zoomOut');
});

test('activity clone copies project-control attachments but clears actual dates',async()=>{
  const {cloneTask,ensureTable}=await import('../src/editor.js');
  const text=`ERMHDR\t20.12\t2026-01-01\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\t1\tP1\n%T\tTASK\n%F\ttask_id\tproj_id\ttask_code\ttask_name\tact_start_date\tact_end_date\n%R\t10\t1\tA100\tOriginal\t2026-01-02 08:00\t2026-01-03 17:00\n%T\tRSRC\n%F\trsrc_id\trsrc_name\n%R\t1\tCrew\n%T\tTASKRSRC\n%F\ttaskrsrc_id\ttask_id\trsrc_id\ttarget_qty\n%R\t1\t10\t1\t8\n%E\n`;
  const m=parseXER(text);const c=cloneTask(m,'10',{taskCode:'A110'});
  assert.notEqual(c.task_id,'10');assert.equal(c.task_code,'A110');assert.equal(c.act_start_date,'');assert.equal(c.act_end_date,'');
  assert.equal(m.table('TASKRSRC').filter(x=>x.task_id===c.task_id).length,1);
});

test('v6.1 shell exposes functional schedule and leveling option commands',async()=>{
  const fs=await import('node:fs');const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['scheduleOptions','levelOptions','calculationAudit','relationships','assignResource','groupSort','filter'])assert.match(html,new RegExp(`data-command="${id}"`));
  const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/function showScheduleOptionsDialog/);assert.match(app,/function showCalculationAudit/);
});

test('every HTML command is defined in the central command catalog',async()=>{
  const fs=await import('node:fs');const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/data-command="([^"]+)"/g)].map(m=>m[1]);
  for(const id of new Set(ids))assert.ok(commandById(id),`missing catalog entry: ${id}`);
});

test('P6 20.x is the application default compatibility target',async()=>{
  const fs=await import('node:fs');const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/normalizeSchedulingOptions\(\{compatibilityProfile:'p6v20'/);
});
