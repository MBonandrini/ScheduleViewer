import test from 'node:test';import assert from 'node:assert/strict';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const {cloudChat,saveCloudConfig,cloudProviderIds}=await import('../toolkit/src/ai/cloud.js');
for(const provider of cloudProviderIds())test('cloud adapter '+provider+' sends configured model and parses text',async()=>{
 saveCloudConfig(provider,{model:'fixture-model',apiKey:'fixture-key',baseUrl:'https://example.invalid/mock'});
 const old=globalThis.fetch;let body;globalThis.fetch=async(url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({output_text:'fixture reply',choices:[{message:{content:'fixture reply'}}],candidates:[{content:{parts:[{text:'fixture reply'}]}}],content:[{type:'text',text:'fixture reply'}]}),{status:200,headers:{'Content-Type':'application/json'}})};
 try{const result=await cloudChat(provider,[{role:'system',content:'test instructions'},{role:'user',content:'synthetic only'}]);assert.equal(result.text,'fixture reply');assert.ok(JSON.stringify(body).includes('synthetic only'))}finally{globalThis.fetch=old}
});
test('cloud missing credentials fails before a network request',async()=>{storage.clear();await assert.rejects(()=>cloudChat('openai',[{role:'user',content:'x'}]),/key/)});
