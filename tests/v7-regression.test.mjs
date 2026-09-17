import test from 'node:test';
import assert from 'node:assert/strict';
import { XERModel, parseXER } from '../src/parser.js';
import { scheduleAssurance, assuranceCategories } from '../src/v7-schedule-assurance.js';
import { networkIntelligence, pathExplorer, dateMoveContributions } from '../src/v7-network-intelligence.js';
import { progressIntelligence, revisionProgressTrend, revisionThroughput, wbsPerformance } from '../src/v7-progress-intelligence.js';
import { activityRevisionHistory, compareRevisions, revisionPortfolio } from '../src/v7-revision-intelligence.js';
import { runQSRA } from '../src/v7-risk-engine.js';
import { CommandRegistry } from '../src/v7-command-registry.js';
import { createRevision } from '../src/forensic-repository.js';
import { applyFilterGroup } from '../src/filters.js';
import { defaultLayout, normalizeLayout } from '../src/layouts.js';

function model({shift=0,progress=40,completeB=false}={}){
 const tables=new Map();
 const add=(name,rows)=>tables.set(name,{name,fields:[...new Set(rows.flatMap(r=>Object.keys(r)))],rows:rows.map(r=>({...r}))});
 add('PROJECT',[{proj_id:'P1',proj_short_name:'V7 Test',last_recalc_date:`2026-02-${String(10+shift).padStart(2,'0')} 17:00`}]);
 add('PROJWBS',[{proj_id:'P1',wbs_id:'W1',wbs_name:'Design',wbs_short_name:'1'},{proj_id:'P1',wbs_id:'W2',wbs_name:'Build',wbs_short_name:'2'}]);
 add('CALENDAR',[{clndr_id:'C1',clndr_name:'5 Day',clndr_data:''}]);
 add('TASK',[
  {proj_id:'P1',task_id:'1',task_code:'A100',task_name:'Start',wbs_id:'W1',clndr_id:'C1',task_type:'TT_StartMile',status_code:'TK_Complete',target_drtn_hr_cnt:'0',remain_drtn_hr_cnt:'0',target_start_date:'2026-01-05 08:00',target_end_date:'2026-01-05 08:00',act_start_date:'2026-01-05 08:00',act_end_date:'2026-01-05 08:00',phys_complete_pct:'100',total_float_hr_cnt:'0'},
  {proj_id:'P1',task_id:'2',task_code:'A200',task_name:'Design',wbs_id:'W1',clndr_id:'C1',task_type:'TT_Task',status_code:'TK_Active',target_drtn_hr_cnt:'80',remain_drtn_hr_cnt:'40',target_start_date:'2026-01-05 08:00',target_end_date:`2026-01-${String(16+shift).padStart(2,'0')} 17:00`,act_start_date:'2026-01-06 08:00',phys_complete_pct:String(progress),total_float_hr_cnt:'16'},
  {proj_id:'P1',task_id:'3',task_code:'A300',task_name:'Procure',wbs_id:'W2',clndr_id:'C1',task_type:'TT_Task',status_code:completeB?'TK_Complete':'TK_NotStart',target_drtn_hr_cnt:'120',remain_drtn_hr_cnt:completeB?'0':'120',target_start_date:'2026-01-19 08:00',target_end_date:`2026-02-${String(6+shift).padStart(2,'0')} 17:00`,act_start_date:completeB?'2026-01-20 08:00':'',act_end_date:completeB?'2026-02-05 17:00':'',phys_complete_pct:completeB?'100':'0',total_float_hr_cnt:'8'},
  {proj_id:'P1',task_id:'4',task_code:'A400',task_name:'Install',wbs_id:'W2',clndr_id:'C1',task_type:'TT_Task',status_code:'TK_NotStart',target_drtn_hr_cnt:'160',remain_drtn_hr_cnt:'160',target_start_date:`2026-02-${String(9+shift).padStart(2,'0')} 08:00`,target_end_date:`2026-03-${String(6+shift).padStart(2,'0')} 17:00`,phys_complete_pct:'0',total_float_hr_cnt:'0'},
  {proj_id:'P1',task_id:'5',task_code:'A500',task_name:'Finish',wbs_id:'W2',clndr_id:'C1',task_type:'TT_FinMile',status_code:'TK_NotStart',target_drtn_hr_cnt:'0',remain_drtn_hr_cnt:'0',target_start_date:`2026-03-${String(6+shift).padStart(2,'0')} 17:00`,target_end_date:`2026-03-${String(6+shift).padStart(2,'0')} 17:00`,phys_complete_pct:'0',total_float_hr_cnt:'0'}
 ]);
 add('TASKPRED',[
  {proj_id:'P1',pred_task_id:'1',task_id:'2',pred_type:'PR_FS',lag_hr_cnt:'0'},
  {proj_id:'P1',pred_task_id:'2',task_id:'3',pred_type:'PR_FS',lag_hr_cnt:'0'},
  {proj_id:'P1',pred_task_id:'2',task_id:'4',pred_type:'PR_FS',lag_hr_cnt:'0'},
  {proj_id:'P1',pred_task_id:'3',task_id:'4',pred_type:'PR_FS',lag_hr_cnt:'0'},
  {proj_id:'P1',pred_task_id:'4',task_id:'5',pred_type:'PR_FS',lag_hr_cnt:'0'}
 ]);
 add('RSRC',[{rsrc_id:'R1',rsrc_name:'Crew'}]);
 add('TASKRSRC',[{proj_id:'P1',task_id:'2',rsrc_id:'R1',target_qty:'80',remain_qty:'40'}]);
 add('TASKACTV',[]); add('ACTVCODE',[]); add('ACTVTYPE',[]);
 return new XERModel({header:[],tables,warnings:[],sourceText:''});
}

