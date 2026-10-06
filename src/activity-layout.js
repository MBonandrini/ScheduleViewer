const sortCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
import { buildWBSTree, wbsRows, taskStart, taskFinish } from './semantic.js';

function cmpValue(a,b){return sortCollator.compare(String(a??''),String(b??''));}
function sortTasks(tasks,sort={field:'task_code',dir:1}){const field=sort?.field||'task_code',dir=Number(sort?.dir)||1;return [...tasks].sort((a,b)=>cmpValue(a?.[field],b?.[field])*dir||cmpValue(a?.task_code,b?.task_code));}
function minDate(a,b){if(!a)return b||null;if(!b)return a;return a<b?a:b;}
function maxDate(a,b){if(!a)return b||null;if(!b)return a;return a>b?a:b;}
function taskRange(tasks){let start=null,finish=null;for(const t of tasks){start=minDate(start,taskStart(t));finish=maxDate(finish,taskFinish(t));}return {start,finish};}

/**
 * Build a single display-row model shared by the Activities grid and the Gantt.
 * This is intentionally the source of truth for vertical ordering so selection,
 * WBS hierarchy and Gantt bars can never drift into different row orders.
 */
export function buildActivityRowModel(model,projId,tasks,{groupBy='',sort={field:'task_code',dir:1},wbsExpanded={},codeGroups=[]}={}){
  const input=[...tasks];
  if(!groupBy)return sortTasks(input,sort).map(t=>({kind:'activity',key:`task:${t.task_id}`,task:t,depth:0}));
  if(groupBy==='activity_codes'){
    if(!codeGroups.length)return sortTasks(input,sort).map(task=>({kind:'activity',key:`task:${task.task_id}`,task,depth:0}));
    const codes=new Map(model.table('ACTVCODE').map(c=>[String(c.actv_code_id),c])),links=new Map();
    for(const link of model.table('TASKACTV')){const c=codes.get(String(link.actv_code_id));if(!c)continue;const key=String(link.task_id)+':'+String(c.actv_code_type_id);links.set(key,c);}
    const out=[];const visit=(items,depth,path)=>{if(depth===codeGroups.length){for(const task of sortTasks(items,sort))out.push({kind:'activity',key:`task:${task.task_id}`,task,depth});return;}
      const buckets=new Map();for(const task of items){const c=links.get(String(task.task_id)+':'+codeGroups[depth]),key=String(c?.actv_code_id||'');if(!buckets.has(key))buckets.set(key,{code:c,tasks:[]});buckets.get(key).tasks.push(task);}
      for(const [key,b] of [...buckets].sort((a,b)=>cmpValue(a[1].code?.short_name,b[1].code?.short_name))){const branch=path+'/'+codeGroups[depth]+':'+key;out.push({kind:'group',key:'code:'+branch,label:b.code?.actv_code_name||b.code?.short_name||'Unassigned',depth,count:b.tasks.length,...taskRange(b.tasks)});visit(b.tasks,depth+1,branch);}
    };visit(input,0,'');return out;
  }
  if(groupBy!=='wbs_id'){
    const grouped=new Map();
    for(const t of input){const key=String(t?.[groupBy]??'');if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(t);}
    const keys=[...grouped.keys()].sort(cmpValue),out=[];
    for(const key of keys){const rows=sortTasks(grouped.get(key),sort),range=taskRange(rows);out.push({kind:'group',key:`group:${groupBy}:${key}`,groupBy,value:key,label:key||'Unassigned',sample:rows[0]||null,depth:0,count:rows.length,...range});for(const t of rows)out.push({kind:'activity',key:`task:${t.task_id}`,task:t,depth:1});}
    return out;
  }

  const wbsAll=wbsRows(model,projId),nodes=new Map(wbsAll.map(w=>[String(w.wbs_id),w])),byWbs=new Map(),unassigned=[];
  for(const t of input){const id=String(t.wbs_id||'');if(id&&nodes.has(id)){if(!byWbs.has(id))byWbs.set(id,[]);byWbs.get(id).push(t);}else unassigned.push(t);}
  for(const [id,rows] of byWbs)byWbs.set(id,sortTasks(rows,sort));

  const roots=buildWBSTree(model,projId),ordered=[],stack=[...roots].reverse();
  while(stack.length){const node=stack.pop();ordered.push(node);for(let i=node.children.length-1;i>=0;i--)stack.push(node.children[i]);}
  // Aggregate counts/ranges once, without copying each descendant task into every ancestor.
  const summaries=new Map();
  for(let i=ordered.length-1;i>=0;i--){const node=ordered[i],id=String(node.wbs_id),direct=byWbs.get(id)||[];let {start,finish}=taskRange(direct),count=direct.length;
    for(const child of node.children){const sum=summaries.get(String(child.wbs_id));count+=sum.count;start=minDate(start,sum.start);finish=maxDate(finish,sum.finish);}
    summaries.set(id,{count,start,finish});
  }
  const out=[],pending=roots.map(node=>({node,depth:0})).reverse();
  while(pending.length){const {node,depth}=pending.pop(),id=String(node.wbs_id),summary=summaries.get(id);if(!summary.count)continue;
    const direct=byWbs.get(id)||[],expanded=wbsExpanded[id]!==false;
    out.push({kind:'wbs',key:`wbs:${id}`,wbs:node,wbsId:id,depth,label:node.wbs_name||node.wbs_short_name||id,code:node.wbs_short_name||'',directCount:direct.length,...summary,expanded,hasChildren:node.children.some(c=>summaries.get(String(c.wbs_id)).count>0)});
    if(!expanded)continue;
    for(const t of direct)out.push({kind:'activity',key:`task:${t.task_id}`,task:t,depth:depth+1,wbsId:id});
    for(let i=node.children.length-1;i>=0;i--)pending.push({node:node.children[i],depth:depth+1});
  }
  if(unassigned.length){const rows=sortTasks(unassigned,sort),range=taskRange(rows);out.push({kind:'wbs',key:'wbs:__unassigned__',wbsId:'',depth:0,label:'Unassigned Activities',code:'',directCount:rows.length,count:rows.length,expanded:true,hasChildren:false,...range});for(const t of rows)out.push({kind:'activity',key:`task:${t.task_id}`,task:t,depth:1,wbsId:''});}
  return out;
}

export function visibleActivityTasks(rowModel){return rowModel.filter(r=>r.kind==='activity').map(r=>r.task);}
export function activityRowIndex(rowModel,taskId){return rowModel.findIndex(r=>r.kind==='activity'&&String(r.task?.task_id)===String(taskId));}
