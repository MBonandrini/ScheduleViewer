import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XERModel } from '../src/parser.js';
import { buildWBSTree } from '../src/semantic.js';
import { buildActivityRowModel, visibleActivityTasks } from '../src/activity-layout.js';
import { applyActivityPlanningEdit } from '../src/activity-editing.js';
import { isScheduleFileName, sortFolderEntries, writeFileHandle, writeScheduleToDirectory } from '../src/project-folder.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function model(tables){return new XERModel({header:[],warnings:[],sourceText:'',tables:new Map(Object.entries(tables).map(([name,rows])=>[name,{name,fields:[...new Set(rows.flatMap(r=>Object.keys(r)))],rows}]))});}

function hierarchyModel(){return model({
  PROJECT:[{proj_id:'1',last_recalc_date:'2026-09-14 08:00'}],
  PROJWBS:[
    {proj_id:'1',wbs_id:1,parent_wbs_id:'',seq_num:'1',wbs_short_name:'A',wbs_name:'Parent'},
    {proj_id:'1',wbs_id:'2',parent_wbs_id:1,seq_num:'1',wbs_short_name:'A.1',wbs_name:'Child'},
    {proj_id:'1',wbs_id:3,parent_wbs_id:'2',seq_num:'1',wbs_short_name:'A.1.1',wbs_name:'Grandchild'}
  ],
  TASK:[
    {proj_id:'1',task_id:'10',task_code:'A100',task_name:'Parent task',wbs_id:'1',clndr_id:'C1',target_start_date:'2026-09-14 08:00',target_end_date:'2026-09-14 16:00'},
    {proj_id:'1',task_id:'20',task_code:'A200',task_name:'Child task',wbs_id:2,clndr_id:'C1',target_start_date:'2026-09-15 08:00',target_end_date:'2026-09-15 16:00'},
    {proj_id:'1',task_id:'30',task_code:'A300',task_name:'Grand task',wbs_id:'3',clndr_id:'C1',target_start_date:'2026-09-16 08:00',target_end_date:'2026-09-16 16:00'}
  ],
  CALENDAR:[{clndr_id:'C1',day_hr_cnt:'8',clndr_data:''}]
});}

test('WBS tree follows parent-child relationships even when identifier types differ',()=>{
  const m=hierarchyModel(),tree=buildWBSTree(m,'1');
  assert.equal(tree.length,1);
  assert.equal(String(tree[0].wbs_id),'1');
  assert.equal(String(tree[0].children[0].wbs_id),'2');
  assert.equal(String(tree[0].children[0].children[0].wbs_id),'3');
});

test('activity and gantt row model preserves true WBS hierarchy and each activity exactly once',()=>{
  const m=hierarchyModel(),rows=buildActivityRowModel(m,'1',m.table('TASK'),{groupBy:'wbs_id'});
  assert.deepEqual(rows.map(r=>r.kind==='activity'?`T:${r.task.task_code}`:`W:${r.code}`),['W:A','T:A100','W:A.1','T:A200','W:A.1.1','T:A300']);
  assert.deepEqual(rows.filter(r=>r.kind==='wbs').map(r=>r.depth),[0,1,2]);
  assert.deepEqual(visibleActivityTasks(rows).map(t=>t.task_id),['10','20','30']);
});

test('collapsing a WBS hides descendants and direct activities without changing the underlying schedule',()=>{
  const m=hierarchyModel(),rows=buildActivityRowModel(m,'1',m.table('TASK'),{groupBy:'wbs_id',wbsExpanded:{'1':false}});
  assert.equal(rows.length,1);
  assert.equal(rows[0].kind,'wbs');
  assert.equal(m.table('TASK').length,3);
});

