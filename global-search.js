export function globalScheduleSearch(model,query,{limit=500}={}){
  const q=String(query||'').trim().toLowerCase();if(!q)return [];
  const out=[];
  for(const tableName of model.tableNames()){
    const rows=model.table(tableName),fields=model.fields(tableName);
    for(let i=0;i<rows.length;i++){
      const row=rows[i];for(const field of fields){const value=row[field];if(value!==undefined&&String(value).toLowerCase().includes(q)){out.push({table:tableName,row:i+1,field,value:String(value),task_id:row.task_id||row.fk_id||'',record:row});break}}if(out.length>=limit)return out;
    }
  }
  return out;
}
