import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '../.tools/node_modules/@playwright/test/index.mjs';
import {server} from '../server.mjs';

await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage();const errors=[];const created=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(origin+'/sample_exam/index.html');await page.getByRole('button',{name:'Start a new exam'}).waitFor();
  await page.screenshot({path:new URL('../.tools/home.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:true});
  await page.getByRole('button',{name:'Start a new exam'}).click();await page.locator('input[name=answer]').first().check();await page.getByRole('button',{name:'⚐ Flag',exact:true}).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('dave3625.active.v1')));created.push(before.id);
  await page.reload();await page.getByRole('button',{name:'Resume exam'}).click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('dave3625.active.v1')));assert.deepEqual(after.answers,before.answers);assert.deepEqual(after.questions,before.questions);assert.equal(after.deadline,before.deadline);assert.deepEqual(after.flags,before.flags);
  const multiIndex=before.questions.findIndex(q=>q.correct.length>1);await page.locator(`[data-index="${multiIndex}"]`).click();const boxes=page.locator('input[type=checkbox]');await boxes.nth(0).check();await boxes.nth(1).check();assert.equal(await boxes.filter({visible:true}).count(),4);
  await page.getByRole('button',{name:'Clear answer',exact:true}).click();assert.equal(await page.locator('input:checked').count(),0);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow on mobile');await page.screenshot({path:new URL('../.tools/mobile-exam.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:true});
  // Finish the remaining answers from the saved snapshot, then exercise UI submission.
  await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('dave3625.active.v1'));for(const q of a.questions)a.answers[q.id]=q.correct;localStorage.setItem('dave3625.active.v1',JSON.stringify(a));});
  await page.reload();await page.getByRole('button',{name:'Resume exam'}).click();await page.getByRole('button',{name:'Submit exam',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Submit exam',exact:true}).click();await page.getByText('Make your next attempt count.').waitFor();await page.getByText(`Saved to sample_exam/results/${before.id}.json`,{exact:true}).waitFor();
  assert.equal(await page.locator('.result-score').innerText(),'80 / 80');assert.equal(await page.locator('.review-card').count(),80);assert.equal(await page.locator('.status-correct').count(),80);
  await page.locator('#review-filter').selectOption('wrong');assert.equal(await page.locator('.review-card').count(),0);await page.locator('#review-filter').selectOption('all');
  await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:new URL('../.tools/result.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'),fullPage:false});
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export result JSON'}).click();const download=await downloadPromise;const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(exported.id,before.id);
  await page.getByRole('button',{name:/Past exams/}).click();await page.locator('#import-file').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.getByText('Result imported.',{exact:true}).waitFor();
  // Fresh browser context recovers the result from the disk-backed API.
  const fresh=await browser.newContext();const freshPage=await fresh.newPage();await freshPage.goto(origin+'/sample_exam/index.html');await freshPage.getByRole('button',{name:/Past exams/}).click();await freshPage.locator(`[data-review="${before.id}"]`).waitFor();await fresh.close();
  // Expiry while the page was closed: reopening must finish, not reset the clock.
  await page.getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'Start a new exam'}).click();const expired=await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('dave3625.active.v1'));a.deadline=Date.now()-1000;localStorage.setItem('dave3625.active.v1',JSON.stringify(a));return a.id;});created.push(expired);await page.reload();await page.getByText('Make your next attempt count.').waitFor();await page.getByText(`Saved to sample_exam/results/${expired}.json`,{exact:true}).waitFor();assert.equal(await page.locator('.result-score').innerText(),'0 / 80');
  // A static host has no API. Exercise browser-only saving independently.
  const staticContext=await browser.newContext();await staticContext.route('**/api/**',route=>route.fulfill({status:404,body:'Not found'}));const staticPage=await staticContext.newPage();staticPage.on('pageerror',e=>errors.push(e.message));
  await staticPage.goto(origin+'/sample_exam/index.html');await staticPage.getByRole('button',{name:'Start a new exam'}).waitFor();assert.match(await staticPage.locator('.storage-status').innerText(),/Browser storage mode/);
  await staticPage.getByRole('button',{name:'Start a new exam'}).click();const only=await staticPage.evaluate(()=>{const a=JSON.parse(localStorage.getItem('dave3625.active.v1'));return {id:a.id,index:a.questions.findIndex(q=>q.correct.length===1),q:a.questions.find(q=>q.correct.length===1)};});
  await staticPage.locator(`[data-index="${only.index}"]`).click();await staticPage.locator(`input[value="${only.q.correct[0]}"]`).check();await staticPage.getByRole('button',{name:'Submit exam',exact:true}).click();await staticPage.getByText('79 unanswered questions · 0 flagged. Unanswered questions receive zero points.',{exact:true}).waitFor();await staticPage.getByRole('dialog').getByRole('button',{name:'Submit exam',exact:true}).click();await staticPage.getByText('Make your next attempt count.').waitFor();assert.equal(await staticPage.locator('.result-score').innerText(),'1 / 80');
  await staticPage.reload();await staticPage.getByRole('button',{name:/Past exams/}).click();await staticPage.locator(`[data-review="${only.id}"]`).click();assert.equal(await staticPage.locator('.result-score').innerText(),'1 / 80');
  await staticPage.clock.install();await staticPage.getByRole('button',{name:'New exam →',exact:true}).click();await staticPage.clock.fastForward(4*60*60*1000+2000);await staticPage.getByText('Make your next attempt count.').waitFor();assert.equal(await staticPage.locator('.result-score').innerText(),'0 / 80');assert.match(await staticPage.locator('.result-hero').innerText(),/TIME EXPIRED/);await staticContext.close();
  assert.deepEqual(errors,[]);console.log('Browser QA passed: desktop/mobile, answer/flag resume, checkbox clear, exact score, file persistence, export/import, fresh-browser history, expired resume, static-host storage, live timer expiry.');
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));for(const id of created)await fs.rm(new URL(`../results/${id}.json`,import.meta.url),{force:true});
}
