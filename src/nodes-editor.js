import {escapeHtml as esc} from './parser.js';
/** Validate prospective relationships before taking an undo checkpoint or changing tables. */
export function validateNodeRelationship(tasks,relationships,{id='',pred,succ,type='PR_FS',lag=0}){
 const ids=new Set(tasks.map(t=>String(t.task_id)));
 if(!ids.has(String(pred))||!ids.has(String(succ)))throw new Error('Choose two activities in this project.');
 if(pred===succ)throw new Error('An activity cannot depend on itself.');
 if(!['PR_FS','PR_SS','PR_FF','PR_SF'].includes(type))throw new Error('Invalid relationship type.');
 if(String(lag).trim()===''||!Number.isFinite(Number(lag)))throw new Error('Lag must be a finite number of hours.');
 const rels=relationships.filter(r=>String(r.task_pred_id)!==String(id));
 if(rels.some(r=>r.pred_task_id===pred&&r.task_id===succ&&r.pred_type===type))throw new Error('Relationship already exists.');
 const adj=new Map([...ids].map(key=>[key,[]]));
 for(const r of rels)if(ids.has(r.pred_task_id)&&ids.has(r.task_id))adj.get(r.pred_task_id).push(r.task_id);
 const seen=new Set(),pending=[succ];
 while(pending.length){const v=pending.pop();if(v===pred)throw new Error('This relationship would create a logic cycle.');if(seen.has(v))continue;seen.add(v);pending.push(...(adj.get(v)||[]));}
 return {id,pred,succ,type,lag:Number(lag)};
}
export function renderNodes(container,{tasks,relationships,key,onSave,onDelete,onSchedule}){
 let positions={};try{positions=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 const options=tasks.map(t=>`<option value="${esc(t.task_id)}">${esc(t.task_code)} — ${esc(t.task_name)}</option>`).join('');
 const labels=new Map(tasks.map(t=>[t.task_id,t.task_code]));
 container.innerHTML=`<section class="panel"><div class="panel-head"><h2>Nodes</h2><span>Drag nodes to save the layout. Dependency changes use Studio undo and scheduling.</span></div><div class="node-toolbar"><label>Predecessor<select id="nodePred">${options}</select></label><label>Successor<select id="nodeSucc">${options}</select></label><label>Type<select id="nodeType">${['FS','SS','FF','SF'].map(x=>`<option value="PR_${x}">${x}</option>`).join('')}</select></label><label>Lag (hours)<input id="nodeLag" type="number" step="any" value="0"></label><button id="nodeSave">Add / update dependency</button><button id="nodeDelete">Delete dependency</button><button id="nodeSchedule">Schedule (F9)</button></div><div class="node-toolbar"><label>Existing dependency<select id="nodeRelationship"><option value="">New dependency</option>${relationships.map(r=>`<option value="${esc(r.task_pred_id)}">${esc(labels.get(r.pred_task_id)||r.pred_task_id)} → ${esc(labels.get(r.task_id)||r.task_id)} ${esc(r.pred_type)} (${esc(r.lag_hr_cnt)} h)</option>`).join('')}</select></label><label>Find activities<input id="nodeSearch" placeholder="ID or description"></label><label>Zoom<input id="nodeZoom" type="range" min="30" max="150" value="100"></label><button id="nodeReset">Reset layout</button></div><p id="nodeFeedback" role="status"></p><div class="node-canvas" id="nodeCanvas"></div></section>`;
 const $=id=>container.querySelector('#'+id);let visible=[],width=1200,height=600;
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(positions))}catch{$('nodeFeedback').textContent='Layout could not be saved: browser storage full.'}};
 const draw=()=>{
  const q=$('nodeSearch').value.toLowerCase();const matches=tasks.filter(t=>`${t.task_code} ${t.task_name}`.toLowerCase().includes(q));visible=matches.slice(0,300);const ids=new Set(visible.map(t=>t.task_id));
  $('nodeFeedback').textContent=matches.length>300?`Showing 300 of ${matches.length} matching activities. Filter to focus the diagram; all dependencies remain available above.`:`${visible.length} activities shown.`;
  visible.forEach((t,i)=>positions[t.task_id]??={x:30+(i%5)*245,y:30+Math.floor(i/5)*105});
  width=Math.max(1250,...visible.map(t=>positions[t.task_id].x+240));height=Math.max(600,...visible.map(t=>positions[t.task_id].y+100));
  const paths=relationships.filter(r=>ids.has(r.pred_task_id)&&ids.has(r.task_id)).map(r=>`<path data-edge="${esc(r.task_pred_id)}" marker-end="url(#nodeArrow)"/>`).join('');
  $('nodeCanvas').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs><marker id="nodeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" style="fill:#64748b"/></marker></defs>${paths}${visible.map(t=>`<g data-node="${esc(t.task_id)}"><rect width="215" height="68" rx="5"/><title>${esc(t.task_code+' — '+t.task_name)}</title><text x="8" y="22">${esc(t.task_code.slice(0,28))}</text><text x="8" y="43">${esc(t.task_name.slice(0,31))}</text><text x="8" y="60">Float: ${esc(t.total_float_hr_cnt||'0')} h</text></g>`).join('')}</svg>`;
  const svg=$('nodeCanvas').querySelector('svg');
  const place=()=>{
   svg.querySelectorAll('[data-node]').forEach(g=>{const p=positions[g.dataset.node];g.setAttribute('transform',`translate(${p.x} ${p.y})`)});
   svg.querySelectorAll('[data-edge]').forEach(p=>{const r=relationships.find(r=>r.task_pred_id===p.dataset.edge),a=positions[r.pred_task_id],b=positions[r.task_id],mid=(a.x+215+b.x)/2;p.setAttribute('d',`M ${a.x+215} ${a.y+34} H ${mid} V ${b.y+34} H ${b.x}`)});
  };place();
  let drag;
  const coords=e=>{const p=new DOMPoint(e.clientX,e.clientY);return p.matrixTransform(svg.getScreenCTM().inverse())};
  svg.onpointerdown=e=>{const g=e.target.closest('[data-node]');if(!g)return;const p=coords(e),v=positions[g.dataset.node];drag={id:g.dataset.node,dx:p.x-v.x,dy:p.y-v.y};svg.setPointerCapture(e.pointerId);e.preventDefault()};
  svg.onpointermove=e=>{if(!drag)return;const p=coords(e);positions[drag.id]={x:Math.max(0,Math.min(width-220,p.x-drag.dx)),y:Math.max(0,Math.min(height-70,p.y-drag.dy))};place()};
  svg.onpointerup=()=>{if(drag){drag=null;persist()}};svg.onpointercancel=()=>{drag=null;persist()};zoom();
 };
 const zoom=()=>{const svg=$('nodeCanvas').querySelector('svg');if(svg){svg.setAttribute('width',width*Number($('nodeZoom').value)/100);svg.setAttribute('height',height*Number($('nodeZoom').value)/100)}};
 $('nodeSearch').oninput=draw;$('nodeZoom').oninput=zoom;$('nodeReset').onclick=()=>{positions={};persist();draw()};
 $('nodeRelationship').onchange=()=>{const r=relationships.find(r=>r.task_pred_id===$('nodeRelationship').value);if(r){$('nodePred').value=r.pred_task_id;$('nodeSucc').value=r.task_id;$('nodeType').value=r.pred_type;$('nodeLag').value=r.lag_hr_cnt} $('nodeDelete').disabled=!r};$('nodeDelete').disabled=true;
 $('nodeSave').onclick=()=>{try{const candidate=validateNodeRelationship(tasks,relationships,{id:$('nodeRelationship').value,pred:$('nodePred').value,succ:$('nodeSucc').value,type:$('nodeType').value,lag:$('nodeLag').value});onSave(candidate)}catch(e){$('nodeFeedback').textContent=e.message}};
 $('nodeDelete').onclick=()=>{const id=$('nodeRelationship').value;if(id&&confirm('Delete the selected dependency?'))onDelete(id)};$('nodeSchedule').onclick=onSchedule;draw();
}
