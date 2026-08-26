const DEFAULT_COLUMNS=['task_code','task_name','status_code','target_start_date','target_end_date','remain_drtn_hr_cnt','total_float_hr_cnt'];
export function defaultLayout(){return {id:'default',name:'Standard',columns:[...DEFAULT_COLUMNS],groupBy:'wbs_id',sort:[{field:'task_code',dir:1}],filters:[],rowHeight:'compact',timescale:'week',barStyle:'standard'}}
export function loadLayouts(key='uss-layouts'){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return x.length?x:[defaultLayout()]}catch{return [defaultLayout()]}}
export function saveLayouts(layouts,key='uss-layouts'){localStorage.setItem(key,JSON.stringify(layouts))}
export function upsertLayout(layouts,layout){const i=layouts.findIndex(x=>x.id===layout.id);if(i>=0)layouts[i]=structuredClone(layout);else layouts.push(structuredClone(layout));return layouts}
export function removeLayout(layouts,id){return layouts.filter(x=>x.id!==id||id==='default')}
export function applyLayoutSort(rows,layout){const rules=layout?.sort||[];const groupBy=layout?.groupBy;return [...rows].sort((a,b)=>{if(groupBy){const g=String(a[groupBy]??'').localeCompare(String(b[groupBy]??''),undefined,{numeric:true});if(g)return g}for(const r of rules){const av=a[r.field]??'',bv=b[r.field]??'';const c=String(av).localeCompare(String(bv),undefined,{numeric:true});if(c)return c*(r.dir||1)}return 0})}
