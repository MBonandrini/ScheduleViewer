import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER } from '../src/parser.js';
import { serializeXER } from '../src/serializer.js';
import { EditHistory, addWBS, updateWBS, moveWBS, deleteWBS, reassignTasksToWBS, wbsDescendantIds, resequenceWBS } from '../src/editor.js';
import { buildWBSTree } from '../src/semantic.js';

const current=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');
const fresh=()=>parseXER(current);

test('WBS create supports root, child and sibling hierarchy',()=>{
  const m=fresh();
  const root=addWBS(m,'1','',{wbs_short_name:'NEW',wbs_name:'New Root'});
  const child=addWBS(m,'1',root.wbs_id,{wbs_short_name:'CH',wbs_name:'Child'});
  const sibling=addWBS(m,'1',root.wbs_id,{wbs_short_name:'SIB',wbs_name:'Sibling'});
  assert.equal(child.parent_wbs_id,root.wbs_id);
  assert.equal(sibling.parent_wbs_id,root.wbs_id);
  assert.deepEqual(new Set(wbsDescendantIds(m,root.wbs_id)),new Set([child.wbs_id,sibling.wbs_id]));
  assert.ok(buildWBSTree(m,'1').some(x=>x.wbs_id===root.wbs_id));
});

test('WBS update and reparent reject circular hierarchy',()=>{
  const m=fresh();
  const root=addWBS(m,'1','',{wbs_short_name:'R'});
  const child=addWBS(m,'1',root.wbs_id,{wbs_short_name:'C'});
  updateWBS(m,child.wbs_id,{wbs_name:'Changed'});
  assert.equal(m.find('PROJWBS','wbs_id',child.wbs_id).wbs_name,'Changed');
  assert.throws(()=>moveWBS(m,root.wbs_id,child.wbs_id),/descendants/);
});

test('activity reassignment moves activities between WBS elements',()=>{
  const m=fresh();
  const target=addWBS(m,'1','10',{wbs_short_name:'MOVE'});
  const before=m.find('TASK','task_id','1010').wbs_id;
  assert.notEqual(before,target.wbs_id);
  assert.equal(reassignTasksToWBS(m,['1010','1020'],target.wbs_id),2);
  assert.equal(m.find('TASK','task_id','1010').wbs_id,target.wbs_id);
  assert.equal(m.find('TASK','task_id','1020').wbs_id,target.wbs_id);
});

test('promoteContents removes WBS while preserving activities and children',()=>{
  const m=fresh();
  const holder=addWBS(m,'1','10',{wbs_short_name:'H'});
  const child=addWBS(m,'1',holder.wbs_id,{wbs_short_name:'HC'});
  reassignTasksToWBS(m,['1010'],holder.wbs_id);
  const taskCount=m.table('TASK').length;
  const r=deleteWBS(m,holder.wbs_id,{mode:'promoteContents',targetWbsId:'10'});
  assert.equal(r.deletedTasks,0);
  assert.equal(m.table('TASK').length,taskCount);
  assert.equal(m.find('TASK','task_id','1010').wbs_id,'10');
  assert.equal(m.find('PROJWBS','wbs_id',child.wbs_id).parent_wbs_id,'10');
  assert.equal(m.find('PROJWBS','wbs_id',holder.wbs_id),null);
});

test('deleteSubtree deletes descendant WBS, activities, relationships and assignments',()=>{
  const m=fresh();
  const holder=addWBS(m,'1','10',{wbs_short_name:'DEL'});
  const child=addWBS(m,'1',holder.wbs_id,{wbs_short_name:'DELC'});
  reassignTasksToWBS(m,['1010','1020'],child.wbs_id);
  const affectedRels=m.table('TASKPRED').filter(r=>['1010','1020'].includes(r.task_id)||['1010','1020'].includes(r.pred_task_id)).length;
  assert.ok(affectedRels>0);
  const r=deleteWBS(m,holder.wbs_id,{mode:'deleteSubtree'});
  assert.equal(r.deletedWbs,2);
  assert.equal(r.deletedTasks,2);
  assert.equal(m.find('TASK','task_id','1010'),null);
  assert.equal(m.find('TASK','task_id','1020'),null);
  assert.equal(m.table('TASKPRED').some(x=>['1010','1020'].includes(x.task_id)||['1010','1020'].includes(x.pred_task_id)),false);
  assert.equal(m.find('PROJWBS','wbs_id',holder.wbs_id),null);
  assert.equal(m.find('PROJWBS','wbs_id',child.wbs_id),null);
});

test('WBS sequence can be reordered and round-trips through XER',()=>{
  const m=fresh();
  resequenceWBS(m,'1','10',['12','11']);
  assert.equal(m.find('PROJWBS','wbs_id','12').seq_num,'1');
  assert.equal(m.find('PROJWBS','wbs_id','11').seq_num,'2');
  const rt=parseXER(serializeXER(m));
  assert.equal(rt.find('PROJWBS','wbs_id','12').seq_num,'1');
  assert.equal(rt.find('PROJWBS','wbs_id','11').seq_num,'2');
});

test('WBS edits participate in undo/redo history',()=>{
  const m=fresh(),h=new EditHistory(m);
  h.push('Add WBS');
  const w=addWBS(m,'1','10',{wbs_short_name:'UNDO'});
  assert.ok(m.find('PROJWBS','wbs_id',w.wbs_id));
  h.undo();
  assert.equal(m.find('PROJWBS','wbs_id',w.wbs_id),null);
  h.redo();
  assert.ok(m.find('PROJWBS','wbs_id',w.wbs_id));
});
