/** Bound editable DOM while retaining parent bands at page boundaries. */
export function pageActivityRows(rows,page=0,size=250){
 const pages=Math.max(1,Math.ceil(rows.length/size)),index=Math.max(0,Math.min(pages-1,Number(page)||0)),start=index*size;
 const ancestors=[];
 for(let i=0;i<start;i++){
  const row=rows[i];if(row.kind==='activity')continue;
  while(ancestors.length&&Number(ancestors.at(-1).depth)>=Number(row.depth))ancestors.pop();
  ancestors.push(row);
 }
 const slice=rows.slice(start,start+size),first=slice[0];
 const context=first?ancestors.filter(r=>Number(r.depth)<Number(first.depth)):[];
 return {rows:[...context,...slice],page:index,pages,start,end:Math.min(rows.length,start+size),total:rows.length};
}
