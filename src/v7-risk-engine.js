import {compileRisks} from './risk-register.js';
import { num } from './parser.js';
import { taskRows, predRows } from './semantic.js';

function rng(seed) {
  let x=Number(seed)>>>0;
  return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};
}
function normal(rand) {
  let u=0,v=0;while(!u)u=rand();while(!v)v=rand();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
// Marsaglia–Tsang gamma sampling; PERT's shape parameters are always >= 1.
function gamma(shape,rand) {
  const d=shape-1/3,c=1/Math.sqrt(9*d);
  for(;;){const x=normal(rand),v=1+c*x;if(v<=0)continue;const cube=v*v*v,u=rand();
    if(u<1-.0331*x*x*x*x||Math.log(u)<.5*x*x+d*(1-cube+Math.log(cube)))return d*cube;
  }
}
function sample(dist,min,mode,max,rand) {
  const u=rand();if(max===min)return min;
  if(dist==='uniform')return min+u*(max-min);
  if(dist==='normal')return Math.max(0,mode+normal(rand)*(max-min)/6);
  if(dist==='pert'){
    const a=1+4*(mode-min)/(max-min),b=1+4*(max-mode)/(max-min);
    const x=gamma(a,rand),y=gamma(b,rand);return min+(max-min)*x/(x+y);
  }
  const c=(mode-min)/(max-min);
  return u<c?min+Math.sqrt(u*(max-min)*(mode-min)):max-Math.sqrt((1-u)*(max-min)*(max-mode));
}
function compile(tasks,rels) {
  const ids=new Map(tasks.map((t,i)=>[String(t.task_id),i]));
  if(ids.size!==tasks.length)return {error:'Duplicate activity IDs must be resolved before simulation.'};
  const incoming=tasks.map(()=>[]),outgoing=tasks.map(()=>[]),indegree=new Uint32Array(tasks.length);
  let ignored=0;
  for(const r of rels){const p=ids.get(String(r.pred_task_id)),s=ids.get(String(r.task_id));
    if(p===undefined||s===undefined){ignored++;continue;}
    incoming[s].push({p,lag:num(r.lag_hr_cnt)/24,type:String(r.pred_type||'FS').replace(/^PR_/,'').toUpperCase()});
    outgoing[p].push(s);indegree[s]++;
  }
  const order=[];for(let i=0;i<tasks.length;i++)if(!indegree[i])order.push(i);
  for(let head=0;head<order.length;head++)for(const s of outgoing[order[head]])if(--indegree[s]===0)order.push(s);
  if(order.length!==tasks.length)return {error:'Schedule contains a relationship cycle; QSRA forward simulation requires an acyclic network.'};
  return {ids,incoming,order,ignored};
}

/** Seeded, elapsed-hour approximation. Does not reproduce calendar-based P6 QSRA. */
export function runQSRA(model,projId=null,{iterations=1000,seed=42,distribution='triangular',minFactor=.85,modeFactor=1,maxFactor=1.3,targetTaskId='',riskRegister=[],targetDays=null}={}) {
  const fail=error=>({error,iterations:0});
  iterations=Number(iterations);seed=Number(seed);
  [minFactor,modeFactor,maxFactor]=[minFactor,modeFactor,maxFactor].map(Number);
  if(!Number.isFinite(iterations)||iterations<=0||!Number.isFinite(seed))return fail('Iterations and seed must be finite numbers; iterations must be positive.');
  if(![minFactor,modeFactor,maxFactor].every(Number.isFinite)||minFactor<0||minFactor>modeFactor||modeFactor>maxFactor)return fail('Factors must be finite and satisfy 0 ≤ minimum ≤ most likely ≤ maximum.');
  if(!['triangular','pert','uniform','normal'].includes(distribution))return fail('Choose triangular, pert, uniform or normal.');
  const tasks=taskRows(model,projId);
  if(!tasks.length)return fail('No activities are available in the selected project.');
  const graph=compile(tasks,predRows(model,projId));if(graph.error)return fail(graph.error);
  const target=targetTaskId!==''&&targetTaskId!=null?String(targetTaskId):null,targetIndex=target===null?null:graph.ids.get(target);
  if(target!==null&&targetIndex===undefined)return fail('The target activity does not belong to the selected project.');
  let risks;try{risks=compileRisks(riskRegister,tasks)}catch(error){return fail(error.message)}
  if(targetDays!==null&&targetDays!==''&&(!Number.isFinite(Number(targetDays))||Number(targetDays)<0))return fail('Target duration must be a non-negative number.');
  iterations=Math.max(100,Math.min(50000,Math.round(iterations)));
  const base=tasks.map(t=>{
    if(/COMPLETE/i.test(t.status_code||''))return 0;
    const remaining=t.remain_drtn_hr_cnt;
    return Math.max(0,num(remaining==null||remaining===''?t.target_drtn_hr_cnt:remaining))/24;
  });
  if(base.some(d=>!Number.isFinite(d*maxFactor)))return fail('Duration factors exceed the supported numeric range.');
  const rand=rng(seed),finishes=[],counts=new Uint32Array(tasks.length),es=new Float64Array(tasks.length),ef=new Float64Array(tasks.length),chosen=new Int32Array(tasks.length);
  let baselineDays=0;const occurrences=new Uint32Array(risks.length),impactSums=new Float64Array(risks.length);
  for(let it=-1;it<iterations;it++){
    const impacts=new Float64Array(tasks.length);
    if(it>=0)risks.forEach((risk,j)=>{if(rand()*100<risk.probability){const impact=sample('triangular',risk.minimum,risk.likely,risk.maximum,rand)/24;occurrences[j]++;impactSums[j]+=impact;for(const i of risk.targets)if(base[i]>0)impacts[i]+=impact;}});
    let latest=-Infinity,endpoint=graph.order[0];
    for(const i of graph.order){
      const dur=it<0?base[i]:sample(distribution,base[i]*minFactor,base[i]*modeFactor,base[i]*maxFactor,rand)+impacts[i];let start=0,driver=-1;
      for(const {p,lag,type} of graph.incoming[i]){
        const cand=type==='SS'?es[p]+lag:type==='FF'?ef[p]+lag-dur:type==='SF'?es[p]+lag-dur:ef[p]+lag;
        if(cand>start){start=cand;driver=p;}
      }
      es[i]=start;ef[i]=start+dur;chosen[i]=driver;
      if(ef[i]>latest){latest=ef[i];endpoint=i;}
    }
    if(targetIndex!==null)endpoint=targetIndex;
    if(!Number.isFinite(ef[endpoint]))return fail('Simulation overflowed; reduce duration factors or check schedule durations.');
    if(it<0){baselineDays=ef[endpoint];continue;}
    finishes.push(ef[endpoint]);
    // DAG validation guarantees termination without allocating per-iteration Sets.
    for(let cur=endpoint;cur>=0;cur=chosen[cur])counts[cur]++;
  }
  finishes.sort((a,b)=>a-b);
  const q=p=>finishes[Math.round(p/100*(finishes.length-1))],mean=finishes.reduce((s,x)=>s+x/iterations,0);
  const drivers=tasks.flatMap((t,i)=>counts[i]?[{taskId:String(t.task_id),activity:t.task_code||String(t.task_id),name:t.task_name||'',criticalityIndex:100*counts[i]/iterations}]:[]).sort((a,b)=>b.criticalityIndex-a.criticalityIndex);
  const min=finishes[0],max=finishes.at(-1),bins=20,step=Math.max(.001,(max-min)/bins);
  const histogram=Array.from({length:bins},(_,i)=>({from:min+i*step,to:min+(i+1)*step,count:0}));
  for(const x of finishes)histogram[Math.min(bins-1,Math.floor((x-min)/step))].count++;
  const stdDevDays=Math.sqrt(finishes.reduce((sum,x)=>sum+(x-mean)**2,0)/iterations);
  return {baselineDays,stdDevDays,p95:q(95),contingencyP80:q(80)-baselineDays,targetDays:targetDays===null||targetDays===''?null:Number(targetDays),targetConfidence:targetDays===null||targetDays===''?null:100*finishes.filter(x=>x<=Number(targetDays)).length/iterations,cdf:Array.from({length:101},(_,p)=>({probability:p,days:q(p)})),riskEvents:risks.map((r,i)=>({id:r.id,description:r.description,activities:r.activities,probability:r.probability,minimum:r.minimum,likely:r.likely,maximum:r.maximum,occurrences:occurrences[i],observedProbability:100*occurrences[i]/iterations,meanImpactDays:occurrences[i]?impactSums[i]/occurrences[i]:0})),iterations,seed,distribution,meanDays:mean,p10:q(10),p20:q(20),p50:q(50),p80:q(80),p90:q(90),minDays:min,maxDays:max,drivers:drivers.slice(0,50),histogram,assumptions:{minFactor,modeFactor,maxFactor,targetTaskId:target||'Project finish',ignoredRelationships:graph.ignored,calendarBasis:`24-hour equivalent forward-pass approximation for risk deltas; deterministic CPM remains the authoritative schedule engine. Calendars, constraints and dated progress are not simulated. ${graph.ignored} external or unresolved relationships excluded. Criticality follows one driving path per iteration; tied paths are not all counted.`}};
}
