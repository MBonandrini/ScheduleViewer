import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.js')?[path.join(dir,e.name)]:[]);
const files=[...walk(path.join(root,'src')),...walk(path.join(root,'toolkit/src'))];
let missing=[];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(`Syntax ${file}: ${result.stderr}`);const source=fs.readFileSync(file,'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.\.?\/[^'"]+)['"]/g)){const target=path.resolve(path.dirname(file),m[1]);if(!fs.existsSync(target)&&!target.includes('/vendor/dwg/'))missing.push(`${file} -> ${m[1]}`)}}
if(missing.length)throw new Error(`Missing imports:\n${missing.join('\n')}`);
console.log(`Syntax/import contract PASS: ${files.length} JavaScript modules; optional DWG assets installed separately.`);
