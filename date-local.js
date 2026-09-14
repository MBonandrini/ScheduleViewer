/** Parse/format schedule dates without browser timezone conversion. */
export function normalizeLocalDateTime(value,{separator='T',seconds=true}={}){
  const s=String(value??'').trim(); if(!s)return '';
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(!m)return s.replace(' ','T').replace(/Z$/,'');
  const [,y,mo,d,hh='00',mi='00',ss='00']=m;
  return `${y}-${mo}-${d}${separator}${hh}:${mi}${seconds?`:${ss}`:''}`;
}
export function toP6Local(value){return normalizeLocalDateTime(value,{separator:' ',seconds:true})}
export function toXmlLocal(value){return normalizeLocalDateTime(value,{separator:'T',seconds:true})}
export function localDateParts(value){const s=normalizeLocalDateTime(value);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);return m?{year:+m[1],month:+m[2],day:+m[3],hour:+m[4],minute:+m[5],second:+m[6]}:null}
