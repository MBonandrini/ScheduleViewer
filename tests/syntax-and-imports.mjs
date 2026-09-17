import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname),src=path.join(root,'src'),files=fs.readdirSync(src).filter(x=>x.endsWith('.js')).sort();
for(const f of files){const r=spawnSync(process.execPath,['--check',path.join(src,f)],{encoding:'utf8'});if(r.status!==0)throw new Error(`Syntax ${f}: ${r.stderr}`)}
const importRe=/from\s+['"](\.\/?[^'"]+)['"]/g;let missing=[];for(const f of files){const txt=fs.readFileSync(path.join(src,f),'utf8');for(const m of txt.matchAll(importRe)){const target=path.resolve(src,m[1]);if(!fs.existsSync(target))missing.push(`${f} -> ${m[1]}`)}}if(missing.length)throw new Error(`Missing imports:\n${missing.join('\n')}`);
console.log(`Syntax/import contract PASS: ${files.length} JavaScript modules, zero missing local imports.`);
