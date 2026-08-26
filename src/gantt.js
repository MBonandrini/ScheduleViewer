import { p6Date, escapeHtml, num } from './parser.js';
import { taskStart, taskFinish } from './semantic.js';

export function renderGantt(container,tasks,{hoursPerDay=8,selectedTaskId='',onSelect=()=>{},baselineMap=null,showBaseline=true,dataDate=null,showProgress=true}={}) {
  if (!tasks.length) { container.innerHTML='<div class="empty">No activities to display.</div>'; return; }
  const valid=tasks.map(t=>({t,s:taskStart(t),f:taskFinish(t)})).filter(x=>x.s&&x.f);
  if(!valid.length){container.innerHTML='<div class="empty">No valid activity dates are available.</div>';return;}
  const baselineDates=baselineMap?[...baselineMap.values()].flatMap(x=>[x.start,x.finish]).filter(Boolean):[];
  let min=new Date(Math.min(...valid.map(x=>x.s),...baselineDates)), max=new Date(Math.max(...valid.map(x=>x.f),...baselineDates));
  const span=Math.max(86400000,max-min); min=new Date(min.getTime()-span*.02); max=new Date(max.getTime()+span*.02);
  const total=max-min; const pos=d=>Math.max(0,Math.min(100,(d-min)/total*100));
  const months=[]; let cursor=new Date(min.getFullYear(),min.getMonth(),1);
  while(cursor<=max){const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);months.push({label:cursor.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}),left:pos(cursor),width:Math.max(1,pos(next)-pos(cursor))});cursor=next;}
  const dd=p6Date(dataDate);const ddHtml=dd?`<i class="data-date-line" style="left:${pos(dd)}%" title="Data Date"></i>`:'';
  container.innerHTML=`<div class="gantt-head">${ddHtml}${months.map(m=>`<span style="left:${m.left}%;width:${m.width}%">${m.label}</span>`).join('')}</div><div class="gantt-body">${valid.map(({t,s,f})=>{
    const left=pos(s), width=Math.max(.35,pos(f)-left), critical=num(t.total_float_hr_cnt)<=0, milestone=/MILESTONE/i.test(t.task_type||'')||num(t.target_drtn_hr_cnt)===0;
    const bk=String(t.task_code||t.task_id||''), bl=baselineMap?.get(bk), bs=bl?.start, bf=bl?.finish;
    const blHtml=showBaseline&&bs&&bf?`<i class="baseline-bar" style="left:${pos(bs)}%;width:${Math.max(.35,pos(bf)-pos(bs))}%" title="Baseline ${escapeHtml(t.task_code||t.task_id)}"></i>`:'';
    const pct=Math.max(0,Math.min(100,num(t.phys_complete_pct||t.complete_pct)));const progressHtml=showProgress&&!milestone&&pct>0?`<i class="progress-bar" style="left:${left}%;width:${width*pct/100}%" title="${pct}% complete"></i>`:'';const actualS=p6Date(t.act_start_date),actualF=p6Date(t.act_end_date);const actualHtml=actualS?`<i class="actual-bar" style="left:${pos(actualS)}%;width:${Math.max(.25,pos(actualF||new Date(Math.min(max,Date.now())))-pos(actualS))}%" title="Actual"></i>`:'';
    return `<div class="gantt-row ${t.task_id===selectedTaskId?'selected':''}" data-id="${escapeHtml(t.task_id)}"><div class="gantt-grid"></div>${blHtml}${actualHtml}${progressHtml}${milestone?`<i class="milestone ${critical?'critical':''}" style="left:${left}%" title="${escapeHtml(t.task_code)}"></i>`:`<i class="bar ${critical?'critical':''}" style="left:${left}%;width:${width}%" title="${escapeHtml(t.task_code+' '+t.task_name)}"></i>`}</div>`;
  }).join('')}</div>`;
  container.querySelectorAll('.gantt-row').forEach(el=>el.addEventListener('click',()=>onSelect(el.dataset.id)));
}
