import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {parseXER} from '../src/parser.js';import {makeBaseline,baselineRows,baselineSummary,setRole} from '../src/baselines.js';
const cur=parseXER(fs.readFileSync(new URL('../sample/sample-project.xer',import.meta.url),'utf8'));const old=parseXER(fs.readFileSync(new URL('../sample/sample-previous.xer',import.meta.url),'utf8'));
test('baseline matching and variance rows',()=>{const b=makeBaseline(old,old.table('PROJECT')[0]?.proj_id,{name:'BL1'});const rows=baselineRows(cur,cur.table('PROJECT')[0]?.proj_id,b,8);assert.ok(rows.length>0);assert.ok(rows.some(r=>r.matched));const s=baselineSummary(cur,cur.table('PROJECT')[0]?.proj_id,b,8);assert.ok(s.matched>0)});
test('baseline roles are unique',()=>{const a={id:'a',role:'Primary'},b={id:'b',role:'Secondary'};setRole([a,b],'b','Primary');assert.equal(a.role,'Unassigned');assert.equal(b.role,'Primary')});

test('baseline-only activities are retained in variance rows',()=>{const b=makeBaseline(old,old.table('PROJECT')[0]?.proj_id,{name:'BL1'});const fake=b.model.table('TASK')[0];b.model.table('TASK').push({...fake,task_id:'99999',task_code:'BL-ONLY',task_name:'Removed later'});const rows=baselineRows(cur,cur.table('PROJECT')[0]?.proj_id,b,8);assert.ok(rows.some(r=>r.status==='Baseline only'&&r.activity==='BL-ONLY'))});
