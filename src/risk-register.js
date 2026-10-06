export const RISK_FIELDS=['id','description','probability','activities','minimum','likely','maximum'];
/** Quoted TSV/CSV, including embedded newlines; activity codes separated by semicolons. */
export function parseRiskRegister(text){
 const sep=text.includes('\t')?'\t':',',rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<=text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted;continue}if(!quoted&&(c===sep||c==='\n'||c===undefined)){row.push(cell.replace(/\r$/,''));cell='';if(c!==sep){if(row.some(x=>x.trim()))rows.push(row);row=[]}}else if(c!==undefined)cell+=c;}
 if(quoted)throw Error('Unclosed quotation in pasted register.');
 const aliases={riskid:'id',id:'id',risk:'description',description:'description',riskdescription:'description',probability:'probability',probabilitypercent:'probability',probabilitypct:'probability',activities:'activities',activityids:'activities',activitycodes:'activities',minimum:'minimum',minhours:'minimum',minimumhours:'minimum',likely:'likely',mostlikely:'likely',likelyhours:'likely',mostlikelyhours:'likely',maximum:'maximum',maxhours:'maximum',maximumhours:'maximum'};
 const header=(rows[0]||[]).map(x=>aliases[x.toLowerCase().replace(/[^a-z]/g,'')]);const hasHeader=header.includes('probability')&&header.includes('activities');
 return (hasHeader?rows.slice(1):rows).map((values,i)=>{const r={};(hasHeader?header:RISK_FIELDS).forEach((k,j)=>{if(k)r[k]=values[j]?.trim()||''});r.id ||= 'R'+(i+1);for(const k of ['probability','minimum','likely','maximum'])r[k]=Number(String(r[k]??'').replace('%',''));return r;});
}
export function compileRisks(rows,tasks){
 const codes=new Map(),ids=new Map(tasks.map((t,i)=>[String(t.task_id),i]));tasks.forEach((t,i)=>{const code=String(t.task_code||'');if(!codes.has(code))codes.set(code,[]);codes.get(code).push(i)});
 const seen=new Set();return rows.map((r,n)=>{
 const id=String(r.id||'').trim();if(!id||seen.has(id))throw Error(`Risk row ${n+1}: provide a unique Risk ID.`);seen.add(id);
 const [probability,minimum,likely,maximum]=['probability','minimum','likely','maximum'].map(k=>Number(r[k]));
 if(![probability,minimum,likely,maximum].every(Number.isFinite)||probability<0||probability>100||minimum<0||minimum>likely||likely>maximum)throw Error(`Risk ${id}: probability must be 0–100 and impacts must satisfy 0 ≤ minimum ≤ likely ≤ maximum.`);
 const targets=String(r.activities||'').split(';').map(x=>x.trim()).filter(Boolean).map(code=>{const matches=codes.get(code);if(matches?.length>1)throw Error(`Risk ${id}: ambiguous activity code ${code}. Use a unique task ID.`);const i=matches?.[0]??ids.get(code);if(i===undefined)throw Error(`Risk ${id}: unknown activity ${code}.`);return i});
 if(!targets.length)throw Error(`Risk ${id}: choose at least one activity code or task ID (semicolon-separated).`);
 return {...r,id,probability,minimum,likely,maximum,targets:[...new Set(targets)]};
 });
}
