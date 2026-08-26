import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseXER} from '../src/parser.js';
import {calculateCPM,buildCalendar,addWorkHours} from '../src/cpm.js';
import {addTask} from '../src/editor.js';
import {applyProfile,normalizeSchedulingOptions} from '../src/scheduling-options.js';

const text=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(text);
const dt=s=>new Date(s.replace(' ','T'));
const result=(c,id)=>c.results.find(r=>r.task_id===String(id));
function isolate(m,ids){for(const t of m.table('TASK'))if(!ids.includes(t.task_id))t.proj_id='999';m.tables.get('TASKPRED').rows=[];m.indexes=new Map();}

test('calendar manual non-working exception pushes work to the next working day',()=>{
 const m=fresh();const cal=buildCalendar(m,'100',{exceptionOverrides:{'100':{'2026-08-24':[]}}});
 const d=addWorkHours(cal,dt('2026-08-24 08:00'),8);
 assert.equal(d.getDate(),25);assert.equal(d.getHours(),17);
});

test('calendar manual shift exception supports multiple dated shifts',()=>{
 const m=fresh();const cal=buildCalendar(m,'100',{exceptionOverrides:{'100':{'2026-08-24':[[360,600],[1080,1200]]}}});
 const d=addWorkHours(cal,dt('2026-08-24 06:00'),6);
 assert.equal(d.getDate(),24);assert.equal(d.getHours(),20);
});

test('progress override lets an already-started successor ignore incomplete predecessor remaining logic',()=>{
 const m=fresh();isolate(m,['1020','1030']);const p=m.find('TASK','task_id','1020'),s=m.find('TASK','task_id','1030');
 Object.assign(p,{status_code:'TK_Active',act_start_date:'2026-08-17 08:00',remain_drtn_hr_cnt:'80'});Object.assign(s,{status_code:'TK_Active',act_start_date:'2026-08-18 08:00',remain_drtn_hr_cnt:'8',cstr_type:'',cstr_date:''});
 m.tables.get('TASKPRED').rows=[{task_pred_id:'x',proj_id:'1',task_id:'1030',pred_task_id:'1020',pred_type:'PR_FS',lag_hr_cnt:'0'}];m.indexes=new Map();
 const retained=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',outOfSequenceMode:'retainedLogic'}),'1030');
 const override=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',outOfSequenceMode:'progressOverride'}),'1030');
 assert.ok(override.es<retained.es);
});

test('expected finish can override the calculated remaining finish',()=>{
 const m=fresh();isolate(m,['1020']);const t=m.find('TASK','task_id','1020');t.expect_end_date='2026-09-10 17:00';
 const ignored=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',expectedFinishMode:'ignore'}),'1020');
 const respected=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',expectedFinishMode:'respect'}),'1020');
 assert.ok(respected.ef>ignored.ef);assert.equal(respected.ef.getDate(),10);
});

test('strict suspend/resume mode rejects suspended activity without resume date',()=>{
 const m=fresh();isolate(m,['1020']);const t=m.find('TASK','task_id','1020');t.suspend_date='2026-08-20 12:00';t.restart_date='';t.resume_date='';
 assert.throws(()=>calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',suspendResumeMode:'strict'}),/no resume date/i);
});

test('external relationship can constrain local activity from stored external project dates',()=>{
 const m=fresh();isolate(m,['1030']);const s=m.find('TASK','task_id','1030');Object.assign(s,{status_code:'TK_NotStart',remain_drtn_hr_cnt:'8',cstr_type:'',cstr_date:''});
 addTask(m,'2',{task_id:'EXT1',task_code:'EXT1',task_name:'External predecessor',wbs_id:'11',clndr_id:'100',status_code:'TK_Complete',act_start_date:'2026-09-01 08:00',act_end_date:'2026-09-04 17:00',remain_drtn_hr_cnt:'0',target_drtn_hr_cnt:'0'});
 m.tables.get('TASKPRED').rows=[{task_pred_id:'ext',proj_id:'1',task_id:'1030',pred_task_id:'EXT1',pred_type:'PR_FS',lag_hr_cnt:'0'}];m.indexes=new Map();
 const ignored=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',externalRelationshipMode:'ignore'}),'1030');
 const used=result(calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',externalRelationshipMode:'storedDates'}),'1030');
 assert.ok(used.es>ignored.es);assert.ok(used.es>=dt('2026-09-04 17:00'));
});

test('resource leveling serializes parallel tasks when a finite shared capacity is configured',()=>{
 const m=fresh();m.tables.get('TASK').rows=[];m.tables.get('TASKPRED').rows=[];m.tables.get('TASKRSRC').rows=[];m.indexes=new Map();
 addTask(m,'1',{task_id:'L1',task_code:'L1',task_name:'One',wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
 addTask(m,'1',{task_id:'L2',task_code:'L2',task_name:'Two',wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
 m.tables.get('TASKRSRC').rows.push({taskrsrc_id:'l1',task_id:'L1',rsrc_id:'200',remain_qty:'8',target_qty:'8'},{taskrsrc_id:'l2',task_id:'L2',rsrc_id:'200',remain_qty:'8',target_qty:'8'});m.indexes=new Map();
 const c=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',resourceLevelingEnabled:true,resourceCapacityOverrides:{'200':1},levelingGranularityHours:1});
 const a=result(c,'L1'),b=result(c,'L2');assert.ok(b.es>=a.ef||a.es>=b.ef);assert.ok(c.leveling.conflicts.some(x=>x.delayHours>0));
});

test('compatibility profile applies profile defaults while preserving explicit user overrides',()=>{
 const base=normalizeSchedulingOptions({relationshipLagCalendar:'24h'});const p=applyProfile(base,'p6v20');assert.equal(p.compatibilityProfile,'p6v20');assert.equal(p.outOfSequenceMode,'retainedLogic');
});

test('resource curves alter leveling demand when curve data is present',()=>{
 const m=fresh();m.tables.get('TASK').rows=[];m.tables.get('TASKPRED').rows=[];m.tables.get('TASKRSRC').rows=[];m.indexes=new Map();
 addTask(m,'1',{task_id:'C1',task_code:'C1',task_name:'Curve One',wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
 addTask(m,'1',{task_id:'C2',task_code:'C2',task_name:'Curve Two',wbs_id:'11',clndr_id:'100',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8'});
 m.tables.get('TASKRSRC').rows.push({taskrsrc_id:'c1',task_id:'C1',rsrc_id:'200',remain_qty:'8',target_qty:'8',rsrc_curve_id:'CURVE1'},{taskrsrc_id:'c2',task_id:'C2',rsrc_id:'200',remain_qty:'8',target_qty:'8',rsrc_curve_id:'CURVE1'});
 m.tables.set('RSRCCURVDATA',{name:'RSRCCURVDATA',fields:['rsrc_curve_id','curve_value'],rows:[{rsrc_curve_id:'CURVE1',curve_value:'200'},{rsrc_curve_id:'CURVE1',curve_value:'0'}]});m.indexes=new Map();
 const linear=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',resourceLevelingEnabled:true,resourceCapacityOverrides:{'200':2.1},resourceCurveMode:'ignore'});
 const curved=calculateCPM(m,'1',{dataDate:'2026-08-24 08:00',resourceLevelingEnabled:true,resourceCapacityOverrides:{'200':2.1},resourceCurveMode:'useCurves'});
 assert.equal(linear.leveling.conflicts.filter(x=>x.delayHours>0).length,0);
 assert.ok(curved.leveling.conflicts.some(x=>x.delayHours>0));
});