test('basic XER parser remains operational',()=>{
 const x='ERMHDR\t8.4\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\tP1\tTest\n%T\tTASK\n%F\tproj_id\ttask_id\ttask_code\n%R\tP1\t1\tA1\n%E';
 const m=parseXER(x); assert.equal(m.table('TASK').length,1); assert.equal(m.table('PROJECT')[0].proj_short_name,'Test');
});

test('V7 schedule assurance exposes a broad check catalogue and stable summary',()=>{
 const a=scheduleAssurance(model(),'P1',{hoursPerDay:8});
 assert.ok(a.checks.length>=50,`expected >=50 checks, got ${a.checks.length}`);
 assert.equal(a.counts.activities,5); assert.equal(a.counts.relationships,5);
 assert.equal(a.summary.total,a.checks.length); assert.ok(assuranceCategories(a).length>=8);
 assert.ok(a.checks.some(x=>x.key==='merge-hotspot')); assert.ok(a.checks.some(x=>x.key==='progress-no-start'));
});

test('network intelligence finds density, hotspots, components and paths',()=>{
 const m=model(),n=networkIntelligence(m,'P1',{mergeThreshold:2,divergenceThreshold:2});
 assert.equal(n.nodes.length,5); assert.equal(n.components.length,1); assert.ok(n.mergeHotspots.some(x=>x.activity==='A400')); assert.ok(n.divergenceHotspots.some(x=>x.activity==='A200'));
 const p=pathExplorer(m,'P1','5',{maxPaths:10}); assert.ok(p.length>=2); assert.equal(p[0].activityIds.at(-1),'A500');
});

test('progress intelligence calculates planned/actual indicators',()=>{
 const p=progressIntelligence(model(),'P1'); assert.ok(p.actualProgress>0); assert.ok(p.plannedProgress>0); assert.ok(Number.isFinite(p.spi));
 const w=wbsPerformance(model(),'P1'); assert.equal(w.length,2); assert.equal(w.reduce((s,x)=>s+x.activities,0),5);
});

test('revision intelligence tracks history and changes',()=>{
 const m1=model({shift:0,progress:30}),m2=model({shift:2,progress:60,completeB:true}),r1=createRevision(m1,{name:'R1',projectId:'P1'}),r2=createRevision(m2,{name:'R2',projectId:'P1'}),revs=[r1,r2];
 const h=activityRevisionHistory(revs,'A200'); assert.equal(h.length,2); assert.ok(Number.isFinite(h[1].movementDays));
 const c=compareRevisions(r1,r2,{hoursPerDay:8}); assert.ok(c.summary.total>0); assert.ok(c.categories.Progress.length>0||c.categories.Dates.length>0);
 assert.equal(revisionPortfolio(revs).length,2); assert.equal(revisionProgressTrend(revs).length,2); assert.equal(revisionThroughput(revs).length,1);
 const d=dateMoveContributions(m1,m2,'P1','P1','A200'); assert.equal(d.found,true); assert.ok(d.contributions.length>0);
});

test('QSRA is deterministic for fixed seed and returns risk drivers',()=>{
 const opts={iterations:500,seed:77,distribution:'triangular',minFactor:.9,modeFactor:1,maxFactor:1.2};
 const a=runQSRA(model(),'P1',opts),b=runQSRA(model(),'P1',opts); assert.equal(a.error,undefined); assert.equal(a.iterations,500); assert.equal(a.p80,b.p80); assert.equal(a.p50,b.p50); assert.ok(a.p90>=a.p50); assert.ok(a.drivers.length>0); assert.equal(a.histogram.reduce((s,x)=>s+x.count,0),500);
});

test('nested/advanced filters work',()=>{
 const rows=[{name:'Alpha',float:5,date:'2026-01-02'},{name:'Beta',float:-1,date:'2026-02-02'}];
 const g={mode:'AND',rules:[{field:'name',op:'regex',value:'alp'},{mode:'OR',rules:[{field:'float',op:'between',value:'0,10'},{field:'date',op:'after',value:'2026-03-01'}]}]};
 const out=applyFilterGroup(rows,g); assert.equal(out.length,1); assert.equal(out[0].name,'Alpha');
});

test('layout normalization includes V7 bar settings',()=>{
 const d=defaultLayout(),n=normalizeLayout({id:'x',barSettings:{normalColor:'#123456'},columns:['task_code']}); assert.equal(d.barSettings.labelMode,'none'); assert.equal(n.barSettings.normalColor,'#123456'); assert.ok(n.barSettings.criticalColor);
});

test('command registry provides common command-bus semantics',()=>{
 const c=new CommandRegistry(),ctx={ok:true};let hit=0;c.register('x',()=>++hit,{enabled:x=>x.ok});assert.equal(c.can('x',ctx),true);assert.equal(c.execute('x',ctx),1);assert.deepEqual(c.audit(['x','missing']),['missing']);
});
