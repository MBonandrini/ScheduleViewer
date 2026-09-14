import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER } from '../src/parser.js';
import { parseCalendarData } from '../src/semantic.js';
import { buildResourceTree, resourceDescendantIds, addResource, updateResource, deleteResource, addResourceRate } from '../src/resource-tools.js';
import { buildResourceTimeSeries, filterResourceAssignments } from '../src/resource-analysis.js';
import { calendarDefinition, updateCalendarDefinition, addCalendar, calendarDayStatus } from '../src/calendar-editor.js';
import { relationshipTypeLabel, relationshipRowsFriendly, relationshipNeighborhood } from '../src/relationship-tools.js';
import { addActivityCodeType, addActivityCode, assignActivityCode, addUdfType, setTaskUdfValue } from '../src/codes-editor.js';
import { ensureTable, addResourceAssignment } from '../src/editor.js';
import { issueGraphicData } from '../src/analysis-graphics.js';

const sample=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(sample);

test('resource dictionary builds actual parent-child hierarchy and descendants',()=>{
  const m=fresh(); const t=ensureTable(m,'RSRC',['parent_rsrc_id']);
  const root=t.rows[0]; const child=addResource(m,root.rsrc_id,{rsrc_name:'Child Crew'}); const grand=addResource(m,child.rsrc_id,{rsrc_name:'Grandchild Crew'});
  const tree=buildResourceTree(m), node=tree.find(x=>String(x.rsrc_id)===String(root.rsrc_id));
  assert.ok(node); assert.ok(node.children.some(x=>String(x.rsrc_id)===String(child.rsrc_id)));
  assert.deepEqual(new Set(resourceDescendantIds(m,root.rsrc_id)),new Set([child.rsrc_id,grand.rsrc_id]));
});

test('resource editing prevents hierarchy cycles and resource rates are editable data',()=>{
  const m=fresh(); const root=addResource(m,'',{rsrc_name:'Root'}); const child=addResource(m,root.rsrc_id,{rsrc_name:'Child'});
  assert.throws(()=>updateResource(m,root.rsrc_id,{parent_rsrc_id:child.rsrc_id}),/descendant/i);
  const rate=addResourceRate(m,child.rsrc_id,{startDate:'2026-01-01',pricePerUnit:72.5,maxUnitsPerHour:3});
  assert.equal(rate.rsrc_id,child.rsrc_id); assert.equal(rate.cost_per_qty,'72.5');
});

test('resource delete protects live assignments and can remove an assigned subtree explicitly',()=>{
  const m=fresh(), task=m.table('TASK')[0]; const root=addResource(m,'',{rsrc_name:'Delete Root'}); const child=addResource(m,root.rsrc_id,{rsrc_name:'Delete Child'});
  addResourceAssignment(m,task.task_id,child.rsrc_id,{target_qty:'8'});
  assert.throws(()=>deleteResource(m,root.rsrc_id,{mode:'subtree'}),/assignment/i);
  const result=deleteResource(m,root.rsrc_id,{mode:'subtree',removeAssignments:true});
  assert.equal(result.deletedResources,2); assert.equal(m.find('RSRC','rsrc_id',child.rsrc_id),null);
});

test('resource profile filters descendants WBS status and supports quarterly buckets',()=>{
  const m=fresh(), resources=m.table('RSRC'); const parent=addResource(m,'',{rsrc_name:'Parent'}); const child=addResource(m,parent.rsrc_id,{rsrc_name:'Child'}); const task=m.table('TASK')[0];
  addResourceAssignment(m,task.task_id,child.rsrc_id,{target_qty:'16',remain_qty:'10'});
  const filtered=filterResourceAssignments(m,'1',{resourceId:parent.rsrc_id,includeResourceDescendants:true});
  assert.ok(filtered.some(x=>String(x.rsrc_id)===String(child.rsrc_id)));
  const ts=buildResourceTimeSeries(m,'1',{resourceId:parent.rsrc_id,includeResourceDescendants:true,bucket:'quarter',mode:'units'});
  assert.ok(ts.length>0); assert.ok(ts.reduce((n,x)=>n+x.budget,0)>=16);
});

test('native P6 calendar format with 0||weekday markers and numeric exceptions decodes correctly',()=>{
  const raw='(0||CalendarData()(\x7f\x7f  (0||DaysOfWeek()(\x7f\x7f    (0||1()())\x7f\x7f    (0||2()(\x7f\x7f      (0||0(s|08:00|f|12:00)())\x7f\x7f      (0||1(s|13:00|f|17:00)())))\x7f\x7f    (0||3()())\x7f\x7f    (0||4()())\x7f\x7f    (0||5()())\x7f\x7f    (0||6()())\x7f\x7f    (0||7()())))\x7f\x7f  (0||Exceptions()(\x7f\x7f    (0||0(d|44189)()))))';
  const p=parseCalendarData(raw); assert.equal(p.days.find(x=>x.day==='Monday').periods.length,2); assert.equal(p.exceptions[0],'2020-12-24');
});

