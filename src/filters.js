import { num } from './parser.js';
const OPS={
 eq:(a,b)=>String(a??'')===String(b??''),neq:(a,b)=>String(a??'')!==String(b??''),contains:(a,b)=>String(a??'').toLowerCase().includes(String(b??'').toLowerCase()),
 gt:(a,b)=>num(a)>num(b),gte:(a,b)=>num(a)>=num(b),lt:(a,b)=>num(a)<num(b),lte:(a,b)=>num(a)<=num(b),blank:a=>a==null||String(a)==='',notblank:a=>a!=null&&String(a)!==''
};
export function evalRule(row,rule){const fn=OPS[rule.op]||OPS.eq;return fn(row?.[rule.field],rule.value)}
export function applyFilterGroup(rows,group){if(!group||!group.rules?.length)return rows;const mode=(group.mode||'AND').toUpperCase();return rows.filter(r=>mode==='OR'?group.rules.some(x=>evalRule(r,x)):group.rules.every(x=>evalRule(r,x)))}
export function builtInFilters(){return [
 {id:'critical',name:'Critical / ≤ 0 Float',group:{mode:'AND',rules:[{field:'total_float_hr_cnt',op:'lte',value:0}]}},
 {id:'incomplete',name:'Incomplete',group:{mode:'AND',rules:[{field:'status_code',op:'neq',value:'TK_Complete'}]}},
 {id:'open-start',name:'No predecessor',special:'openStart'}
]}
