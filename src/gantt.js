import { p6Date, escapeHtml, num } from './parser.js';
import { taskStart, taskFinish } from './semantic.js';

/**
 * Primavera-inspired Gantt renderer.
 * A shared rowModel may be supplied by the Activities grid. When present it is
 * the sole source of vertical ordering, which prevents table/Gantt row drift.
 */
export function renderGantt(container,tasks,{hoursPerDay=8,selectedTaskId='',onSelect=()=>{},baselineMap=null,showBaseline=true,dataDate=null,showProgress=true,groupBy='',groupLabel=null,relationships=[],zoom=1,maxRelationshipLines=1500,rowModel=null}={}) {
  if (!tasks.length) { container.innerHTML='<div class="empty">No activities to display.</div>'; return; }

  const dated=tasks.map(t=>({t,s:taskStart(t),f:taskFinish(t)})).filter(x=>x.s&&x.f);
  if(!dated.length){container.innerHTML='<div class="empty">No valid activity dates are available.</div>';return;}

  const baselineDates=baselineMap?[...baselineMap.values()].flatMap(x=>[x.start,x.finish]).filter(Boolean):[];
  const allDates=[...dated.flatMap(x=>[x.s,x.f]),...baselineDates];
  const rawMin=new Date(Math.min(...allDates)),rawMax=new Date(Math.max(...allDates)),rawSpan=Math.max(86400000,rawMax-rawMin);
  const z=Math.max(1,Number(zoom)||1),center=(rawMin.getTime()+rawMax.getTime())/2,visibleSpan=rawSpan/z;
  let min=new Date(center-visibleSpan/2),max=new Date(center+visibleSpan/2);const pad=Math.max(86400000,visibleSpan*.02);min=new Date(min.getTime()-pad);max=new Date(max.getTime()+pad);
  const total=Math.max(1,max-min),pos=d=>Math.max(0,Math.min(100,(d-min)/total*100));

  const months=[];let cursor=new Date(min.getFullYear(),min.getMonth(),1);
  while(cursor<=max){const next=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);months.push({label:cursor.toLocaleDateString('en-GB',{month:'short',year:'numeric'}),left:pos(cursor),width:Math.max(.5,pos(next)-pos(cursor))});cursor=next;}
  const dd=p6Date(dataDate),ddHtml=dd?`<i class="data-date-line" style="left:${pos(dd)}%" title="Data Date ${escapeHtml(String(dataDate||''))}"></i>`:'';

  const groupRanges=new Map();
  if(!rowModel&&groupBy){for(const t of tasks){const key=String(t[groupBy]??''),s=taskStart(t),f=taskFinish(t);if(!s||!f)continue;const g=groupRanges.get(key)||{s,f};if(s<g.s)g.s=s;if(f>g.f)g.f=f;groupRanges.set(key,g);}}

  const rows=[],taskPos=new Map();
  const activityRow=t=>{
    const s=taskStart(t),f=taskFinish(t),critical=num(t.total_float_hr_cnt)<=0,milestone=/MILESTONE/i.test(t.task_type||'')||num(t.target_drtn_hr_cnt)===0,id=String(t.task_id);
    if(!s||!f){rows.push(`<div class="gantt-row gantt-row-undated ${id===String(selectedTaskId)?'selected':''}" data-id="${escapeHtml(id)}"><div class="gantt-grid"></div><span class="undated-label">No valid dates</span></div>`);return;}
    const left=pos(s),finish=pos(f),width=Math.max(.35,finish-left);taskPos.set(id,{start:left,finish,y:0,critical});
    const bk=String(t.task_code||t.task_id||''),bl=baselineMap?.get(bk),bs=bl?.start,bf=bl?.finish;
    const blHtml=showBaseline&&bs&&bf?`<i class="baseline-bar" style="left:${pos(bs)}%;width:${Math.max(.35,pos(bf)-pos(bs))}%" title="Baseline ${escapeHtml(t.task_code||t.task_id)}"></i>`:'';
    const pct=Math.max(0,Math.min(100,num(t.phys_complete_pct||t.complete_pct))),progressHtml=showProgress&&!milestone&&pct>0?`<i class="progress-bar" style="left:${left}%;width:${Math.max(.2,width*pct/100)}%" title="${pct}% complete"></i>`:'';
    const actualS=p6Date(t.act_start_date),actualF=p6Date(t.act_end_date),actualHtml=actualS?`<i class="actual-bar" style="left:${pos(actualS)}%;width:${Math.max(.25,pos(actualF||new Date(Math.min(max,Date.now())))-pos(actualS))}%" title="Actual"></i>`:'';
    rows.push(`<div class="gantt-row ${id===String(selectedTaskId)?'selected':''}" data-id="${escapeHtml(id)}"><div class="gantt-grid"></div>${blHtml}${actualHtml}${progressHtml}${milestone?`<i class="milestone ${critical?'critical':''}" style="left:${left}%" title="${escapeHtml(t.task_code||'Milestone')}"></i>`:`<i class="bar ${critical?'critical':''}" style="left:${left}%;width:${width}%" title="${escapeHtml((t.task_code||'')+' '+(t.task_name||''))}"></i>`}</div>`);
  };

  if(rowModel?.length){
    for(const row of rowModel){
      if(row.kind==='activity'){activityRow(row.task);continue;}
      const s=row.start,f=row.finish;
      const depth=Math.max(0,Number(row.depth)||0),label=row.code?`${row.code} — ${row.label||''}`:(row.label||row.value||'Group');
      if(row.kind==='wbs'){
        // WBS rows are hierarchy separators, not schedule activities. Keep the
        // row so it stays vertically aligned with the Activities grid, but do
        // not paint a yellow band or a summary/activity bar across the Gantt.
        // This mirrors the Schedule AI Toolkit/P6-style hierarchy treatment:
        // activity and milestone bars alone occupy the time chart.
        rows.push(`<div class="gantt-wbs-spacer" data-row-key="${escapeHtml(row.key||'')}" style="--group-depth:${depth}" aria-label="${escapeHtml(label)}"><div class="gantt-grid"></div></div>`);
      }else{
        const summary=s&&f?`<i class="summary-bar" style="left:${pos(s)}%;width:${Math.max(.4,pos(f)-pos(s))}%"></i>`:'';
        rows.push(`<div class="gantt-group-row" data-row-key="${escapeHtml(row.key||'')}" style="--group-depth:${depth}">${summary}<span class="gantt-group-label">${escapeHtml(label)}</span></div>`);
      }
    }
  }else{
    let lastGroup=Symbol('start');
    for(const t of tasks){
      if(groupBy){const raw=String(t[groupBy]??'');if(raw!==lastGroup){const label=groupLabel?groupLabel(t):(raw||'Unassigned'),g=groupRanges.get(raw),summary=g?`<i class="summary-bar" style="left:${pos(g.s)}%;width:${Math.max(.4,pos(g.f)-pos(g.s))}%"></i>`:'';rows.push(`<div class="gantt-group-row">${summary}<span class="gantt-group-label">${escapeHtml(label)}</span></div>`);lastGroup=raw;}}
      activityRow(t);
    }
  }

  container.innerHTML=`<div class="gantt-head">${ddHtml}${months.map(m=>`<span style="left:${m.left}%;width:${m.width}%">${m.label}</span>`).join('')}</div><div class="gantt-body">${rows.join('')}</div>`;
  const body=container.querySelector('.gantt-body');
  container.querySelectorAll('.gantt-row').forEach(el=>el.addEventListener('click',()=>onSelect(el.dataset.id)));

  if(body&&relationships?.length&&relationships.length<=maxRelationshipLines){
    const width=body.scrollWidth||body.clientWidth||900,height=body.scrollHeight||1;
    for(const [id,p] of taskPos){const el=body.querySelector(`.gantt-row[data-id="${cssEscape(id)}"]`);if(el)p.y=el.offsetTop+el.offsetHeight/2;}
    const paths=[];
    for(const r of relationships){const p=taskPos.get(String(r.pred_task_id)),s=taskPos.get(String(r.task_id));if(!p||!s||!p.y||!s.y)continue;const typ=String(r.pred_type||'FS').replace(/^PR_/,'').toUpperCase();const pPct=(typ==='SS'||typ==='SF')?p.start:p.finish,sPct=(typ==='FF'||typ==='SF')?s.finish:s.start,x1=pPct/100*width,x2=sPct/100*width,y1=p.y,y2=s.y,jog=x2>=x1?Math.max(x1+8,(x1+x2)/2):x1+12;paths.push(`<path class="gantt-link${s.critical?' critical-link':''}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${jog.toFixed(1)} V ${y2.toFixed(1)} H ${x2.toFixed(1)}" marker-end="url(#arrow)"/>`);}
    if(paths.length){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','gantt-links');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.innerHTML=`<defs><marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="currentColor"/></marker></defs>${paths.join('')}`;body.appendChild(svg);}
  }
}

function cssEscape(value){return globalThis.CSS?.escape?CSS.escape(String(value)):String(value).replace(/["\\]/g,'\\$&');}
