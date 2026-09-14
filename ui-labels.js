export function wbsDisplayLabel(model,wbsId){
  const w=model?.find?.('PROJWBS','wbs_id',wbsId);
  if(!w)return wbsId?`Unresolved WBS · ${wbsId}`:'Unassigned';
  const code=w.wbs_short_name||w.wbs_id||'';
  const name=w.wbs_name||'';
  return name&&code?`${name} · ${code}`:(name||code||'Unassigned');
}

export function calendarDisplayLabel(model,calendarId){
  const c=model?.find?.('CALENDAR','clndr_id',calendarId);
  return c?.clndr_name?`${c.clndr_name}${calendarId?` · ${calendarId}`:''}`:(calendarId||'Unassigned');
}

export function groupFieldLabel(groupBy){
  return ({wbs_id:'WBS',status_code:'Status',clndr_id:'Calendar',task_type:'Activity Type'})[groupBy]||groupBy||'Group';
}

export function groupDisplayLabel(model,groupBy,row){
  if(groupBy==='wbs_id')return wbsDisplayLabel(model,row?.wbs_id);
  if(groupBy==='clndr_id')return calendarDisplayLabel(model,row?.clndr_id);
  return String(row?.[groupBy]??'Unassigned')||'Unassigned';
}
