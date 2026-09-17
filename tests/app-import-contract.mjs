import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const importRe=/import\s*\{([\s\S]*?)\}\s*from\s*['"](\.\/[^'"]+)['"];?/g;
let m,count=0;
const missing=[];
while((m=importRe.exec(app))){
  count++;
  const spec=m[2];
  const names=m[1].split(',').map(x=>x.trim()).filter(Boolean).map(x=>x.split(/\s+as\s+/i)[0].trim());
  const file=path.resolve(path.dirname(path.join(root,'src/app.js')),spec);
  const mod=await import(pathToFileURL(file).href+`?audit=${Date.now()}-${count}`);
  for(const name of names) if(!(name in mod)) missing.push(`${spec}: ${name}`);
}
if(missing.length){
 console.error('Missing named exports:\n'+missing.join('\n'));
 process.exit(1);
}
console.log(`App import/export contract PASS: ${count} modules, zero missing named exports.`);
