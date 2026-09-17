import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),app=read('src/app.js'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const fail=m=>{throw new Error(m)};
const version='v'+JSON.parse(read('package.json')).version;
if(!html.includes(version)||!manifest.name.includes(version)||!sw.includes(version))fail('V7 version contract failed');
const v7Views=['assurance','progressIntel','revisionLab','pathsDelay','riskV7','dashboardStudio','reportStudio'];
for(const view of v7Views) if(!html.includes(`data-view="${view}"`)||!app.includes(`${view}:renderV7`)) fail(`Missing V7 view wiring: ${view}`);
const v7Modules=['v7-schedule-assurance.js','v7-network-intelligence.js','v7-progress-intelligence.js','v7-revision-intelligence.js','v7-risk-engine.js','v7-command-registry.js'];
for(const mod of v7Modules) if(!sw.includes(`./src/${mod}`)) fail(`Service worker missing ${mod}`);
for(const control of ['menuOpenSchedule','openBtn','welcomeOpen']) if(!html.includes(`id="${control}"`)) fail(`Open control missing ${control}`);
if(!html.includes('id="importProgress"')||!app.includes('setImportProgress(')) fail('Import progress UI contract failed');
if(!app.includes('Print A3')||!app.includes('printGanttBtn')||!app.includes('printDashboardBtn')) fail('A3 print controls missing');
// Every local service-worker asset must exist in the release tree (./ itself excluded).
const assets=[...sw.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1]).filter(x=>x!=='./');
const missingAssets=assets.filter(a=>!fs.existsSync(path.join(root,a.slice(2))));
if(missingAssets.length) fail(`Service worker references missing assets: ${missingAssets.join(', ')}`);
// Every visible menu command must be represented in the command catalogue and handler/audit surface.
const menuCommands=[...new Set([...html.matchAll(/data-command="([^"]+)"/g)].map(m=>m[1]))];
const p6=read('src/p6-commands.js');
for(const cmd of menuCommands){
 if(!p6.includes(`id:'${cmd}'`)&&!p6.includes(`id:"${cmd}"`)) fail(`Menu command missing from P6 command catalogue: ${cmd}`);
 if(!app.includes(`${cmd}:`)&&!app.includes(`${cmd},`)&&!app.includes(`['${cmd}']`)) fail(`Menu command lacks app handler/audit reference: ${cmd}`);
}
// Every data-view target in index must appear in the runtime renderer audit map.
const views=[...new Set([...html.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]))];
for(const view of views) if(!app.includes(`${view}:render`)) fail(`Visible view lacks renderer mapping: ${view}`);
// Deployment is gated by the exhaustive test job.
const workflow=read('.github/workflows/pages.yml');
if(!workflow.includes('npm run test:exhaustive')||!workflow.includes('needs: test')) fail('GitHub Pages deployment is not test-gated');
console.log(`Package contract PASS: ${assets.length} cached assets exist; ${menuCommands.length} menu/toolbar commands and ${views.length} visible views are wired; deployment is test-gated.`);
