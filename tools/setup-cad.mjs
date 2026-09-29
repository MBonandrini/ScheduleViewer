import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:path.join(root,'tools/cad'),stdio:'inherit',shell:process.platform==='win32'});
if(result.status!==0){console.error('CAD setup failed. Install Node.js 20+ with npm, then retry. PDF measurement remains available.');process.exit(1)}
const src=path.join(root,'tools/cad/node_modules/@mlightcad/libredwg-web'),dest=path.join(root,'toolkit/vendor/dwg');fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const folder of ['dist','wasm'])fs.mkdirSync(path.join(dest,folder),{recursive:true});
for(const file of ['dist/libredwg-web.js','wasm/libredwg-web.js','wasm/libredwg-web.wasm','package.json','README.md'])fs.copyFileSync(path.join(src,file),path.join(dest,file));console.log('DWG adapter installed locally (LibreDWG GPL-3.0).');

fs.copyFileSync(path.join(root,'tools/cad/COPYING'),path.join(dest,'COPYING'));
const source=path.join(root,'tools/cad/source');
for(const [name,expected] of Object.entries(JSON.parse(fs.readFileSync(path.join(source,'checksums.json'),'utf8')))){
 const actual=createHash('sha256').update(fs.readFileSync(path.join(source,name))).digest('hex');if(actual!==expected)throw new Error('Decoder source checksum mismatch: '+name);
}
fs.cpSync(source,path.join(dest,'source'),{recursive:true});
