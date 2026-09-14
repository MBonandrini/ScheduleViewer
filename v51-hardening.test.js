import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXER } from '../src/parser.js';
import { compareAllTables } from '../src/forensic-comparison.js';
import { createRevision, serializeRepository, parseRepository } from '../src/forensic-repository.js';
import { makeProjectPackage } from '../src/workspace.js';
import { serializeProjectPackage, parseProjectPackage } from '../src/project-package.js';
import { preflightScheduleText } from '../src/import-diagnostics.js';
import { DiagnosticLogger } from '../src/logger.js';
import { contentChecksum } from '../src/package-integrity.js';

function xer(taskId='1',relId='R1',customOrder=false){
 const rows=customOrder?'%R\tX2\tbeta\n%R\tX1\talpha':'%R\tX1\talpha\n%R\tX2\tbeta';
 return `ERMHDR\t18.8\t2026-01-01\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\n%R\tP1\tTEST\n%T\tTASK\n%F\ttask_id\tproj_id\ttask_code\ttask_name\ttarget_drtn_hr_cnt\n%R\t${taskId}\tP1\tA1\tActivity One\t8\n%R\t2\tP1\tA2\tActivity Two\t8\n%T\tTASKPRED\n%F\ttask_pred_id\tproj_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\t${relId}\tP1\t2\t${taskId}\tPR_FS\t0\n%T\tCUSTOMTABLE\n%F\tid\tvalue\n${rows}\n%E\n`;
}

test('activity comparison uses stable Activity ID when internal task_id changes',()=>{
 const a=parseXER(xer('1','R1')),b=parseXER(xer('999','R77'));
 b.table('TASKPRED')[0].pred_task_id='999';
 const c=compareAllTables(a,b);
 assert.equal(c.changes.filter(x=>x.table==='TASK'&&(x.type==='Added'||x.type==='Deleted')).length,0);
});

test('relationship comparison ignores volatile relationship record IDs',()=>{
 const a=parseXER(xer('1','R1')),b=parseXER(xer('1','R999'));
 const c=compareAllTables(a,b);
 assert.equal(c.changes.filter(x=>x.table==='TASKPRED').length,1); // only raw task_pred_id field changed
 assert.equal(c.changes.find(x=>x.table==='TASKPRED').sourceField,'task_pred_id');
});

test('unknown table row reordering does not create false changes when stable ID exists',()=>{
 const a=parseXER(xer('1','R1',false)),b=parseXER(xer('1','R1',true));
 assert.equal(compareAllTables(a,b).changes.filter(x=>x.table==='CUSTOMTABLE').length,0);
});

test('project packages carry and verify corruption checksum',()=>{
 const m=parseXER(xer());const pkg=makeProjectPackage({model:m,settings:{}});
 assert.equal(pkg.version,2);assert.match(pkg.checksum,/^fnv1a32-/);
 const parsed=parseProjectPackage(serializeProjectPackage(pkg));assert.equal(parsed.checksum,pkg.checksum);
 const bad={...pkg,sourceFormat:'tampered'};
 assert.throws(()=>parseProjectPackage(JSON.stringify(bad)),/checksum/i);
});

test('revision repository checksum detects modification and duplicate IDs',()=>{
 const m=parseXER(xer()),r=createRevision(m,{name:'R1',projectId:'P1'});const text=serializeRepository([r]);
 assert.equal(parseRepository(text).length,1);
 const obj=JSON.parse(text);obj.revisions[0].name='tampered';assert.throws(()=>parseRepository(JSON.stringify(obj)),/checksum/i);
 const dup=JSON.parse(serializeRepository([r,r]));delete dup.checksum;assert.throws(()=>parseRepository(JSON.stringify(dup)),/Duplicate revision ID/);
});

test('import preflight rejects NUL bytes, extreme field counts and overlong lines',()=>{
 assert.equal(preflightScheduleText('ERMHDR\t18.8\u0000\n','bad.xer').ok,false);
 const many='%F\t'+Array.from({length:12},(_,i)=>`f${i}`).join('\t');
 const x=`ERMHDR\t18.8\n%T\tTASK\n${many}\n%E\n`;
 assert.equal(preflightScheduleText(x,'bad.xer',{maxFields:10}).ok,false);
 assert.equal(preflightScheduleText('ERMHDR\t18.8\n%T\tTASK\n'+('x'.repeat(101)),'bad.xer',{maxLineLength:100}).ok,false);
});

test('diagnostic logger redacts secret-like context and bounds history',()=>{
 const l=new DiagnosticLogger({level:'DEBUG',maxEntries:2});l.info('m','p','one',{token:'abc',task:'A1'});l.warn('m','p','two',{});l.error('m','p','three',{});
 assert.equal(l.entries.length,2);assert.equal(JSON.parse(l.export()).entries.length,2);
 const r=new DiagnosticLogger({level:'DEBUG'});r.info('m','p','safe',{password:'secret',activity:'A1'});assert.equal(r.entries[0].context.password,'<redacted>');
});

test('content checksum is deterministic across object key order',()=>{
 assert.equal(contentChecksum({b:2,a:1}),contentChecksum({a:1,b:2}));
});
