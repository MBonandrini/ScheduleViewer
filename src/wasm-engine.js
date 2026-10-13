/** ABI 1 wrapper. One instance per caller/worker; operations are synchronous and non-reentrant. */
export class ScheduleWasmEngine {
 constructor(instance){this.exports=instance.exports;if(this.exports.api_version()!==1)throw Error('Unsupported engine ABI');}
 static async load(source=new URL('../engine/schedule_core.wasm',import.meta.url)){
  const bytes=source instanceof Uint8Array||source instanceof ArrayBuffer?source:await (async()=>{const response=await fetch(source);if(!response.ok)throw Error('WebAssembly download failed: '+response.status);return response.arrayBuffer()})();
  const {instance}=await WebAssembly.instantiate(bytes,{});return new ScheduleWasmEngine(instance);
 }
 memory(size){if(size>this.exports.capacity())throw RangeError('Numeric engine capacity exceeded');return new Float64Array(this.exports.memory.buffer,this.exports.buffer(),size)}
 numbers(xs){if(!Array.isArray(xs)&&!ArrayBuffer.isView(xs))throw TypeError('Expected numeric array');if(!Array.from(xs).every(Number.isFinite))throw TypeError('All values must be finite numbers');}
 summarize(values){this.numbers(values);if(!values.length)throw RangeError('At least one value is required');const n=values.length,b=this.memory(n+9);b.set(values);if(this.exports.statistics(n))throw Error('Statistics failed');const o=Array.from(b.slice(n,n+9));return Object.fromEntries(['min','max','mean','standardDeviation','p10','p50','p80','p90','p95'].map((k,i)=>[k,o[i]]));}
 dateDeltas(previous,current){this.numbers(previous);this.numbers(current);if(previous.length!==current.length)throw RangeError('Arrays must have equal lengths');const n=previous.length,b=this.memory(n*3);b.set(previous);b.set(current,n);this.exports.deltas(n);return Array.from(b.slice(n*2));}
 forwardPass(durations,relationships=[]){this.numbers(durations);if(!durations.length||durations.some(d=>d<0))throw RangeError('Nonnegative durations required');const n=durations.length,m=relationships.length,types={FS:0,SS:1,FF:2,SF:3};const edges=relationships.flatMap(r=>{if(!Number.isInteger(r.predecessor)||!Number.isInteger(r.successor)||r.predecessor<0||r.predecessor>=n||r.successor<0||r.successor>=n||!(r.type in types)||!Number.isFinite(r.lag??0))throw Error('Invalid relationship');return [r.predecessor,r.successor,types[r.type],r.lag??0]});const b=this.memory(7*n+5*m);b.set(durations);b.set(edges,n);const code=this.exports.forward_pass(n,m);if(code===-2)throw Error('Relationship cycle detected');if(code)throw Error('Forward pass failed');const off=n+4*m,starts=Array.from(b.slice(off,off+n)),finishes=Array.from(b.slice(off+n,off+2*n));return {starts,finishes,duration:finishes.reduce((a,b)=>Math.max(a,b),0),basis:'Elapsed units; no calendars, constraints or dated progress'};}
}
let defaultEngine=null;
export async function initializeWasm(){try{defaultEngine=await ScheduleWasmEngine.load();return true}catch{return false}}
export function numericSummary(values){return defaultEngine?.summarize(values)||null}
