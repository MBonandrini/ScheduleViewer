import { num, p6Date } from './parser.js';
const text=v=>String(v??'').toLowerCase();
const csv=v=>String(v??'').split(',').map(x=>x.trim()).filter(Boolean);
const OPS={
 eq:(a,b)=>String(a??'')===String(b??''),neq:(a,b)=>String(a??'')!==String(b??''),contains:(a,b)=>text(a).includes(text(b)),notcontains:(a,b)=>!text(a).includes(text(b)),
 startswith:(a,b)=>text(a).startsWith(text(b)),endswith:(a,b)=>text(a).endsWith(text(b)),in:(a,b)=>csv(b).map(String).includes(String(a??'')),notin:(a,b)=>!csv(b).map(String).includes(String(a??'')),
 gt:(a,b)=>num(a)>num(b),gte:(a,b)=>num(a)>=num(b),lt:(a,b)=>num(a)<num(b),lte:(a,b)=>num(a)<=num(b),between:(a,b)=>{const [x,y]=csv(b).map(Number);return Number.isFinite(x)&&Number.isFinite(y)&&num(a)>=x&&num(a)<=y},
 before:(a,b)=>{const x=p6Date(a),y=p6Date(b);return !!(x&&y&&x<y)},after:(a,b)=>{const x=p6Date(a),y=p6Date(b);return !!(x&&y&&x>y)},
 blank:a=>a==null||String(a)==='',notblank:a=>a!=null&&String(a)!=='',regex:(a,b)=>{try{return new RegExp(String(b||''),'i').test(String(a??''))}catch{return false}}
};
export function evalRule(row,rule){if(rule?.rules)return evalGroup(row,rule);const fn=OPS[rule?.op]||OPS.eq;return fn(row?.[rule?.field],rule?.value)}
export function evalGroup(row,group){if(!group||!group.rules?.length)return true;const mode=(group.mode||'AND').toUpperCase();return mode==='OR'?group.rules.some(x=>evalRule(row,x)):group.rules.every(x=>evalRule(row,x))}
export function applyFilterGroup(rows,group){if(!group||!group.rules?.length)return rows;return rows.filter(r=>evalGroup(r,group))}
export function builtInFilters(){return [
 {id:'critical',name:'Critical / ≤ 0 Float',group:{mode:'AND',rules:[{field:'total_float_hr_cnt',op:'lte',value:0}]}},
 {id:'near-critical',name:'Near Critical ≤ 10d',group:{mode:'AND',rules:[{field:'total_float_hr_cnt',op:'between',value:'0,80'}]}},
 {id:'incomplete',name:'Incomplete',group:{mode:'AND',rules:[{field:'status_code',op:'neq',value:'TK_Complete'}]}},
 {id:'negative-float',name:'Negative Float',group:{mode:'AND',rules:[{field:'total_float_hr_cnt',op:'lt',value:0}]}},
 {id:'milestones',name:'Milestones',group:{mode:'OR',rules:[{field:'task_type',op:'contains',value:'MILE'},{field:'target_drtn_hr_cnt',op:'eq',value:0}]}},
 {id:'open-start',name:'No predecessor',special:'openStart'}
]}
export const FILTER_OPERATORS=Object.keys(OPS);
