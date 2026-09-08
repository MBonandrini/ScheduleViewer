function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}
export function contentChecksum(value){
  const s=stable(value);let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  return `fnv1a32-${h.toString(16).padStart(8,'0')}`;
}
export function attachChecksum(obj){const copy={...obj};delete copy.checksum;return {...copy,checksum:contentChecksum(copy)}}
export function verifyChecksum(obj){if(!obj?.checksum)return {ok:true,legacy:true};const copy={...obj};const expected=copy.checksum;delete copy.checksum;const actual=contentChecksum(copy);return {ok:expected===actual,legacy:false,expected,actual}}
