import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER } from '../src/parser.js';
import { serializeXER } from '../src/serializer.js';
import { cloneWBSBranch, setWBSNote, getWBSNote } from '../src/wbs-tools.js';
import { addWBS, reassignTasksToWBS, ensureTable } from '../src/editor.js';
import { resourceSheetRows, summarizeResources, buildResourceTimeSeries, cumulativeSeries } from '../src/resource-analysis.js';

const sample=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(sample);

test('WBS branch duplicate copies hierarchy and activities with new IDs',()=>{
  const m=fresh();
  const root=addWBS(m,'1','10',{wbs_short_name:'PKG',wbs_name:'Package'});
  const child=addWBS(m,'1',root.wbs_id,{wbs_short_name:'SUB',wbs_name:'Subpackage'});
  reassignTasksToWBS(m,['1010'],root.wbs_id);
  reassignTasksToWBS(m,['1020'],child.wbs_id);
  const beforeTasks=m.table('TASK').length,beforeWbs=m.table('PROJWBS').length;
  const out=cloneWBSBranch(m,root.wbs_id,{includeActivities:true});
  assert.ok(out.rootWbsId);
  assert.equal(m.table('PROJWBS').length,beforeWbs+2);
  assert.equal(m.table('TASK').length,beforeTasks+2);
  const newCodes=m.table('TASK').slice(-2).map(t=>t.task_code);
  assert.ok(newCodes.every(x=>x.endsWith('-COPY')));
  assert.equal(new Set(m.table('TASK').map(t=>t.task_id)).size,m.table('TASK').length);
});

test('WBS notebook and EV fields survive XER round trip',()=>{
  const m=fresh();const w=m.table('PROJWBS')[0];
  ensureTable(m,'PROJWBS',['ev_compute_type','ev_etc_compute_type','ev_user_pct','est_wt','anticip_start_date','anticip_end_date']);
  Object.assign(w,{ev_compute_type:'EC_PhysPct',ev_etc_compute_type:'EE_Remain',ev_user_pct:'55',est_wt:'12.5',anticip_start_date:'2026-08-01',anticip_end_date:'2026-09-01'});
  setWBSNote(m,w.wbs_id,'Construction package execution note');
  const rt=parseXER(serializeXER(m));const rw=rt.find('PROJWBS','wbs_id',w.wbs_id);
  assert.equal(rw.ev_compute_type,'EC_PhysPct');assert.equal(rw.est_wt,'12.5');assert.equal(getWBSNote(rt,w.wbs_id),'Construction package execution note');
});

test('resource sheet is flat and Excel-friendly',()=>{
  const m=fresh(),rows=resourceSheetRows(m,'1');
  assert.ok(rows.length>0);assert.ok(rows[0].task_code);assert.ok(rows[0].resource_name);assert.equal(typeof rows[0].budget_units,'number');
});

test('resource summary reconciles to sheet totals',()=>{
  const m=fresh(),sheet=resourceSheetRows(m,'1'),sum=summarizeResources(m,'1');
  const a=sheet.reduce((x,r)=>x+r.budget_units,0),b=sum.reduce((x,r)=>x+r.budget_units,0);
  assert.equal(a,b);
});

test('resource time series preserves total budget and remaining units',()=>{
  const m=fresh();
  const sheet=resourceSheetRows(m,'1');const ts=buildResourceTimeSeries(m,'1',{bucket:'week',mode:'units'});
  const budget=sheet.reduce((x,r)=>x+r.budget_units,0),remain=sheet.reduce((x,r)=>x+r.remaining_units,0);
  assert.ok(Math.abs(ts.reduce((x,r)=>x+r.budget,0)-budget)<1e-6);
  assert.ok(Math.abs(ts.reduce((x,r)=>x+r.remaining,0)-remain)<1e-6);
});

test('resource filter limits profile to selected resource',()=>{
  const m=fresh(),rid=m.table('RSRC')[0].rsrc_id;
  const all=buildResourceTimeSeries(m,'1',{resourceId:rid}),sheet=resourceSheetRows(m,'1').filter(r=>r.resource_id===rid);
  assert.ok(Math.abs(all.reduce((x,r)=>x+r.budget,0)-sheet.reduce((x,r)=>x+r.budget_units,0))<1e-6);
});

test('cumulative resource curve is monotonic',()=>{
  const m=fresh(),cum=cumulativeSeries(buildResourceTimeSeries(m,'1'));
  for(let i=1;i<cum.length;i++){assert.ok(cum[i].budget>=cum[i-1].budget);assert.ok(cum[i].forecast>=cum[i-1].forecast)}
});

test('resource curves reshape but preserve totals',()=>{
  const m=fresh();const a=m.table('TASKRSRC')[0];
  ensureTable(m,'TASKRSRC',['curv_id']);a.curv_id='7';
  const ct=ensureTable(m,'RSRCCURVDATA',['curv_id','seq_num','curv_value']);ct.rows.push({curv_id:'7',seq_num:'1',curv_value:'10'},{curv_id:'7',seq_num:'2',curv_value:'20'},{curv_id:'7',seq_num:'3',curv_value:'70'});
  const ts=buildResourceTimeSeries(m,'1',{resourceId:a.rsrc_id,bucket:'day'});const expected=resourceSheetRows(m,'1').filter(r=>r.resource_id===a.rsrc_id).reduce((x,r)=>x+r.budget_units,0);
  assert.ok(Math.abs(ts.reduce((x,r)=>x+r.budget,0)-expected)<1e-6);
});

import { renderHistogram, renderCurve } from '../src/resource-charts.js';

test('resource chart renderers emit accessible SVG output',()=>{
  const rows=[{date:'2026-08-01',budget:10,actual:2,remaining:8,forecast:10},{date:'2026-08-08',budget:20,actual:5,remaining:15,forecast:20}];
  const a={innerHTML:''},b={innerHTML:''};renderHistogram(a,rows);renderCurve(b,cumulativeSeries(rows));
  assert.match(a.innerHTML,/svg/);assert.match(a.innerHTML,/aria-label/);assert.match(b.innerHTML,/polyline/);
});

test('GitHub UI exposes dedicated Resource Sheet and Resource Profiles navigation',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/data-view="resourceSheet"/);assert.match(html,/data-view="resourceProfiles"/);
});
