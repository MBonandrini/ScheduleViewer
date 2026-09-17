/** Keep simulation off the UI thread; terminate superseded jobs instead of showing stale results. */
export function startRiskSimulation(model,projectId,options,{WorkerClass=globalThis.Worker}={}) {
  let worker,settled=false,resolve;
  const promise=new Promise(r=>{resolve=r;});
  const finish=result=>{if(settled)return;settled=true;worker?.terminate();resolve(result);};
  try{
    if(!WorkerClass)throw new Error('Background workers are unavailable. Serve this app over HTTP in a modern browser.');
    worker=new WorkerClass(new URL('./risk-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=event=>finish(event.data);
    worker.onerror=event=>{event.preventDefault?.();finish({error:event.message||'Could not start the risk worker. Reload the application and try again.',iterations:0});};
    worker.onmessageerror=()=>finish({error:'Could not read the risk simulation result.',iterations:0});
    const tables=['TASK','TASKPRED'].map(name=>[name,{name,fields:model.fields(name),rows:model.table(name)}]);
    // Do not send the previous result or unrelated schedules' resources/notes.
    const {iterations,seed,distribution,minFactor,modeFactor,maxFactor,targetTaskId}=options;
    worker.postMessage({tables,projectId,options:{iterations,seed,distribution,minFactor,modeFactor,maxFactor,targetTaskId}});
  }catch(error){finish({error:error.message,iterations:0});}
  return {promise,cancel:()=>finish({cancelled:true,iterations:0})};
}
