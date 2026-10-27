import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import './content.mjs';
import './numerical.mjs';
import {questions} from './bank-lib.mjs';
import {TOPICS} from '../core.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const bank={version:'2026.10.27.1',title:'DAVE3625 independent practice bank',generatedOn:'2026-10-27',questionCount:questions.length,guide:'../Powerpoints/DAVE3625_Examination_Guide_Autumn_2026.pdf',notes:'Practice topic weights and question-type ratios are design choices, not official exam predictions. Supplementary sources are explicitly labelled. Numerical families are sampled at most once per exam.',questions};
const prompts=new Set();
for(const q of questions){
  if(q.options.length!==4||new Set(q.options).size!==4||!q.correct.length||q.correct.length>=4)throw new Error(`Invalid options: ${q.id} ${JSON.stringify(q.options)}`);
  if(prompts.has(q.prompt))throw new Error(`Duplicate prompt: ${q.id}`);prompts.add(q.prompt);
  if(!TOPICS.some(t=>t.id===q.topic))throw new Error(`Unknown topic ${q.topic}`);
  for(const s of q.sources)if(s.path!=='study-notes.html')await fs.access(path.resolve(here,'..',s.path));
}
if(questions.length!==400)throw new Error(`Expected 400, got ${questions.length}`);
await fs.writeFile(path.resolve(here,'../questions.json'),JSON.stringify(bank,null,2)+'\n');
console.log(`Wrote ${questions.length} questions (${questions.filter(q=>!q.family).length} authored concepts and ${questions.filter(q=>q.family).length} arithmetic variants).`);
console.table(TOPICS.map(t=>({topic:t.id,bank:questions.filter(q=>q.topic===t.id).length,exam:t.count,multiple:questions.filter(q=>q.topic===t.id&&q.correct.length>1).length})));
