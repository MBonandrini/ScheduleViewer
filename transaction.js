import { cloneTables, restoreTables } from './editor.js';
import { validateModelIntegrity } from './integrity.js';

/** Execute a mutating operation atomically. Any exception or new integrity error rolls back all tables. */
export function runTransaction(model,label,mutator,{validate=true,projectId=null}={}){
  const before=cloneTables(model);
  try{
    const result=mutator();
    if(validate){const check=validateModelIntegrity(model,{projectId});if(!check.ok){const err=new Error(`${label} would leave the schedule structurally invalid.`);err.code='INTEGRITY_FAILURE';err.integrity=check;throw err}}
    return result;
  }catch(error){restoreTables(model,before);throw error}
}
