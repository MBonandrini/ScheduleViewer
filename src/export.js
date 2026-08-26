export function toCSV(rows, columns = null) {
  if (!rows?.length) return '';
  const cols=columns||[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
  return [cols.map(q).join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n');
}
export function downloadText(name,text,type='text/plain') {
  const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
