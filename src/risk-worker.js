import {XERModel} from './parser.js';
import {runQSRA} from './v7-risk-engine.js';
self.onmessage=({data})=>{
  try{
    const model=new XERModel({header:[],warnings:[],sourceText:'',tables:new Map(data.tables)});
    self.postMessage(runQSRA(model,data.projectId,data.options));
  }catch(error){self.postMessage({error:error.message||String(error),iterations:0});}
};
