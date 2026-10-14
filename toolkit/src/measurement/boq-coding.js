export const DISCIPLINES=['E&I','Mechanical','Civil','Earthworks','Architectural','Structural','Commissioning'];
export const CODING_FIELDS=[['discipline','Discipline'],['service','Service'],['step','Step'],['building','Building'],['floor','Floor'],['room','Room'],['elevation','Elevation'],['phase','Phase'],['drawingNumber','Drawing Number'],['drawingRevision','Drawing Revision']];
export const CODING_HEADERS=CODING_FIELDS.flatMap(([key,label])=>[label,label+' Confidence']);
export const CONFIDENCE=['Unrated','Low','Medium','High','Verified'];
export function normaliseCoding(row){const r={...row};if(r.discipline==='Electrical'||r.discipline==='Instrumentation & Controls')r.discipline='E&I';for(const [key]of CODING_FIELDS){r[key]??='';r[key+'Confidence']??='Unrated';}r.drawingRevision ||= r.trace?.revision||'';return r;}
export function codingValues(row){const r=normaliseCoding(row);return CODING_FIELDS.flatMap(([key])=>[r[key],r[key+'Confidence']]);}
