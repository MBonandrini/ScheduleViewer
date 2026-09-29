/** Publish only static runtime assets; no tests, uploaded evidence, installers or secrets. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
for(const asset of ['dist/libredwg-web.js','wasm/libredwg-web.js','wasm/libredwg-web.wasm'])if(!fs.existsSync(path.join(root,'toolkit/vendor/dwg',asset)))throw new Error('Deployment decoder missing. Run npm run setup:dwg on the build runner.');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const item of ['index.html','styles.css','sw.js','manifest.webmanifest','.nojekyll','src','sample','THIRD_PARTY_NOTICES.md','toolkit/index.html','toolkit/assets','toolkit/src','toolkit/vendor']){
 const target=path.join(out,item);fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(path.join(root,item),target,{recursive:true});
}
console.log('GitHub Pages runtime prepared in dist. All asset paths are repository-relative.');
