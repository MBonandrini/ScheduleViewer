import test from 'node:test';import assert from 'node:assert/strict';
import {riskResultHTML,riskReportDocument} from '../src/risk-presentation.js';
import {runQSRA} from '../src/v7-risk-engine.js';import {model} from './helpers/model.mjs';
test('risk presentation rounds duration only and preserves the stored assessment',()=>{
 const result=runQSRA(model([{task_code:'A',remain_drtn_hr_cnt:'35',target_drtn_hr_cnt:'35'}]),'P',{iterations:100,minFactor:1,modeFactor:1,maxFactor:1});
 const before=JSON.stringify(result),html=riskResultHTML(result);assert.ok(html.includes('<b>1 d</b>'));assert.equal(result.p80,35/24);assert.equal(JSON.stringify(result),before);assert.equal((html.match(/class="risk-gauge"/g)||[]).length,3);assert.ok(html.includes('Not set'));assert.ok(!html.includes('NaN'));assert.ok(html.includes('aria-description='));
});
test('standalone assessment escapes schedule names and includes model explanations and print layout',()=>{
 const result=runQSRA(model([{task_code:'A'}]),'P',{iterations:100});result.scheduleName='<script>alert(1)</script>';
 const html=riskReportDocument(result);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('@media print'));assert.ok(html.includes('Print / Save as PDF'));assert.ok(html.includes('Reading this assessment'));assert.ok(html.includes('calendars')||html.includes('Calendars'));assert.ok(!/https?:\/\//.test(html));
});
