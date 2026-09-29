/** Browser-only schedule import: no native converters or local services. */
import {parseXER} from './xer.js';
import {parseMSProjectXML} from './mspxml.js';
export async function parseScheduleFile(file) {
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 if(ext==='mpp')throw new Error('MPP is not supported. Export the schedule as XML or XER and open that file.');
 if(!['xer','xml'].includes(ext))throw new Error(`Unsupported schedule format: .${ext}`);
 const text=await file.text();
 return ext==='xer'?parseXER(text,file.name):parseMSProjectXML(text,file.name);
}