test('calendar editor changes workweek and exception dates and recalculates hours',()=>{
  const m=fresh(); const c=addCalendar(m,{name:'QA Calendar'}); const def=calendarDefinition(m,c.clndr_id); const week={...def.week,Saturday:[{start:'08:00',finish:'12:00'}]}; const exceptions={'2026-12-25':[],'2026-12-26':[{start:'09:00',finish:'13:00'}]};
  updateCalendarDefinition(m,c.clndr_id,{week,exceptions}); const next=calendarDefinition(m,c.clndr_id);
  assert.equal(next.week.Saturday.length,1); assert.equal(calendarDayStatus(next,'2026-12-25').working,false); assert.equal(calendarDayStatus(next,'2026-12-26').exception,true); assert.equal(m.find('CALENDAR','clndr_id',c.clndr_id).week_hr_cnt,'44');
});

test('relationship types expose planner friendly names and selected neighborhood',()=>{
  const m=fresh(), rel=m.table('TASKPRED')[0]; assert.equal(relationshipTypeLabel('PR_FF'),'Finish to Finish');
  const rows=relationshipRowsFriendly(m,'1'); assert.ok(rows.every(x=>!String(x.relationship_type).startsWith('PR_')));
  const n=relationshipNeighborhood(m,'1',rel.task_pred_id,{depth:1}); assert.equal(n.selected.task_pred_id,rel.task_pred_id); assert.ok(n.tasks.length>=2);
});

test('activity code and UDF dictionaries support additions and task assignments',()=>{
  const m=fresh(), task=m.table('TASK')[0]; const type=addActivityCodeType(m,{name:'Discipline'}),code=addActivityCode(m,type.actv_code_type_id,{code:'ELEC',description:'Electrical'}); assignActivityCode(m,task.task_id,code.actv_code_id);
  const udf=addUdfType(m,{label:'Room',dataType:'FT_TEXT'}); setTaskUdfValue(m,task.task_id,udf.udf_type_id,'L03-301');
  assert.ok(m.table('TASKACTV').some(x=>String(x.task_id)===String(task.task_id)&&String(x.actv_code_id)===String(code.actv_code_id)));
  assert.equal(m.table('UDFVALUE').find(x=>String(x.fk_id)===String(task.task_id)&&String(x.udf_type_id)===String(udf.udf_type_id)).udf_text,'L03-301');
});

test('schedule analysis graphics return severity WBS and dated issue populations',()=>{
  const m=fresh(), task=m.table('TASK')[0], issues=[{severity:'high',task_id:task.task_id},{severity:'medium',task_id:task.task_id}]; const g=issueGraphicData(m,'1',issues);
  assert.equal(g.bySeverity.high,1); assert.equal(g.bySeverity.medium,1); assert.ok(g.tasks.length>=1); assert.ok(g.wbs.length>=1);
});

test('v6.2 UI source exposes editable resource/calendar/code workbenches, relationship preview and column chooser',()=>{
  const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  for(const token of ['Resource Dictionary','Horizontal Compression','Project Calendar View','Activity Code Dictionary','Logic Preview','showColumnsDialog','Severity Profile'])assert.match(app,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  for(const token of ['resource-dictionary','resource-profile-workbench','calendar-workbench','codes-workbench','relationship-workbench'])assert.match(css,new RegExp(token));
});

test('resource weekly monthly and quarterly periods align to calendar boundaries',()=>{
  const m=fresh();
  const weekly=buildResourceTimeSeries(m,'1',{bucket:'week'}); assert.ok(weekly.every(x=>new Date(`${x.date}T00:00:00`).getDay()===1));
  const monthly=buildResourceTimeSeries(m,'1',{bucket:'month'}); assert.ok(monthly.every(x=>x.date.endsWith('-01')));
  const quarterly=buildResourceTimeSeries(m,'1',{bucket:'quarter'}); assert.ok(quarterly.every(x=>['01','04','07','10'].includes(x.date.slice(5,7))&&x.date.endsWith('-01')));
});

test('activity grid and gantt enforce matching row heights and toolbar remains present',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(html,/id="p6Toolbar"/);assert.match(css,/\.p6-grid-pane tbody tr[^\{]*\{[^\}]*height:var\(--row\)!important/);assert.match(css,/\.gantt-row/);
});
