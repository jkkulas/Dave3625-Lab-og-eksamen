import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {server} from '../server.mjs';
import {createAttempt,completeAttempt} from '../core.mjs';
const bank=JSON.parse(await fs.readFile(new URL('../questions.json',import.meta.url),'utf8'));
test('local server serves the app and course references, persists results and rejects invalid writes',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const a=completeAttempt(createAttempt(bank));const resultFile=new URL(`../results/${a.id}.json`,import.meta.url);
  try {
    for(const route of ['/','/sample_exam/','/sample_exam/index.html','/sample_exam/questions.json','/Powerpoints/DAVE3625_Examination_Guide_Autumn_2026.pdf'])assert.equal((await fetch(origin+route)).status,200,route);
    assert.equal((await(await fetch(origin+'/api/health')).json()).service,'dave3625-exam');
    const post=(body,extra={})=>fetch(origin+'/api/results',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
    assert.equal((await post(a)).status,200);const stored=JSON.parse(await fs.readFile(resultFile,'utf8'));assert.deepEqual(stored,a);
    assert.equal((await post(a)).status,200,'Idempotent save');assert((await(await fetch(origin+'/api/results')).json()).some(x=>x.id===a.id));
    assert.equal((await post({...a,reason:'different'})).status,409,'Do not overwrite a conflicting result');
    assert.equal((await post(a,{Origin:'https://unrelated.example'})).status,403);
    assert.equal((await post({id:'../../outside'})).status,400);
    assert.equal((await fetch(origin+'/.git/config')).status,403);assert.equal((await fetch(origin+'/sample_exam/.tools/extract.mjs')).status,403);assert.equal((await fetch(origin+`/sample_exam/results/${a.id}.json`)).status,403);
    assert.equal((await fetch(origin+'/api/not-real')).status,404);
  } finally {await fs.rm(resultFile,{force:true});await new Promise(resolve=>server.close(resolve));}
});