test('direct activity Start/Finish edit recalculates working duration but leaves calculated early dates for F9',()=>{
  const m=hierarchyModel(),t=m.find('TASK','task_id','10');
  t.early_start_date='2026-09-10 08:00';t.early_end_date='2026-09-10 16:00';t.status_code='TK_NotStart';t.complete_pct_type='CP_Phys';
  const result=applyActivityPlanningEdit(m,'1','10',{start:'2026-09-14 08:00',finish:'2026-09-15 16:00',percent:25},{dataDate:'2026-09-14 08:00'});
  assert.equal(result.requiresSchedule,true);
  assert.equal(t.target_start_date,'2026-09-14 08:00');
  assert.equal(t.target_end_date,'2026-09-15 16:00');
  assert.equal(Number(t.target_drtn_hr_cnt),16);
  assert.equal(Number(t.remain_drtn_hr_cnt),16);
  assert.equal(Number(t.phys_complete_pct),25);
  assert.equal(t.early_start_date,'2026-09-10 08:00');
  assert.equal(t.early_end_date,'2026-09-10 16:00');
});

test('duration-percent activity edit derives remaining duration before F9',()=>{
  const m=hierarchyModel(),t=m.find('TASK','task_id','10');t.complete_pct_type='CP_Drtn';t.status_code='TK_NotStart';
  applyActivityPlanningEdit(m,'1','10',{start:'2026-09-14 08:00',finish:'2026-09-15 16:00',percent:25},{dataDate:'2026-09-14 08:00'});
  assert.equal(Number(t.target_drtn_hr_cnt),16);
  assert.equal(Number(t.remain_drtn_hr_cnt),12);
});

test('project folder accepts only XER/XML schedules and sorts directories before files',()=>{
  assert.equal(isScheduleFileName('A.XER'),true);assert.equal(isScheduleFileName('plan.xml'),true);assert.equal(isScheduleFileName('readme.txt'),false);
  const sorted=sortFolderEntries([{kind:'file',name:'B.xer'},{kind:'directory',name:'Z'},{kind:'file',name:'A.xer'},{kind:'directory',name:'A'}]);
  assert.deepEqual(sorted.map(x=>`${x.kind}:${x.name}`),['directory:A','directory:Z','file:A.xer','file:B.xer']);
});



test('project-folder write helpers overwrite an open file or create a schedule in the selected folder',async()=>{
  const writes=[];
  const fileHandle={async createWritable(){return {async write(v){writes.push(v)},async close(){writes.push('CLOSED')}}}};
  await writeFileHandle(fileHandle,'XER-CONTENT');
  assert.deepEqual(writes,['XER-CONTENT','CLOSED']);
  let requested='';
  const directory={async getFileHandle(name,{create}={}){requested=`${name}:${create}`;return fileHandle;}};
  writes.length=0;
  const returned=await writeScheduleToDirectory(directory,'Project-01.xer','UPDATED');
  assert.equal(returned,fileHandle);
  assert.equal(requested,'Project-01.xer:true');
  assert.deepEqual(writes,['UPDATED','CLOSED']);
});

test('v6.3 app source dismisses menus, supports persisted projects folder save, and selection does not rerender the gantt',()=>{
  const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
  assert.match(app,/function closeP6Menus/);
  assert.match(app,/document\.addEventListener\('pointerdown'/);
  assert.match(app,/function saveCurrentSchedule/);
  assert.match(app,/writeFileHandle\(state\.projectFileHandle/);
  const select=app.match(/function selectTask\(id\)\{[^\n]+/s)?.[0]||'';
  assert.doesNotMatch(select,/renderGantt/);
  assert.match(select,/classList\.toggle\('selected'/);
});

test('v6.3 resource profiles expose always-visible Excel-ready audit table and copy command',()=>{
  const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
  assert.match(app,/Time-Phased Audit Table/);
  assert.match(app,/profileCopyExcel/);
  assert.match(app,/copyResourceAuditForExcel/);
  assert.match(app,/cumulative_planned/);
  assert.match(app,/cumulative_forecast/);
  assert.match(app,/Forecast vs Plan/);
});

test('v6.3 service worker includes hierarchy, activity editing and project folder modules',()=>{
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of ['activity-layout.js','activity-editing.js','project-folder.js'])assert.match(sw,new RegExp(file.replace('.','\\.')));
});
