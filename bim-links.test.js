import test from 'node:test';
import assert from 'node:assert/strict';
import {parseXER} from '../src/parser.js';
import {serializeXER} from '../src/serializer.js';
import {BIM_UDF_CHUNK,encodeBimLinks,decodeBimLinks,chunkBimPayload,setActivityBimLinks,getActivityBimLinks,addActivityBimLinks,removeActivityBimLinks,makeBimSidecar,applyBimSidecar,normalizeModelMetadata} from '../src/bim-links.js';

const base=`ERMHDR\t24.12\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\t1\tTEST\n%T\tTASK\n%F\ttask_id\tproj_id\ttask_code\ttask_name\n%R\t10\t1\tA100\tActivity 100\n%R\t20\t1\tA200\tActivity 200\n%E\n`;

test('BIM link payload encoding round-trips delimiters and unicode',()=>{
  const links=[{modelKey:'MEP A',objectId:'GUID/1;2~3'},{modelKey:'结构',objectId:'对象-22'}];
  assert.deepEqual(decodeBimLinks(encodeBimLinks(links)),links);
});

test('BIM payload chunks stay within configured size for ordinary IDs',()=>{
  const links=Array.from({length:60},(_,i)=>({modelKey:'MODEL',objectId:`GUID-${String(i).padStart(4,'0')}-abcdefghijklmnop`}));
  const chunks=chunkBimPayload(links);assert.ok(chunks.length>1);assert.ok(chunks.every(x=>x.length<=BIM_UDF_CHUNK));
});

test('Activity BIM links create TASK FT_TEXT UDFs and UDFVALUE rows',()=>{
  const m=parseXER(base);setActivityBimLinks(m,'1','10',[{modelKey:'M1',objectId:'G1'},{modelKey:'M1',objectId:'G2'}]);
  const type=m.table('UDFTYPE').find(x=>x.udf_type_label==='BIM_LINK_01');assert.equal(type.table_name,'TASK');assert.equal(type.logical_data_type,'FT_TEXT');
  const value=m.table('UDFVALUE').find(x=>x.fk_id==='10'&&x.udf_type_id===type.udf_type_id);assert.ok(value.udf_text.startsWith('v1|'));
  assert.deepEqual(getActivityBimLinks(m,'10'),[{modelKey:'M1',objectId:'G1'},{modelKey:'M1',objectId:'G2'}]);
});

test('BIM links survive XER serialize and re-import',()=>{
  const m=parseXER(base);setActivityBimLinks(m,'1','10',[{modelKey:'ARCH',objectId:'REVIT-123'}]);
  const again=parseXER(serializeXER(m));assert.deepEqual(getActivityBimLinks(again,'10'),[{modelKey:'ARCH',objectId:'REVIT-123'}]);
});

test('Adding/removing BIM links preserves other links and cleans activity values',()=>{
  const m=parseXER(base);setActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'1'}]);addActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'2'},{modelKey:'M',objectId:'1'}]);
  assert.equal(getActivityBimLinks(m,'10').length,2);removeActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'1'}]);assert.deepEqual(getActivityBimLinks(m,'10'),[{modelKey:'M',objectId:'2'}]);
});

test('BIM sidecar exports and re-applies links',()=>{
  const m=parseXER(base);setActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'1'}]);
  const side=makeBimSidecar(m,'1',{models:[{modelKey:'M',name:'Main'}]});const n=parseXER(base);const r=applyBimSidecar(n,'1',side);assert.equal(r.linkCount,1);assert.deepEqual(getActivityBimLinks(n,'10'),[{modelKey:'M',objectId:'1'}]);
});

test('Model metadata normalization uses stable IDs and ignores unidentifiable objects',()=>{
  const m=normalizeModelMetadata({modelKey:'NWD01',name:'Federated',revision:'R7',objects:[{guid:'g1',name:'Pipe',level:'L2'},{name:'No ID'}]},'meta.json');
  assert.equal(m.modelKey,'NWD01');assert.equal(m.version,'R7');assert.equal(m.objects.length,1);assert.equal(m.objects[0].objectId,'g1');
});

import {deleteTask} from '../src/editor.js';
import {cloneWBSBranch} from '../src/wbs-tools.js';

test('Deleting an activity removes its TASK UDF BIM values',()=>{
  const m=parseXER(base);setActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'X'}]);assert.equal(getActivityBimLinks(m,'10').length,1);deleteTask(m,'10');
  const bimTypeIds=new Set(m.table('UDFTYPE').filter(u=>u.udf_type_label?.startsWith('BIM_LINK_')).map(u=>u.udf_type_id));
  assert.equal(m.table('UDFVALUE').filter(v=>v.fk_id==='10'&&bimTypeIds.has(v.udf_type_id)).length,0);
});

test('Duplicating a WBS branch carries BIM activity UDF links to copied activities',()=>{
  const text=`ERMHDR\t24.12\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\t1\tTEST\n%T\tPROJWBS\n%F\twbs_id\tproj_id\tparent_wbs_id\tseq_num\twbs_short_name\twbs_name\n%R\t100\t1\t\t1\tROOT\tRoot\n%T\tTASK\n%F\ttask_id\tproj_id\twbs_id\ttask_code\ttask_name\n%R\t10\t1\t100\tA100\tActivity 100\n%E\n`;
  const m=parseXER(text);setActivityBimLinks(m,'1','10',[{modelKey:'M',objectId:'G1'}]);const r=cloneWBSBranch(m,'100',{includeActivities:true});
  const copied=m.table('TASK').find(t=>t.wbs_id===r.rootWbsId);assert.ok(copied);assert.deepEqual(getActivityBimLinks(m,copied.task_id),[{modelKey:'M',objectId:'G1'}]);
});
