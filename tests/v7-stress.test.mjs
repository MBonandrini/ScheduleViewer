import test from 'node:test';
import assert from 'node:assert/strict';
import {XERModel} from '../src/parser.js';
import {scheduleAssurance} from '../src/v7-schedule-assurance.js';
import {networkIntelligence} from '../src/v7-network-intelligence.js';
import {runQSRA} from '../src/v7-risk-engine.js';

function bigModel(n=50000){
 const tables=new Map();
 const put=(name,rows)=>tables.set(name,{name,fields:rows.length?[...new Set(Object.keys(rows[0]))]:[],rows});
 put('PROJECT',[{proj_id:'P',proj_short_name:'Stress',last_recalc_date:'2026-06-01 17:00'}]);
 put('PROJWBS',[{proj_id:'P',wbs_id:'W',wbs_name:'Stress',wbs_short_name:'1'}]);
 put('CALENDAR',[{clndr_id:'C',clndr_name:'5 Day',clndr_data:''}]);
 const tasks=Array.from({length:n},(_,i)=>({proj_id:'P',task_id:String(i+1),task_code:`A${String(i+1).padStart(6,'0')}`,task_name:`Activity ${i+1}`,wbs_id:'W',clndr_id:'C',task_type:'TT_Task',status_code:'TK_NotStart',target_drtn_hr_cnt:'8',remain_drtn_hr_cnt:'8',target_start_date:'2026-01-05 08:00',target_end_date:'2026-01-05 17:00',phys_complete_pct:'0',total_float_hr_cnt:String(i%20)}));
 put('TASK',tasks);
 const rels=[];
 for(let i=2;i<=n;i++){
   rels.push({proj_id:'P',pred_task_id:String(i-1),task_id:String(i),pred_type:'PR_FS',lag_hr_cnt:'0'});
   if(i>2) rels.push({proj_id:'P',pred_task_id:String(i-2),task_id:String(i),pred_type:'PR_FS',lag_hr_cnt:'0'});
 }
 put('TASKPRED',rels);
 put('TASKRSRC',[]); put('RSRC',[]); put('TASKACTV',[]); put('ACTVCODE',[]); put('ACTVTYPE',[]);
 return new XERModel({header:[],tables,warnings:[],sourceText:''});
}

test('50k activity / ~100k relationship assurance and network stress', {timeout:30000}, ()=>{
 const m=bigModel(50000);
 const a=scheduleAssurance(m,'P',{hoursPerDay:8,mergeHotspotPreds:5,mergeHotspotSuccs:5});
 assert.equal(a.counts.activities,50000);
 assert.equal(a.counts.relationships,99997);
 assert.ok(a.checks.length>=50);
 const n=networkIntelligence(m,'P',{mergeThreshold:5,divergenceThreshold:5});
 assert.equal(n.nodes.length,50000);
 assert.equal(n.relationships,99997);
 assert.equal(n.components.length,1);
 assert.ok(n.density>1.9);
});

test('5,000-iteration QSRA volume and determinism smoke', {timeout:30000}, ()=>{
 const m=bigModel(180);
 const opts={iterations:5000,seed:2026,distribution:'pert',minFactor:.85,modeFactor:1,maxFactor:1.3};
 const a=runQSRA(m,'P',opts),b=runQSRA(m,'P',opts);
 assert.equal(a.error,undefined);
 assert.equal(a.iterations,5000);
 assert.equal(a.p80,b.p80);
 assert.equal(a.histogram.reduce((s,x)=>s+x.count,0),5000);
});
