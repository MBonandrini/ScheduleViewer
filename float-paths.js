import { taskRows,predRows } from './semantic.js';
import { num } from './parser.js';
function score(t){return num(t.total_float_hr_cnt,1e12)}
export function traceFloatPaths(model,projId,targetTaskId,{maxPaths=10,maxDepth=200}={}){
 const tasks=new Map(taskRows(model,projId).map(t=>[String(t.task_id),t]));const incoming=new Map();for(const r of predRows(model,projId)){const k=String(r.task_id);if(!incoming.has(k))incoming.set(k,[]);incoming.get(k).push(r)}
 const target=String(targetTaskId);const paths=[];const dfs=(id,path,seen)=>{if(path.length>maxDepth||paths.length>=maxPaths)return;const rels=(incoming.get(id)||[]).filter(r=>tasks.has(String(r.pred_task_id))).sort((a,b)=>score(tasks.get(String(a.pred_task_id)))-score(tasks.get(String(b.pred_task_id))));if(!rels.length){paths.push([...path].reverse());return}for(const r of rels.slice(0,Math.max(2,maxPaths-paths.length))){const p=String(r.pred_task_id);if(seen.has(p))continue;const ns=new Set(seen);ns.add(p);dfs(p,[...path,{taskId:p,relationship:r}],ns)}};
 if(tasks.has(target))dfs(target,[{taskId:target,relationship:null}],new Set([target]));return paths.map((p,i)=>({rank:i+1,activities:p.map(x=>tasks.get(x.taskId)).filter(Boolean),relationships:p.map(x=>x.relationship).filter(Boolean),floatHours:Math.min(...p.map(x=>score(tasks.get(x.taskId))))}));
}
