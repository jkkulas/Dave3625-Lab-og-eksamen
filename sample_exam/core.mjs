export const VERSION = 1;
export const DURATION = 4 * 60 * 60 * 1000;
export const TOPICS = [
  {id:'foundations',name:'AI foundations',count:6},
  {id:'data',name:'Data preparation',count:12},
  {id:'classification',name:'Classification & algorithms',count:12},
  {id:'regression',name:'Regression',count:8},
  {id:'clustering',name:'Unsupervised learning',count:8},
  {id:'evaluation',name:'Model evaluation',count:10},
  {id:'strategy',name:'ML strategy & error analysis',count:8},
  {id:'neural',name:'Neural networks',count:6},
  {id:'genai',name:'Generative AI & prompting',count:6},
  {id:'responsible',name:'Responsible AI',count:4}
];
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for(let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function createAttempt(bank, random = Math.random, now = Date.now()) {
  const selected=[];
  for(const topic of TOPICS) {
    const pool=bank.questions.filter(q=>q.topic===topic.id);
    // Draw families first: numeric variants cannot crowd out other concepts.
    const groups=new Map();
    for(const q of pool) { const key=q.family||q.id; if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(q); }
    const candidates=shuffle([...groups.values()].map(g=>shuffle(g,random)[0]),random);
    const multi=candidates.filter(q=>q.correct.length>1);
    const single=candidates.filter(q=>q.correct.length===1);
    const multiCount=topic.count>=8?2:1;
    if(multi.length<multiCount||single.length<topic.count-multiCount) throw new Error(`Insufficient question families for ${topic.id}`);
    selected.push(...multi.slice(0,multiCount),...single.slice(0,topic.count-multiCount));
  }
  return {schemaVersion:VERSION,id:crypto.randomUUID(),bankVersion:bank.version,startedAt:new Date(now).toISOString(),deadline:now+DURATION,status:'active',index:0,answers:{},flags:[],questions:shuffle(selected,random).map(q=>({...structuredClone(q),order:shuffle(q.options.map((_,i)=>i),random)}))};
}
export function isCorrect(question, answer=[]) {
  return Array.isArray(answer)&&answer.length===question.correct.length&&new Set(answer).size===answer.length&&question.correct.every(i=>answer.includes(i));
}
export function grade(score) { return score>=72?'A':score>=64?'B':score>=48?'C':score>=40?'D':score>=32?'E':'F'; }
export function scoreAttempt(attempt) {
  const topics=TOPICS.map(t=>({...t,total:0,correct:0})); let score=0,answered=0;
  for(const q of attempt.questions) {
    const a=attempt.answers[q.id]||[]; const ok=isCorrect(q,a); if(a.length) answered++; if(ok) score++;
    const t=topics.find(t=>t.id===q.topic); if(t) {t.total++; if(ok)t.correct++;}
  }
  return {score,total:attempt.questions.length,answered,grade:grade(score),topics};
}
export function completeAttempt(attempt, reason='submitted', now=Date.now()) {
  if(attempt.status==='completed') return attempt;
  return {...attempt,status:'completed',completedAt:new Date(now).toISOString(),reason,elapsedMs:Math.min(DURATION,Math.max(0,now-Date.parse(attempt.startedAt)))};
}
export function validateAttempt(a) {
  if(!a||a.schemaVersion!==VERSION||!/^[-a-z0-9]{10,80}$/i.test(a.id)||a.status!=='completed'||!Array.isArray(a.questions)||a.questions.length!==80||!a.answers||typeof a.answers!=='object'||!Number.isFinite(Date.parse(a.startedAt))||!Number.isFinite(Date.parse(a.completedAt))) throw new Error('Not a completed 80-question exam file.');
  const ids=new Set();
  for(const q of a.questions) {
    if(!q||typeof q.id!=='string'||ids.has(q.id)||!TOPICS.some(t=>t.id===q.topic)||typeof q.prompt!=='string'||!Array.isArray(q.options)||q.options.length<2||!q.options.every(o=>typeof o==='string')||!Array.isArray(q.correct)||!q.correct.length||!q.correct.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)||new Set(q.correct).size!==q.correct.length||!Array.isArray(q.sources)||!q.sources.length||typeof q.explanation!=='string') throw new Error('Invalid question in exam file.');
    ids.add(q.id);
    if(!Array.isArray(q.order)||q.order.length!==q.options.length||new Set(q.order).size!==q.options.length||!q.order.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)) throw new Error('Invalid option order.');
    const ans=a.answers[q.id]||[];
    if(!Array.isArray(ans)||new Set(ans).size!==ans.length||!ans.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)) throw new Error('Invalid answers.');
    for(const s of q.sources) if(typeof s.title!=='string'||typeof s.path!=='string'||typeof s.locator!=='string') throw new Error('Invalid source reference.');
  }
  for(const t of TOPICS) if(a.questions.filter(q=>q.topic===t.id).length!==t.count) throw new Error('Invalid topic distribution.');
  return a;
}
