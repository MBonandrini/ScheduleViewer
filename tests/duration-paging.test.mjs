import test from 'node:test';import assert from 'node:assert/strict';
import {durationHoursPerUnit,displayOriginalDuration,originalDurationHours} from '../src/duration-display.js';
import {pageActivityRows} from '../src/activity-paging.js';
const project={clndr_id:'P'},calendars={P:{day_hr_cnt:8,week_hr_cnt:40,month_hr_cnt:172},C:{day_hr_cnt:10,week_hr_cnt:50,month_hr_cnt:200}};
const model={find:(table,field,id)=>table==='PROJECT'?project:calendars[id]};
test('calendar duration units round trip without changing canonical hours',()=>{
 for(const task of [{proj_id:'1'},{proj_id:'1',clndr_id:'C'}])for(const unit of ['hours','days','weeks','months']){
  const factor=durationHoursPerUnit(model,task,unit),hours=80.25,display=displayOriginalDuration(hours,unit,factor);
  assert.equal(originalDurationHours(display,unit,factor),hours);
 }
 assert.equal(durationHoursPerUnit(model,{clndr_id:'C'},'months'),200);
 assert.equal(durationHoursPerUnit(model,{clndr_id:'missing'},'weeks',10),50);
 assert.equal(durationHoursPerUnit(model,{clndr_id:'missing'},'months',10),215);
 for(const value of ['',-1,'abc',Infinity])assert.throws(()=>originalDurationHours(value,'weeks',40));
});
test('large row pages retain WBS ancestors and cover every activity exactly once',()=>{
 const rows=[{kind:'wbs',key:'root',depth:0},{kind:'wbs',key:'child',depth:1},...Array.from({length:4000},(_,i)=>({kind:'activity',key:'a'+i,depth:2,task:{task_id:String(i)}}))];
 const ids=[];for(let page=0;page<17;page++){
  const result=pageActivityRows(rows,page);assert.ok(result.rows.length<=252);assert.equal(result.rows[0].key,'root');
  ids.push(...result.rows.filter(r=>r.kind==='activity').map(r=>r.task.task_id));
 }
 assert.equal(ids.length,4000);assert.equal(new Set(ids).size,4000);
 assert.equal(pageActivityRows(rows,999).page,16);assert.deepEqual(pageActivityRows([],5).rows,[]);
 assert.equal(pageActivityRows(rows,0,rows.length).rows.length,rows.length);
});
