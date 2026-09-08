const LEVELS={DEBUG:10,INFO:20,WARNING:30,ERROR:40,CRITICAL:50};
export class DiagnosticLogger{
  constructor({level='INFO',maxEntries=2500}={}){this.level=String(level).toUpperCase();this.maxEntries=maxEntries;this.entries=[];this.timers=new Map()}
  enabled(level){return (LEVELS[String(level).toUpperCase()]||20)>=(LEVELS[this.level]||20)}
  log(level,module,procedure,message='',context={}){level=String(level).toUpperCase();if(!this.enabled(level))return null;const safe={};for(const [k,v] of Object.entries(context||{})){if(/pass(word)?|secret|token|credential/i.test(k))safe[k]='<redacted>';else safe[k]=v}const e={timestamp:new Date().toISOString(),level,module,procedure,message,context:safe};this.entries.push(e);if(this.entries.length>this.maxEntries)this.entries.splice(0,this.entries.length-this.maxEntries);const fn=level==='ERROR'||level==='CRITICAL'?console.error:level==='WARNING'?console.warn:console.debug;fn(`[${level}] ${module}.${procedure}: ${message}`,safe);return e}
  debug(m,p,msg,c){return this.log('DEBUG',m,p,msg,c)} info(m,p,msg,c){return this.log('INFO',m,p,msg,c)} warn(m,p,msg,c){return this.log('WARNING',m,p,msg,c)} error(m,p,msg,c){return this.log('ERROR',m,p,msg,c)} critical(m,p,msg,c){return this.log('CRITICAL',m,p,msg,c)}
  start(name,context={}){this.timers.set(name,{at:performance?.now?.()??Date.now(),context});return name}
  end(name,module,procedure,message='Completed'){const t=this.timers.get(name);if(!t)return null;const now=performance?.now?.()??Date.now(),durationMs=now-t.at;this.timers.delete(name);return this.info(module,procedure,message,{...t.context,durationMs:Number(durationMs.toFixed(2))})}
  export(){return JSON.stringify({schema:'uss-diagnostic-log',version:1,exportedAt:new Date().toISOString(),entries:this.entries},null,2)}
}
