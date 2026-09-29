import {esc} from '../core/utils.js';
export function metricFromRequest(request){
 const q=String(request).toLowerCase();
 return /concrete|volume|m3|m³/.test(q)?'volume':/area|m2|m²/.test(q)?'area':/lights?|security|points?|count|number/.test(q)?'count':'length';
}
export function measureGeometry(points,mode,metresPerPixel,depth=0){
 if(!Array.isArray(points)||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid measurement points.');
 if(mode==='count'){if(!points.length)throw new Error('Mark at least one item.');return {quantity:points.length,unit:'nr'};}
 if(!Number.isFinite(metresPerPixel)||metresPerPixel<=0)throw new Error('Calibrate the page before measuring.');
 if(mode==='length'){if(points.length<2)throw new Error('A length needs at least two points.');return {quantity:points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)*metresPerPixel,unit:'m'};}
 if(!['area','volume'].includes(mode)||points.length<3)throw new Error('An area or volume needs at least three polygon points.');
 // Reject self-crossing polygons: their signed areas are not a valid take-off.
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){
  if(i===0&&j===points.length-1)continue;
  const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)throw new Error('Polygon crosses itself. Trace its perimeter in order.');
 }
 const area=Math.abs(points.reduce((n,p,i)=>{const next=points[(i+1)%points.length];return n+p.x*next.y-next.x*p.y},0))/2*metresPerPixel**2;
 if(area===0)throw new Error('Polygon area is zero.');
 if(mode==='volume'&&(!Number.isFinite(depth)||depth<=0))throw new Error('Enter a positive depth in metres.');
 return {quantity:mode==='volume'?area*depth:area,unit:mode==='volume'?'m³':'m²'};
}
export function calibration(points,knownMetres){
 if(points.length!==2||!Number.isFinite(knownMetres)||knownMetres<=0)throw new Error('Mark two calibration points and enter a positive known distance in metres.');
 const pixels=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);if(pixels<1e-6)throw new Error('Calibration points must differ.');return knownMetres/pixels;
}
export function mountTakeoff(container,{files,getBlob,onCommit,activities=[]}){
 const drawings=files.filter(f=>/\.(pdf|dwg)$/i.test(f.name));
 container.innerHTML=`<h2>Calibrated drawing take-off</h2><p>Open PDF or DWG, describe the required metric, then trace or count it. Calibrate each page against a known dimension. Size, service and specification are confirmed by you; AI does not certify quantities.</p><div class="takeoff-controls"><label>Drawing<select id="takeoffDrawing"><option value="">Select drawing…</option>${drawings.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select></label><label>Page<input id="takeoffPage" type="number" min="1" value="1"></label><button id="takeoffOpen">Open drawing</button><label>Required metric<input id="takeoffRequest" placeholder="e.g. metres of chilled-water pipe, by size and specification"></label><button id="takeoffApplyRequest">Set metric</button><label>Mode<select id="takeoffMode"><option value="calibrate">Calibrate (2 points)</option><option value="length">Length / polyline</option><option value="count">Count lights / points</option><option value="area">Area / polygon</option><option value="volume">Concrete volume</option></select></label><label>Known distance (m)<input id="takeoffKnown" type="number" min="0" step="any" value="1"></label><button id="takeoffCalibrate">Apply calibration</button><label>Depth (m)<input id="takeoffDepth" type="number" min="0" step="any" value="0.2"></label><label>Size / type<input id="takeoffSize"></label><label>Service<input id="takeoffService"></label><label>Specification<input id="takeoffSpec"></label><label>Drawing revision<input id="takeoffRevision"></label><label>Activity<select id="takeoffActivity"><option value="">Unallocated</option>${activities.map(a=>`<option value="${esc(a.id)}">${esc(a.id)} — ${esc(a.name)}</option>`).join('')}</select></label><button id="takeoffUndo">Undo point</button><button id="takeoffClear">Clear points</button><button id="takeoffCommit">Add measured quantity</button></div><p id="takeoffStatus" role="status">No drawing open.</p><div class="takeoff-scroll"><div id="takeoffSurface"><canvas id="takeoffCanvas"></canvas><svg id="takeoffOverlay" xmlns="http://www.w3.org/2000/svg"></svg></div></div>`;
 const $=id=>container.querySelector('#'+id);let points=[],scale=0,calibrationEvidence=null,source=null,width=0,height=0,loading=false;
 const status=s=>$('takeoffStatus').textContent=s;
 const guard=fn=>async()=>{try{await fn()}catch(e){status(e.message)}};
 const paint=()=>{$('takeoffOverlay').innerHTML=`<polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#dc2626" stroke-width="2"/>${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#dc2626"/><text x="${p.x+7}" y="${p.y-7}" font-size="14" fill="#dc2626">${i+1}</text>`).join('')}`;status(`${points.length} points · ${scale?`scale ${scale.toPrecision(6)} m/pixel`:'page uncalibrated'}`)};
 $('takeoffOverlay').onclick=e=>{if(!source||loading)return;const rect=e.currentTarget.getBoundingClientRect();points.push({x:(e.clientX-rect.left)*width/rect.width,y:(e.clientY-rect.top)*height/rect.height});paint()};
 $('takeoffOpen').onclick=guard(async()=>{
  const file=drawings.find(f=>f.id===$('takeoffDrawing').value);if(!file)throw new Error('Choose a drawing first.');
  loading=true;source=null;scale=0;calibrationEvidence=null;points=[];status('Reading drawing…');
  try{
   const blob=await getBlob(file.id);if(!blob)throw new Error('Source file is unavailable.');const bytes=await blob.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   const canvas=$('takeoffCanvas'),ctx=canvas.getContext('2d');let pageNo=Number($('takeoffPage').value);
   if(/\.pdf$/i.test(file.name)){
    const pdfjs=await import('../../vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../../vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
    const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;
    try{if(!Number.isInteger(pageNo)||pageNo<1||pageNo>pdf.numPages)throw new Error(`Page must be between 1 and ${pdf.numPages}.`);
     const page=await pdf.getPage(pageNo),viewport=page.getViewport({scale:1.5});width=viewport.width;height=viewport.height;canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);await page.render({canvasContext:ctx,viewport}).promise;
    }finally{await pdf.destroy()}
   }else{
    status('Decoding DWG locally…');pageNo=1;
    const svg=await decodeDwg(bytes);
    const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw new Error('DWG preview is not valid SVG.');
    doc.querySelectorAll('script,foreignObject,image,style').forEach(n=>n.remove());
    for(const node of doc.querySelectorAll('*'))for(const attr of [...node.attributes])if(/^on/i.test(attr.name)||/href/i.test(attr.name))node.removeAttribute(attr.name);
    const root=doc.documentElement,vb=(root.getAttribute('viewBox')||'0 0 1200 800').trim().split(/[ ,]+/).map(Number);width=1400;height=Math.max(200,Math.min(4000,1400*(vb[3]||800)/(vb[2]||1200)));root.setAttribute('width',width);root.setAttribute('height',height);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();canvas.width=width;canvas.height=height;ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height)}finally{URL.revokeObjectURL(url)}
   }
   const overlay=$('takeoffOverlay');overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);overlay.setAttribute('width',width);overlay.setAttribute('height',height);$('takeoffSurface').style.width=width+'px';$('takeoffSurface').style.height=height+'px';
   source={fileId:file.id,name:file.name,sha256:hash,page:pageNo};paint();status(`Opened ${file.name}, page ${pageNo}. Calibrate before measuring lengths, areas or volumes.`);
  }finally{loading=false}
 });
 $('takeoffApplyRequest').onclick=()=>{$('takeoffMode').value=metricFromRequest($('takeoffRequest').value);points=[];paint()};$('takeoffMode').onchange=()=>{points=[];paint()};
 $('takeoffCalibrate').onclick=guard(()=>{scale=calibration(points,Number($('takeoffKnown').value));calibrationEvidence={points:structuredClone(points),knownMetres:Number($('takeoffKnown').value),metresPerPixel:scale};points=[];$('takeoffMode').value=metricFromRequest($('takeoffRequest').value);paint()});
 $('takeoffClear').onclick=()=>{points=[];paint()};$('takeoffUndo').onclick=()=>{points.pop();paint()};
 $('takeoffCommit').onclick=guard(()=>{
  if(!source||loading)throw new Error('Open a drawing first.');if(!$('takeoffRequest').value.trim())throw new Error('Describe the metric being measured.');
  const mode=$('takeoffMode').value,depth=Number($('takeoffDepth').value),result=measureGeometry(points,mode,scale,depth);
  const row={id:crypto.randomUUID(),discipline:'',category:mode,item:$('takeoffRequest').value,size:$('takeoffSize').value,service:$('takeoffService').value,specification:$('takeoffSpec').value,...result,activityId:$('takeoffActivity').value,norm:0,boq:'',trace:{...source,revision:$('takeoffRevision').value,mode,points:structuredClone(points),calibration:calibrationEvidence,depthMetres:mode==='volume'?depth:null,measuredAt:new Date().toISOString(),method:'User-confirmed calibrated take-off'},measuredQuantity:result.quantity};
  onCommit(row);points=[];paint();status(`Added ${result.quantity.toPrecision(8)} ${result.unit}. Source and calibration retained in the audit export.`);
 });
}
function decodeDwg(bytes){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./dwg-worker.js',import.meta.url),{type:'module'});
 const timer=setTimeout(()=>{worker.terminate();reject(new Error('DWG decoding timed out after 90 seconds. Try a smaller 2D drawing or PDF export.'))},90000);
 const finish=()=>{clearTimeout(timer);worker.terminate()};worker.onmessage=e=>{finish();e.data.error?reject(new Error(e.data.error)):resolve(e.data.svg)};worker.onerror=e=>{finish();reject(new Error(e.message||'DWG adapter failed. Run the CAD dependency setup.'))};worker.postMessage(bytes,[bytes]);
})}
