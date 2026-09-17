import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);if(dup.length)throw new Error(`Duplicate HTML ids: ${[...new Set(dup)].join(', ')}`);
let depth=0,inComment=false,quote='';for(let i=0;i<css.length;i++){const c=css[i],n=css[i+1];if(inComment){if(c==='*'&&n==='/'){inComment=false;i++}continue}if(quote){if(c==='\\'){i++;continue}if(c===quote)quote='';continue}if(c==='/'&&n==='*'){inComment=true;i++;continue}if(c==='"'||c==="'"){quote=c;continue}if(c==='{')depth++;if(c==='}')depth--;if(depth<0)throw new Error(`CSS closes too many braces near ${i}`)}if(depth!==0)throw new Error(`CSS brace depth ${depth}`);
const sw=spawnSync(process.execPath,['--check',path.join(root,'sw.js')],{encoding:'utf8'});if(sw.status!==0)throw new Error(sw.stderr);
for(const id of ['fileInput','projectFolderInput','compareInput','baselineInput','packageInput','importProgress','modal'])if(!ids.includes(id))throw new Error(`Required HTML control missing: ${id}`);
console.log(`Static UI contract PASS: ${ids.length} unique IDs, balanced CSS, valid service-worker syntax.`);
