import { buildResourceTimeSeries, resourceSheetRows } from './resource-analysis.js';
import { num } from './parser.js';

export function resourceOverloadAnalysis(model,projId=null,{bucket='week',capacities={}}={}){
  const assignments=resourceSheetRows(model,projId),byResource=new Map();
  for(const row of assignments){const id=String(row.resource_id||'');if(!id)continue;if(!byResource.has(id))byResource.set(id,{id,name:row.resource_name||id,type:row.resource_type||'',rows:[]});byResource.get(id).rows.push(row)}
  const overloads=[],summary=[];
  for(const r of byResource.values()){
    const series=buildResourceTimeSeries(model,projId,{bucket,resourceId:r.id,mode:'units'});
    const cap=num(capacities[r.id]??model.find('RSRC','rsrc_id',r.id)?.max_qty_per_hr??0);
    let peak=0,overloadPeriods=0,largestJump=0,prev=null;
    for(const x of series){peak=Math.max(peak,num(x.forecast));if(cap>0&&num(x.forecast)>cap){overloadPeriods++;overloads.push({resource_id:r.id,resource:r.name,period:x.date,forecast:num(x.forecast),capacity:cap,overload:num(x.forecast)-cap})}if(prev!==null)largestJump=Math.max(largestJump,Math.abs(num(x.forecast)-prev));prev=num(x.forecast)}
    summary.push({resource_id:r.id,resource:r.name,type:r.type,peakForecast:peak,capacity:cap,overloadPeriods,largestPeriodChange:largestJump,assignments:r.rows.length});
  }
  return {overloads,summary,score:Math.max(0,100-Math.min(100,overloads.length*2))};
}

export function resourceLoadingGaps(model,projId=null){
  return resourceSheetRows(model,projId).filter(r=>num(r.remaining_units)>0&&!r.resource_id).map(r=>({activity:r.activity_id,name:r.activity_name,issue:'Remaining work has no resource assignment'}));
}
