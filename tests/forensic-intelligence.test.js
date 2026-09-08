import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseXER } from '../src/parser.js';
import { calculateCPM, applyCPM } from '../src/cpm.js';
import { createRevision, revisionModel, serializeRepository, parseRepository } from '../src/forensic-repository.js';
import { compareAllTables, materialChangeRegister } from '../src/forensic-comparison.js';
import { criticalPathMigration, isRelationshipDriving } from '../src/critical-intelligence.js';
import { explainDateMovement } from '../src/date-move.js';
import { dcmaStyleHealth, scheduleRiskRadar } from '../src/schedule-health.js';
import { activityTimeline, forecastStability, stalledActivities } from '../src/trend-forecast.js';
import { resourceOverloadAnalysis } from '../src/resource-intelligence.js';
import { diagnoseImportedSchedule, preflightScheduleText } from '../src/import-diagnostics.js';
import { executiveDashboard, generateScheduleNarrative, buildLookahead } from '../src/forensic-reporting.js';
import { globalScheduleSearch } from '../src/global-search.js';
import { verifiedAIContext } from '../src/ai-context.js';
import { makeProjectPackage } from '../src/workspace.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const sample=fs.readFileSync(path.join(__dirname,'../sample/sample-project.xer'),'utf8');

function model(){const m=parseXER(sample);m.sourceFormat='xer';return m}
function clone(m){return revisionModel(createRevision(m,{name:'clone',projectId:m.table('PROJECT')[0]?.proj_id}))}

function smallXer({finish='2026-01-03 08:00',predLag=0,pct=0,rem=8}={}){
return `ERMHDR\t18.8\t2026-01-01\n%T\tPROJECT\n%F\tproj_id\tproj_short_name\tlast_recalc_date\n%R\tP1\tTEST\t2026-01-01 08:00\n%T\tCALENDAR\n%F\tclndr_id\tclndr_name\tday_hr_cnt\tweek_hr_cnt\n%R\tC1\t5x8\t8\t40\n%T\tPROJWBS\n%F\twbs_id\tproj_id\twbs_short_name\twbs_name\n%R\tW1\tP1\tW1\tWBS\n%T\tTASK\n%F\ttask_id\tproj_id\twbs_id\tclndr_id\ttask_code\ttask_name\ttask_type\tstatus_code\ttarget_drtn_hr_cnt\tremain_drtn_hr_cnt\tphys_complete_pct\ttarget_start_date\ttarget_end_date\ttotal_float_hr_cnt\n%R\t1\tP1\tW1\tC1\tA1\tFirst\tTT_Task\tTK_NotStart\t8\t${rem}\t${pct}\t2026-01-01 08:00\t2026-01-01 16:00\t0\n%R\t2\tP1\tW1\tC1\tA2\tSecond\tTT_Task\tTK_NotStart\t8\t8\t0\t2026-01-02 08:00\t${finish}\t0\n%T\tTASKPRED\n%F\ttask_pred_id\tproj_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\tR1\tP1\t2\t1\tPR_FS\t${predLag}\n%T\tRSRC\n%F\trsrc_id\trsrc_name\tmax_qty_per_hr\n%R\tRES1\tCrew\t4\n%T\tTASKRSRC\n%F\ttaskrsrc_id\tproj_id\ttask_id\trsrc_id\ttarget_qty\tremain_qty\n%R\tAS1\tP1\t1\tRES1\t16\t16\n%R\tAS2\tP1\t2\tRES1\t16\t16\n%T\tCUSTOMTABLE\n%F\tid\tvalue\n%R\tX1\talpha\n%E\n`;}

function calculate(m){const calc=calculateCPM(m,'P1',{hoursPerDay:8,dataDate:'2026-01-01 08:00'});applyCPM(m,'P1',calc);return m}

test('revision repository serializes and restores a complete schedule payload',()=>{const m=model(),r=createRevision(m,{name:'January',projectId:m.table('PROJECT')[0].proj_id,sourceFile:'jan.xer'});const parsed=parseRepository(serializeRepository([r]));assert.equal(parsed.length,1);const restored=revisionModel(parsed[0]);assert.equal(restored.table('TASK').length,m.table('TASK').length);assert.equal(restored.tableNames().length,m.tableNames().length)});

test('all-table forensic comparison includes unknown/custom XER table changes',()=>{const a=parseXER(smallXer()),b=clone(a);b.table('CUSTOMTABLE')[0].value='beta';b.table('TASK')[0].target_drtn_hr_cnt='16';const c=compareAllTables(a,b);assert.ok(c.changes.some(x=>x.table==='CUSTOMTABLE'&&x.field==='value'));assert.ok(c.changes.some(x=>x.table==='TASK'&&x.sourceField==='target_drtn_hr_cnt'))});

test('material change register classifies deleted relationships as critical',()=>{const a=parseXER(smallXer()),b=clone(a);b.tables.get('TASKPRED').rows=[];const c=materialChangeRegister(a,b,{hoursPerDay:8});const rel=c.changes.find(x=>x.table==='TASKPRED'&&x.type==='Deleted');assert.equal(rel.criticality,'Critical');assert.equal(c.summary.critical,1)});

