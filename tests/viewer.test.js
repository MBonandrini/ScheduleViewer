import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER, p6Date, num } from '../src/parser.js';
import { activityView, buildWBSTree, parseCalendarData, resourceAssignments } from '../src/semantic.js';
import { analyzeSchedule } from '../src/analysis.js';
import { compareModels } from '../src/compare.js';
import { toCSV } from '../src/export.js';

const current=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../sample/sample-previous.xer',import.meta.url),'utf8');
const model=parseXER(current), old=parseXER(previous);

test('generic XER parser discovers tables and rows',()=>{
  assert.equal(model.table('PROJECT').length,1);
  assert.equal(model.table('TASK').length,7);
  assert.equal(model.table('TASKPRED').length,6);
  assert.ok(model.tableNames().includes('CALENDAR'));
  assert.ok(model.rowCount()>20);
});

test('XER parser rejects invalid content',()=>{
  assert.throws(()=>parseXER('hello world'),/No XER tables/);
  assert.throws(()=>parseXER(''),/empty/);
});

test('date and numeric helpers are tolerant',()=>{
  assert.equal(p6Date('2026-08-23 12:30').getFullYear(),2026);
  assert.equal(num('12.5'),12.5);
  assert.equal(num('x',7),7);
});

test('semantic activity detail joins WBS, calendar, logic and resources',()=>{
  const task=model.find('TASK','task_code','A1020');
  const a=activityView(model,task);
  assert.equal(a.name,'Foundations');
  assert.match(a.wbsName,/Civil/);
  assert.match(a.calendarName,/5 Day/);
  assert.equal(a.preds.length,1);
  assert.equal(a.succs.length,2);
  assert.equal(a.resources.length,1);
});

test('WBS hierarchy is constructed',()=>{
  const roots=buildWBSTree(model,'1');
  assert.equal(roots.length,1);
  assert.equal(roots[0].children.length,2);
});

test('calendar decoder extracts work periods',()=>{
  const c=model.table('CALENDAR')[0];
  const decoded=parseCalendarData(c.clndr_data);
  assert.ok(decoded.days.length>=5);
  const monday=decoded.days.find(x=>x.day==='Monday');
  assert.ok(monday);
  assert.equal(monday.periods.length,2);
});

test('resource assignments enrich names',()=>{
  const rows=resourceAssignments(model,'1');
  assert.equal(rows.length,4);
  assert.equal(rows[0].rsrc_name,'Civil Crew');
});

test('analysis flags representative schedule-health issues',()=>{
  const a=analyzeSchedule(model,'1',{hoursPerDay:8,longDurationDays:44,highFloatDays:44,lagDays:0});
  assert.ok(a.issues.some(x=>x.rule==='Negative lag'));
  assert.ok(a.issues.some(x=>x.rule==='Positive lag'));
  assert.ok(a.issues.some(x=>x.rule==='Long duration'));
  assert.ok(a.issues.some(x=>x.rule==='Negative float'));
  assert.ok(a.issues.some(x=>x.rule==='Constraint'));
  assert.equal(a.counts.activities,7);
});

test('comparison detects additions and field/logic changes',()=>{
  const c=compareModels(old,model,'1','1');
  assert.ok(c.changes.some(x=>x.type==='Added'&&x.activity==='A1040'));
  assert.ok(c.changes.some(x=>x.activity==='A1020'&&x.field==='Original Duration'));
  assert.ok(c.changes.some(x=>x.activity==='A1030'&&x.field==='Relationships'));
  assert.ok(c.summary.activitiesAffected>=3);
});

test('CSV export escapes quotes and columns',()=>{
  const csv=toCSV([{a:'x',b:'say "hi"'}]);
  assert.match(csv,/"a","b"/);
  assert.match(csv,/"say ""hi"""/);
});
