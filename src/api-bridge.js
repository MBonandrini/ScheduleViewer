import {generateReport} from './public-api.js';
window.addEventListener('message',async event=>{
 const r=event.data;if(event.source!==parent||parent===window||!event.origin||event.origin==='null'||r?.channel!=='schedule-studio-api'||r.type!=='generate'||typeof r.id!=='string'||r.id.length>100)return;
 const reply=value=>event.source.postMessage({channel:'schedule-studio-api',id:r.id,...value},event.origin);
 try{reply({ok:true,payload:await generateReport(r.payload)});}catch(error){reply({ok:false,error:error.message});}
});
if(parent!==window)parent.postMessage({channel:'schedule-studio-api',type:'ready'},'*');
