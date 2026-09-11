import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wbsDisplayLabel, calendarDisplayLabel, groupDisplayLabel } from '../src/ui-labels.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');

function modelWith(rows){
  return {find(table,key,value){return (rows[table]||[]).find(r=>String(r[key])===String(value));}};
}

test('WBS labels prefer description plus code over internal ID',()=>{
  const m=modelWith({PROJWBS:[{wbs_id:'42',wbs_short_name:'4.1',wbs_name:'Construction'}]});
  assert.equal(wbsDisplayLabel(m,'42'),'Construction · 4.1');
  assert.equal(groupDisplayLabel(m,'wbs_id',{wbs_id:'42'}),'Construction · 4.1');
});

test('calendar labels prefer calendar name plus ID',()=>{
  const m=modelWith({CALENDAR:[{clndr_id:'1001',clndr_name:'Standard Construction Calendar'}]});
  assert.equal(calendarDisplayLabel(m,'1001'),'Standard Construction Calendar · 1001');
});

test('desktop shell is viewport-bound and activity panes manage their own scrolling',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.match(css,/body\.p6-desktop\s*\{[^}]*display:grid/i);
  assert.match(css,/\.p6-main\s*\{[^}]*min-height:\s*0/i);
  assert.match(css,/\.p6-grid-pane,\.p6-gantt-pane\s*\{[^}]*overflow:auto/i);
});

test('service worker precaches the v6 UI label module',()=>{
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.match(sw,/unified-schedule-studio-v6\.0/);
  assert.match(sw,/\.\/src\/ui-labels\.js/);
});

test('activities render grouped Gantt labels via the same grouping function',()=>{
  const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
  assert.match(app,/groupLabel:t=>groupDisplayLabel\(state\.model,layout\.groupBy,t\)/);
  const gantt=fs.readFileSync(path.join(root,'src/gantt.js'),'utf8');
  assert.match(gantt,/gantt-group-row/);
});
