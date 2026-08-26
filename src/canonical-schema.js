export const CANONICAL_SCHEMA_VERSION='4.0';
export const canonicalDomains={
 project:['PROJECT'],wbs:['PROJWBS'],activities:['TASK'],relationships:['TASKPRED'],calendars:['CALENDAR'],resources:['RSRC','ROLES','TASKRSRC'],codes:['ACTVTYPE','ACTVCODE','TASKACTV'],udf:['UDFTYPE','UDFVALUE'],bim:['UDFTYPE','UDFVALUE']
};
export function canonicalSummary(model){
 const counts={};for(const [domain,tables] of Object.entries(canonicalDomains))counts[domain]=tables.reduce((n,t)=>n+(model?.table(t)?.length||0),0);
 return {schemaVersion:CANONICAL_SCHEMA_VERSION,sourceFormat:model?.sourceFormat||'unknown',counts,total:Object.values(counts).reduce((a,b)=>a+b,0)};
}
export function portabilityMatrix(model){
 const issues=[];
 if(model?.table('ACTVCODE')?.length)issues.push({feature:'Activity Codes',xer:'native',mspxml:'mapped/limited'});
 if(model?.table('ROLES')?.length)issues.push({feature:'Roles',xer:'native',mspxml:'limited'});
 if(model?.table('CALENDAR')?.some(c=>c.clndr_data&&!c.msp_calendar_xml))issues.push({feature:'Complex calendars',xer:'native',mspxml:'approximate'});
 if(model?.table('PROJECT')?.length>1)issues.push({feature:'Multiple projects',xer:'native',mspxml:'selected project only'});
 issues.push({feature:'BIM links',xer:'TASK UDF text',mspxml:'Extended Attributes'});
 return issues;
}
