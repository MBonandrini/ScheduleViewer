import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXER, XERModel, p6Date } from '../src/parser.js';
import { serializeXER } from '../src/serializer.js';
import { exportMSPXML } from '../src/format-adapters.js';
import { validateModelIntegrity } from '../src/integrity.js';
import { runTransaction } from '../src/transaction.js';
import { semanticFingerprint } from '../src/determinism.js';
import { toXmlLocal } from '../src/date-local.js';

const sample=fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8');

test('integrity validator accepts bundled golden sample',()=>{
  const m=parseXER(sample); const r=validateModelIntegrity(m,{projectId:m.table('PROJECT')[0]?.proj_id});
  assert.equal(r.ok,true, r.issues.map(x=>x.message).join('\n'));
});

test('integrity validator catches dangling relationship and assignment references',()=>{
  const m=parseXER(sample); m.table('TASKPRED').push({task_pred_id:'99999',proj_id:m.table('PROJECT')[0].proj_id,task_id:'missing',pred_task_id:'missing2',pred_type:'PR_FS',lag_hr_cnt:'0'});
  m.table('TASKRSRC').push({taskrsrc_id:'99999',task_id:'missing',rsrc_id:'missing'});
  const r=validateModelIntegrity(m); assert.equal(r.ok,false); assert.ok(r.errors.some(x=>x.code==='REL_PRED_MISSING')); assert.ok(r.errors.some(x=>x.code==='ASSIGN_TASK_MISSING'));
});

test('transaction rolls back all table mutations when integrity fails',()=>{
  const m=parseXER(sample); const before=semanticFingerprint(m);
  assert.throws(()=>runTransaction(m,'bad edit',()=>{m.table('TASK')[0].wbs_id='does-not-exist'}),/structurally invalid/);
  assert.equal(semanticFingerprint(m),before);
});

test('XER serialization is deterministic and non-mutating',()=>{
  const a=parseXER(sample); const before=semanticFingerprint(a); const x1=serializeXER(a); const x2=serializeXER(a);
  assert.equal(x1,x2); assert.equal(semanticFingerprint(a),before);
});

test('XER semantic round trip retains deterministic fingerprint',()=>{
  const a=parseXER(sample); const b=parseXER(serializeXER(a)); assert.equal(semanticFingerprint(a),semanticFingerprint(b));
});

test('MSP XML export is deterministic and non-mutating',()=>{
  const m=parseXER(sample); const p=m.table('PROJECT')[0]?.proj_id; const before=semanticFingerprint(m); const a=exportMSPXML(m,p); const b=exportMSPXML(m,p);
  assert.equal(a,b); assert.equal(semanticFingerprint(m),before); assert.match(a,/^<\?xml/);
});

test('local project dates are formatted without timezone shifting',()=>{
  assert.equal(toXmlLocal('2026-03-29 00:30:00'),'2026-03-29T00:30:00');
  assert.equal(toXmlLocal('2026-10-25T01:30:00Z'),'2026-10-25T01:30:00');
});

test('p6Date parses date-only value as local midnight',()=>{
  const d=p6Date('2026-08-24'); assert.equal(d.getFullYear(),2026); assert.equal(d.getMonth(),7); assert.equal(d.getDate(),24); assert.equal(d.getHours(),0);
});

test('model index uses string-normalized identifiers',()=>{
  const tables=new Map([['TASK',{name:'TASK',fields:['task_id'],rows:[{task_id:123}]}]]); const m=new XERModel({header:[],tables,warnings:[],sourceText:''});
  assert.equal(m.find('TASK','task_id','123')?.task_id,123);
});

test('MSP XML golden export is structurally complete for browser re-import',()=>{
  const a=parseXER(sample), p=a.table('PROJECT')[0]?.proj_id, xml=exportMSPXML(a,p);
  assert.match(xml,/^<\?xml version="1.0"/); assert.match(xml,/<Project xmlns="http:\/\/schemas.microsoft.com\/project">/);
  assert.match(xml,/<Tasks>[\s\S]*<\/Tasks>/); assert.match(xml,/<Resources>[\s\S]*<\/Resources>/); assert.match(xml,/<Assignments>[\s\S]*<\/Assignments>/); assert.match(xml,/<Calendars>[\s\S]*<\/Calendars>/); assert.match(xml,/<\/Project>$/);
});
