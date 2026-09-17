// Optional real-browser acceptance. Requires Playwright and its Chromium download.
// Start the app separately: python3 -m http.server 8080
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const errors=[],base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:8080';
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?demo=1');
 await page.waitForFunction(()=>window.__scheduleStudioBooted&&document.querySelector('#exportBtn')?.disabled===false);
 await page.locator('.activity-resizable-table tbody tr[data-id]').first().waitFor();
 const views=await page.locator('#nav button[data-view]').evaluateAll(buttons=>buttons.map(b=>b.dataset.view));
 for(const view of views){await page.locator(`#nav button[data-view="${view}"]`).click();await page.waitForTimeout(100);assert.ok((await page.locator('#view').innerText()).trim(),`Empty ${view} view`);}
 await page.locator('#nav button[data-view="riskV7"]').click();
 await page.locator('#v7RiskIterations').fill('100');await page.locator('#v7RunRisk').click();
 await page.getByText('P80',{exact:true}).waitFor();
 await page.locator('#nav button[data-view="activities"]').click();
 await page.locator('#globalSearch').fill('A');
 await page.locator('#globalSearch').fill('');
 await page.locator('#menuBar > details').first().locator('summary').click();await page.locator('#menuBar button[data-command="saveAs"]').click();await page.locator('#saveAsName').fill('acceptance-copy');await page.locator('#saveAsFormat').selectOption('package');assert.equal(await page.locator('#saveAsName').inputValue(),'acceptance-copy.ussproj');await page.locator('#saveAsCancel').click();
 await fs.promises.mkdir('test-artifacts',{recursive:true});
 await page.screenshot({path:'test-artifacts/activities.png',fullPage:true});
 await page.locator('#menuBar > details').nth(2).locator('summary').click();await page.locator('#menuBar button[data-view="dashboard"]').click();
 await page.screenshot({path:'test-artifacts/dashboard.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log(`Browser acceptance PASS: boot/import, ${views.length} navigation views, background QSRA, search and screenshots.`);
}finally{await browser.close()}
