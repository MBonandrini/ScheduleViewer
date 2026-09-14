import { buildWBSTree, wbsRows, taskStart, taskFinish } from './semantic.js';

function cmpValue(a,b){return String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'});}
function sortTasks(tasks,sort={field:'task_code',dir:1}){const field=sort?.field||'task_code',dir=Number(sort?.dir)||1;return [...tasks].sort((a,b)=>cmpValue(a?.[field],b?.[field])*dir||cmpValue(a?.task_code,b?.task_code));}
function minDate(a,b){if(!a)return b||null;if(!b)return a;return a<b?a:b;}
function maxDate(a,b){if(!a)return b||null;if(!b)return a;return a>b?a:b;}
function taskRange(tasks){let start=null,finish=null;for(const t of tasks){start=minDate(start,taskStart(t));finish=maxDate(finish,taskFinish(t));}return {start,finish};}

/**
 * Build a single display-row model shared by the Activities grid and the Gantt.
 * This is intentionally the source of truth for vertical ordering so selection,
 * WBS hierarchy and Gantt bars can never drift into different row orders.
 */
export function buildActivityRowModel(model,projId,tasks,{groupBy='',sort={field:'task_code',dir:1},wbsExpanded={}}={}){
  const input=[...tasks];
  if(!groupBy)return sortTasks(input,sort).map(t=>({kind:'activity',key:`task:${t.task_id}`,task:t,depth:0}));
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

  // Keep ancestors of filtered activities visible so the tree remains structurally correct.
  const relevant=new Set();
  for(const id of byWbs.keys()){
    let cur=id,guard=0;
    while(cur&&guard++<1000){if(relevant.has(cur))break;relevant.add(cur);const n=nodes.get(cur);cur=String(n?.parent_wbs_id||'');}
  }

  const subtreeCache=new Map();
  const descendantTasks=node=>{
    const id=String(node.wbs_id);if(subtreeCache.has(id))return subtreeCache.get(id);
    let rows=[...(byWbs.get(id)||[])];for(const child of node.children||[])rows=rows.concat(descendantTasks(child));subtreeCache.set(id,rows);return rows;
  };
  const out=[];
  const walk=(node,depth)=>{
    const id=String(node.wbs_id);if(!relevant.has(id))return;
    const direct=byWbs.get(id)||[],subtree=descendantTasks(node),range=taskRange(subtree),expanded=wbsExpanded[id]!==false;
    out.push({kind:'wbs',key:`wbs:${id}`,wbs:node,wbsId:id,depth,label:node.wbs_name||node.wbs_short_name||id,code:node.wbs_short_name||'',directCount:direct.length,count:subtree.length,expanded,hasChildren:(node.children||[]).some(c=>relevant.has(String(c.wbs_id))),...range});
    if(!expanded)return;
    for(const t of direct)out.push({kind:'activity',key:`task:${t.task_id}`,task:t,depth:depth+1,wbsId:id});
    for(const child of node.children||[])walk(child,depth+1);
  };
  for(const root of buildWBSTree(model,projId))walk(root,0);
  if(unassigned.length){const rows=sortTasks(unassigned,sort),range=taskRange(rows);out.push({kind:'wbs',key:'wbs:__unassigned__',wbsId:'',depth:0,label:'Unassigned Activities',code:'',directCount:rows.length,count:rows.length,expanded:true,hasChildren:false,...range});for(const t of rows)out.push({kind:'activity',key:`task:${t.task_id}`,task:t,depth:1,wbsId:''});}
  return out;
}

export function visibleActivityTasks(rowModel){return rowModel.filter(r=>r.kind==='activity').map(r=>r.task);}
export function activityRowIndex(rowModel,taskId){return rowModel.findIndex(r=>r.kind==='activity'&&String(r.task?.task_id)===String(taskId));}
