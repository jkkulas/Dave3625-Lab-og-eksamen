import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TOPICS,DURATION,createAttempt,isCorrect,scoreAttempt,grade,completeAttempt,validateAttempt} from '../core.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bank=JSON.parse(await fs.readFile(path.join(base,'questions.json'),'utf8'));
function random(seed){return()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}

test('bank has 400 unique questions, valid answers and real source targets',async()=>{
  assert.equal(bank.questions.length,400);assert.equal(new Set(bank.questions.map(q=>q.id)).size,400);assert.equal(new Set(bank.questions.map(q=>q.prompt)).size,400);
  for(const q of bank.questions){
    assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert(q.correct.length>0&&q.correct.length<4,q.id);assert.equal(new Set(q.correct).size,q.correct.length,q.id);assert(q.correct.every(i=>Number.isInteger(i)&&i>=0&&i<4),q.id);assert(q.explanation.length>30,q.id);assert(q.sources.length,q.id);
    for(const s of q.sources){assert(s.locator,q.id);await fs.access(path.resolve(base,s.path));if(s.page)assert(s.page>=1&&s.page<=40,q.id);if(s.anchor){const html=await fs.readFile(path.resolve(base,s.path),'utf8');assert(html.includes(`id="${s.anchor}"`),q.id);}}
  }
});
test('500 sampled exams obey topic/type quotas, have unique families and preserve option meanings',()=>{
  const seen=new Set(),positions=new Set();
  for(let seed=0;seed<500;seed++){
    const a=createAttempt(bank,random(seed));assert.equal(a.questions.length,80);assert.equal(new Set(a.questions.map(q=>q.id)).size,80);assert.equal(new Set(a.questions.map(q=>q.family||q.id)).size,80);assert.equal(a.questions.filter(q=>q.correct.length>1).length,16);
    for(const t of TOPICS)assert.equal(a.questions.filter(q=>q.topic===t.id).length,t.count,t.id);
    for(const q of a.questions){seen.add(q.id);assert.deepEqual([...q.order].sort(),[0,1,2,3]);const original=bank.questions.find(b=>b.id===q.id);assert.deepEqual(q.options,original.options);assert.deepEqual(q.correct,original.correct);positions.add(q.order.indexOf(q.correct[0]));}
  }
  assert.equal(seen.size,400,'All questions can be selected');assert.equal(positions.size,4,'Correct answers appear in all displayed positions');
});
test('exact-match scoring rejects omissions, extras, duplicates and blanks',()=>{
  const q={correct:[0,2]};assert(isCorrect(q,[2,0]));for(const a of [[],[0],[0,1,2],[0,0],[2,2],null])assert.equal(isCorrect(q,a),false);
  const single={correct:[1]};assert(isCorrect(single,[1]));assert(!isCorrect(single,[0]));assert(!isCorrect(single,[1,2]));
});
test('all grade boundaries match the guide',()=>{
  for(const [score,g] of [[0,'F'],[31,'F'],[32,'E'],[39,'E'],[40,'D'],[47,'D'],[48,'C'],[63,'C'],[64,'B'],[71,'B'],[72,'A'],[80,'A']])assert.equal(grade(score),g);
});
test('scoring uses original option IDs after shuffle and counts topic results',()=>{
  const a=createAttempt(bank,random(22));assert.equal(scoreAttempt(a).score,0);assert.equal(scoreAttempt(a).answered,0);
  for(const q of a.questions)a.answers[q.id]=[...q.correct];const perfect=scoreAttempt(a);assert.equal(perfect.score,80);assert.equal(perfect.grade,'A');assert(perfect.topics.every(t=>t.correct===t.count));
  const multi=a.questions.find(q=>q.correct.length>1);a.answers[multi.id]=[multi.correct[0]];assert.equal(scoreAttempt(a).score,79);
});
test('submission snapshots survive bank edits and completion is idempotent',()=>{
  const now=Date.UTC(2026,9,27,9);const a=createAttempt(bank,random(8),now);assert.equal(a.deadline,now+DURATION);
  const original=bank.questions.find(q=>q.id===a.questions[0].id);const text=original.prompt;original.prompt='Changed';assert.notEqual(a.questions[0].prompt,'Changed');original.prompt=text;
  const completed=completeAttempt(a,'timeout',now+DURATION+5000);assert.equal(completed.elapsedMs,DURATION);assert.equal(completed.reason,'timeout');assert.equal(a.status,'active');assert.equal(completeAttempt(completed),completed);assert.equal(validateAttempt(completed),completed);
});
test('import validator rejects damaged and path-like IDs and option maps',()=>{
  const good=completeAttempt(createAttempt(bank,random(7)));assert.equal(validateAttempt(JSON.parse(JSON.stringify(good))).questions.length,80);
  for(const edit of [a=>a.id='../../escape',a=>a.questions.pop(),a=>a.questions[0].order=[0,0,0,0],a=>a.questions[0].correct=[-1],a=>a.answers[a.questions[0].id]=[99],a=>a.questions[0].sources=[{}],a=>a.status='active',a=>a.questions[0].topic='unknown']){const a=structuredClone(good);edit(a);assert.throws(()=>validateAttempt(a));}
});