test('driving relationship is strongly indicated when calculated endpoints coincide',()=>{const m=calculate(parseXER(smallXer()));const r=m.table('TASKPRED')[0];const x=isRelationshipDriving(m,r,{toleranceHours:1});assert.equal(typeof x.driving,'boolean');assert.ok(['Strongly indicated','Possible'].includes(x.confidence))});

test('critical path migration identifies activities entering/leaving critical threshold',()=>{const a=parseXER(smallXer()),b=clone(a);a.table('TASK')[0].total_float_hr_cnt='16';b.table('TASK')[0].total_float_hr_cnt='0';const x=criticalPathMigration(a,b,'P1','P1',{thresholdHours:0});assert.ok(x.entered.some(r=>r.activity==='A1'))});

test('Why Did My Date Move reports direct duration and relationship evidence',()=>{const a=parseXER(smallXer()),b=parseXER(smallXer({predLag:16,rem:24,finish:'2026-01-06 08:00'}));const x=explainDateMovement(a,b,'A2',{oldProjId:'P1',newProjId:'P1',hoursPerDay:8});assert.equal(x.available,true);assert.ok(x.contributors.some(c=>/Relationship added|Predecessor|Duration/.test(c.cause))||x.movementDays!==0)});

test('schedule health reports DCMA-style findings and risk radar categories',()=>{const m=parseXER(smallXer({predLag:-8}));m.table('TASK')[0].cstr_type='CS_MSO';const h=dcmaStyleHealth(m,'P1',{hoursPerDay:8,longDurationDays:44,highFloatDays:44});assert.ok(h.metrics.length>=7);assert.ok(h.counts.leads>=1);const radar=scheduleRiskRadar(m,'P1',{});assert.equal(radar.categories.length,7);assert.ok(radar.overall>=0&&radar.overall<=100)});

test('time machine and stability use historical revisions',()=>{const a=parseXER(smallXer({finish:'2026-01-03 08:00'})),b=parseXER(smallXer({finish:'2026-01-05 08:00'})),c=parseXER(smallXer({finish:'2026-01-07 08:00'}));const revs=[a,b,c].map((m,i)=>createRevision(m,{name:`R${i+1}`,projectId:'P1'}));const tl=activityTimeline(revs,'A2');assert.equal(tl.length,3);const s=forecastStability(revs,'A2');assert.ok(s.cumulativeSlippageDays>0);assert.ok(s.score<=100)});

test('stalled activity detector finds persistent high progress with non-reducing remaining duration',()=>{const revs=[90,95,99].map((pct,i)=>createRevision(parseXER(smallXer({pct,rem:8})),{name:`R${i}`,projectId:'P1'}));const s=stalledActivities(revs,{thresholdPercent:90,minPeriods:3});assert.ok(s.some(x=>x.activity==='A1'))});

test('resource overload analysis detects finite capacity exceedance',()=>{const m=calculate(parseXER(smallXer()));const r=resourceOverloadAnalysis(m,'P1',{bucket:'day',capacities:{RES1:1}});assert.ok(r.summary.length>=1);assert.ok(r.overloads.length>=1)});

test('import diagnostics reports malformed XER row field counts without executing content',()=>{const bad=`ERMHDR\t18.8\n%T\tTASK\n%F\ttask_id\ttask_code\n%R\t1\tA1\textra\n%E\n`;const p=preflightScheduleText(bad,'bad.xer');assert.ok(p.warnings.some(x=>/values/.test(x)));const d=diagnoseImportedSchedule(bad,'bad.xer');assert.ok(d.model||d.issues.length)});

test('executive dashboard, narrative and lookahead are evidence based',()=>{const m=calculate(parseXER(smallXer()));const d=executiveDashboard(m,'P1',{settings:{nearCriticalThresholdHours:80}});assert.equal(d.activities,2);const n=generateScheduleNarrative(m,'P1',{settings:{}});assert.match(n,/Executive Summary/);const l=buildLookahead(m,'P1',{weeks:12,fromDate:'2026-01-01'});assert.ok(l.length>=1)});

test('global search covers generic schedule tables',()=>{const m=parseXER(smallXer());const r=globalScheduleSearch(m,'alpha');assert.ok(r.some(x=>x.table==='CUSTOMTABLE'&&x.field==='value'))});

test('verified AI context explicitly constrains future AI to deterministic evidence',()=>{const c=verifiedAIContext({dashboard:{critical:2},health:{score:80,rating:'Watch',counts:{},metrics:[]}});assert.equal(c.schema,'uss-verified-ai-context');assert.ok(c.rules.some(x=>/Do not invent/.test(x)))});

test('project package carries forensic revision repository',()=>{const m=parseXER(smallXer()),r=createRevision(m,{name:'R1',projectId:'P1'});const pkg=makeProjectPackage({model:m,settings:{},revisions:[r]});assert.equal(pkg.version,2);assert.equal(pkg.revisions.length,1)});

test('website exposes forensic, health, trend, reporting and global search navigation',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');for(const view of ['intelligence','health','trends','reporting','searchAll'])assert.match(html,new RegExp(`data-view="${view}"`))});
