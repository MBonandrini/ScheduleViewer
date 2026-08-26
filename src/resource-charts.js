function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function maxVal(rows,fields){return Math.max(1,...rows.flatMap(r=>fields.map(f=>Number(r[f])||0)))}
export function renderHistogram(el,rows,{fields=['budget','actual','remaining'],title='Resource Histogram'}={}){
  if(!el)return;if(!rows.length){el.innerHTML='<div class="empty">No time-phased resource data.</div>';return}const W=Math.max(900,rows.length*34),H=340,pad=46,max=maxVal(rows,fields),plotH=H-pad*2,plotW=W-pad*2,group=plotW/rows.length,barW=Math.max(3,(group-4)/fields.length);
  let svg=`<svg class="resource-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" class="axis"/>`;
  rows.forEach((r,i)=>{fields.forEach((f,j)=>{const v=Number(r[f])||0,h=v/max*plotH,x=pad+i*group+2+j*barW,y=H-pad-h;svg+=`<rect x="${x}" y="${y}" width="${Math.max(2,barW-1)}" height="${h}" class="bar-${f}"><title>${esc(r.date)} ${esc(f)}: ${v.toFixed(2)}</title></rect>`});if(i%Math.max(1,Math.ceil(rows.length/12))===0)svg+=`<text x="${pad+i*group}" y="${H-12}" class="axis-label">${esc(r.date.slice(5))}</text>`});svg+='</svg>';el.innerHTML=svg;
}
export function renderCurve(el,rows,{fields=['budget','actual','forecast'],title='Cumulative Resource Curve'}={}){
  if(!el)return;if(!rows.length){el.innerHTML='<div class="empty">No curve data.</div>';return}const W=Math.max(900,rows.length*34),H=340,pad=46,max=maxVal(rows,fields),plotH=H-pad*2,plotW=W-pad*2,dx=rows.length>1?plotW/(rows.length-1):0;let svg=`<svg class="resource-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" class="axis"/>`;
  for(const f of fields){const pts=rows.map((r,i)=>`${pad+i*dx},${H-pad-(Number(r[f])||0)/max*plotH}`).join(' ');svg+=`<polyline points="${pts}" class="curve-${f}" fill="none" stroke-width="2.4"/>`}
  rows.forEach((r,i)=>{if(i%Math.max(1,Math.ceil(rows.length/12))===0)svg+=`<text x="${pad+i*dx}" y="${H-12}" class="axis-label">${esc(r.date.slice(5))}</text>`});svg+='</svg>';el.innerHTML=svg;
}
