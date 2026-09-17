import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Worker} from 'node:worker_threads';
import {model} from './helpers/model.mjs';
import {startRiskSimulation} from '../src/risk-client.js';
import {runQSRA} from '../src/v7-risk-engine.js';
import {buildActivityRowModel} from '../src/activity-layout.js';
import {renderGantt} from '../src/gantt.js';
import {EditHistory,updateTask,addTask,deleteTask,addRelationship,cloneTask} from '../src/editor.js';
import {serializeXER} from '../src/serializer.js';
import {parseXER} from '../src/parser.js';

test('risk worker executes production module on a real background thread',async()=>{
 const m=model([{},{}],[{pred_task_id:'1',task_id:'2'}]);
 const worker=new Worker(new URL('./helpers/risk-thread.mjs',import.meta.url));
 try{const result=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({tables:[...m.tables],projectId:'P',options:{iterations:200,seed:42}})});assert.deepEqual(result,runQSRA(m,'P',{iterations:200,seed:42}));}finally{await worker.terminate()}
});
test('risk client cancellation terminates job and ignores late result',async()=>{
 let instance;class FakeWorker{constructor(){instance=this}postMessage(data){this.sent=data}terminate(){this.terminated=true}}
 const job=startRiskSimulation(model([{}]),'P',{iterations:100,last:{large:'previous output'}},{WorkerClass:FakeWorker});job.cancel();instance.onmessage({data:{p50:123}});
 assert.equal((await job.promise).cancelled,true);assert.equal(instance.terminated,true);assert.equal(instance.sent.options.last,undefined);
});
test('worker failure becomes actionable result',async()=>{class BrokenWorker{constructor(){throw new Error('blocked worker')}}assert.match((await startRiskSimulation(model([{}]),'P',{}, {WorkerClass:BrokenWorker}).promise).error,/blocked worker/)});
test('20,000 level WBS renders iteratively and preserves task counts',()=>{
 const n=20000,m=model([{wbs_id:String(n-1)}],[],{PROJWBS:Array.from({length:n},(_,i)=>({proj_id:'P',wbs_id:String(i),parent_wbs_id:i?String(i-1):'',wbs_name:'WBS'}))});
 const rows=buildActivityRowModel(m,'P',m.table('TASK'),{groupBy:'wbs_id'});assert.equal(rows.length,n+1);assert.equal(rows[0].count,1);assert.equal(rows.at(-1).task.task_id,'1');
});
test('collapsed WBS preserves totals and omits descendants',()=>{const m=model([{wbs_id:'B'}],[],{PROJWBS:[{proj_id:'P',wbs_id:'A'},{proj_id:'P',wbs_id:'B',parent_wbs_id:'A'}]});const rows=buildActivityRowModel(m,'P',m.table('TASK'),{groupBy:'wbs_id',wbsExpanded:{A:false}});assert.equal(rows.length,1);assert.equal(rows[0].count,1)});
test('Gantt escapes imported labels and preserves shared row count',()=>{
 const m=model([{task_name:'<img src=x onerror=alert(1)>',target_start_date:'2026-01-01',target_end_date:'2026-01-02',wbs_id:'W'}],[],{PROJWBS:[{proj_id:'P',wbs_id:'W',wbs_name:'<script>bad</script>'}]});
 const container={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]},rows=buildActivityRowModel(m,'P',m.table('TASK'),{groupBy:'wbs_id'});
 renderGantt(container,m.table('TASK'),{rowModel:rows,barSettings:{labelMode:'name'}});assert.ok(!container.innerHTML.includes('<img'));assert.ok(!container.innerHTML.includes('<script>'));assert.equal((container.innerHTML.match(/class="gantt-row /g)||[]).length,1);assert.equal((container.innerHTML.match(/class="gantt-wbs-spacer"/g)||[]).length,1);
});
test('100k activity Gantt avoids spread argument limit',()=>{
 const tasks=Array.from({length:100000},(_,i)=>({task_id:String(i),target_start_date:'2026-01-01',target_end_date:'2026-01-02'}));
 const container={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};renderGantt(container,tasks);assert.ok(container.innerHTML.includes('data-id="99999"'));
});
test('editing, undo, redo and dependent deletion round-trip',()=>{
 const m=model([{},{}],[{task_pred_id:'1',pred_task_id:'1',task_id:'2'}],{TASKRSRC:[{taskrsrc_id:'1',task_id:'1',rsrc_id:'R'}]});const h=new EditHistory(m);
 h.push('name');updateTask(m,'1',{task_name:'Updated'});assert.equal(m.find('TASK','task_id','1').task_name,'Updated');h.undo();assert.equal(m.find('TASK','task_id','1').task_name,undefined);h.redo();assert.equal(m.find('TASK','task_id','1').task_name,'Updated');
 h.push('delete');deleteTask(m,'1');assert.equal(m.table('TASKRSRC').length,0);assert.equal(m.table('TASKPRED').length,0);h.undo();assert.equal(m.table('TASKRSRC').length,1);assert.equal(parseXER(serializeXER(m)).find('TASK','task_id','1').task_name,'Updated');
});
test('service worker preserves other apps caches and ignores external traffic',async()=>{
 const handlers={},deleted=[],scope='https://example.test/schedule/';
 const ctx={URL,fetch:async()=>({ok:true,clone(){return this}}),caches:{keys:async()=>['unrelated','schedule-studio-professional:https://example.test/other/:v7.0.0',`schedule-studio-professional:${scope}:v7.0.0`],delete:async key=>deleted.push(key)},self:{registration:{scope},addEventListener:(type,handler)=>handlers[type]=handler,clients:{claim:async()=>{}},skipWaiting(){}}};
 vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),ctx);
 let wait;handlers.activate({waitUntil:p=>wait=p});await wait;assert.deepEqual(deleted,[`schedule-studio-professional:${scope}:v7.0.0`]);
 for(const url of ['https://other.test/api','https://example.test/other/app.js']){let handled=false;handlers.fetch({request:{method:'GET',url},respondWith:()=>handled=true});assert.equal(handled,false)}
});
test('service worker serves network response if cache quota is exceeded',async()=>{
 const handlers={},response={ok:true,clone(){return this}},cache={put:async()=>{throw new Error('quota')}};
 const ctx={URL,fetch:async()=>response,caches:{open:async()=>cache},self:{registration:{scope:'https://example.test/app/'},addEventListener:(type,f)=>handlers[type]=f}};vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),ctx);
 let promise;handlers.fetch({request:{method:'GET',url:'https://example.test/app/index.html'},respondWith:p=>promise=p});assert.equal(await promise,response);
});
