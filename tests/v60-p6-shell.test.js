import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultLayout } from '../src/layouts.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const gantt=fs.readFileSync(path.join(root,'src/gantt.js'),'utf8');

test('v6 shell uses desktop P6-style chrome rather than a long sidebar',()=>{
  for(const cls of ['p6-titlebar','p6-menubar','p6-commandbar','p6-module-tabs','p6-statusbar'])assert.match(html,new RegExp(`class="[^"]*${cls}`));
  assert.doesNotMatch(html,/<aside[^>]+sidebar/i);
});

test('single-user menu architecture exposes major P6-style functional areas',()=>{
  for(const label of ['File','Edit','View','Project','Enterprise','Tools','Reports','Help'])assert.match(html,new RegExp(`<summary>${label}</summary>`));
  assert.match(html,/Single User/);
  assert.doesNotMatch(html,/<summary>Admin<\/summary>/);
});

test('activity workspace uses layout strip split table/gantt and bottom inspector',()=>{
  assert.match(app,/p6-activity-workspace/);
  assert.match(app,/p6-layout-strip/);
  assert.match(app,/p6-activity-main/);
  assert.match(app,/p6-detail-pane/);
  for(const tab of ['General','Status','Relationships','Resources','Codes','Constraints','Notebooks','Trace Logic','Raw Data'])assert.match(app,new RegExp(`>${tab}<`));
});

test('default activity layout mirrors common P6 activity columns',()=>{
  assert.deepEqual(defaultLayout().columns,['task_code','task_name','target_drtn_hr_cnt','remain_drtn_hr_cnt','early_start_date','early_end_date','phys_complete_pct','total_float_hr_cnt']);
  assert.equal(defaultLayout().groupBy,'wbs_id');
});

test('gantt has P6-style summary bars squared relationship lines and zoom',()=>{
  assert.match(gantt,/summary-bar/);
  assert.match(gantt,/gantt-links/);
  assert.match(gantt,/pred_task_id/);
  assert.match(gantt,/replace\(\/\^PR_\//);
  assert.match(gantt,/Number\(zoom\)/);
  assert.match(css,/\.gantt-link\{/);
  assert.match(css,/\.summary-bar\{/);
});

test('service worker and package version are v6',()=>{
  assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/unified-schedule-studio-v6\.0/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'6.0.0');
});

test('activity grid and Gantt use a draggable splitter with synchronized vertical scrolling',()=>{
  assert.match(app,/activitySplitter/);
  assert.match(app,/bindActivitySplitAndScroll/);
  assert.match(app,/to\.scrollTop=from\.scrollTop/);
  assert.match(css,/\.p6-splitter\{/);
});

test('activity inspector exposes core P6-style detail tabs',()=>{
  for(const tab of ['Dates','Expenses','Steps','Risks'])assert.match(app,new RegExp(`>${tab}<`));
  assert.match(app,/genericTaskTable\('PROJCOST'/);
  assert.match(app,/genericTaskTable\('TASKSTEP'/);
  assert.match(app,/riskMini\(/);
});

test('EPS / Projects view includes a project-level Gantt',()=>{
  assert.match(app,/function projectGanttHTML/);
  assert.match(app,/p6-project-gantt/);
  assert.match(css,/\.p6-project-gantt-row/);
});
