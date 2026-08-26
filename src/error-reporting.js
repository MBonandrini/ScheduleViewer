import { integritySummary } from './integrity.js';
export function actionableError(error,{operation='Operation'}={}){
  const lines=[`${operation} failed.`,''];
  if(error?.code==='INTEGRITY_FAILURE'&&error.integrity){lines.push('The change was rolled back because it would leave the schedule structurally invalid.','',integritySummary(error.integrity),'','Recommended action: repair the referenced activities/WBS/resources/relationships and try again.');return lines.join('\n')}
  lines.push(String(error?.message||error||'Unknown error.'));
  if(error?.code)lines.push('',`Error code: ${error.code}`);
  lines.push('','No partial changes from this operation should be relied upon. Review the affected schedule data and retry.');
  return lines.join('\n');
}
