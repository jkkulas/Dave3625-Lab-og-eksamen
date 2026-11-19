import {isCorrect, shuffle} from './core.mjs';

const papers = new Map([
  ['sample-2026', {
    title: 'Professor’s 2026 sample',
    description: '8 questions · 15 points. The published key and writing rubric appear after submission. The final has 80 questions worth 120 points. The professor says these sample questions will not appear on it.',
    pdf: '../exams/DAVE3625_Sample_exam_2026.pdf',
    shuffleOptions: true
  }],
  ['exam-2025', {
    title: 'December 2025 exam',
    description: '125 single-answer questions in printed order. The PDF records a candidate’s responses. Review uses an independently prepared study key. Ambiguous questions include discussion notes and are excluded from the practice score.',
    pdf: '../exams/1316517_436597936_123642078_3 (2).pdf',
    shuffleOptions: false
  }]
]);
const references = {
  aiIndex: ['2025 AI Index report', 'https://hai.stanford.edu/assets/files/hai_ai_index_report_2025.pdf'],
  aiAct: ['EU Council legislative timeline', 'https://www.consilium.europa.eu/en/policies/artificial-intelligence-act/timeline-artificial-intelligence/']
};
const $ = id => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
const paper = papers.get(id);
const storageKey = 'dave3625.paper.v1.' + id;
let questions, state;

function newState() {
  const orders = questions.map(q => {
    const indices = (q.options || []).map((_, index) => index);
    return paper.shuffleOptions ? shuffle(indices) : indices;
  });
  return {index: 0, answers: {}, orders, finished: false, writtenMark: null};
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { $('notice').textContent = 'Browser storage is unavailable. Keep this page open to retain your answers.'; }
}

function answered(q) {
  const response = state.answers[q.number];
  return q.kind === 'written' ? Boolean(response?.trim()) : Boolean(response?.length);
}

function updateSummary() {
  $('answered').textContent = questions.filter(answered).length + ' of ' + questions.length + ' answered';
  if (!state.finished) return;
  let earned = 0, possible = 0, pending = 0;
  for (const q of questions) {
    if (q.kind === 'written') {
      if (answered(q) && state.writtenMark === null) pending += q.points;
      else { possible += q.points; earned += state.writtenMark || 0; }
    } else if (q.correct) {
      possible += q.points || 1;
      if (isCorrect(q, state.answers[q.number])) earned += q.points || 1;
    }
  }
  $('summary').textContent = 'Practice score ' + earned + ' / ' + possible +
    (pending ? ' · ' + pending + ' written points awaiting your self-mark on question 8' : '') +
    (state.writtenMark !== null ? ' · includes your written self-mark' : '');
}

function showFeedback(q) {
  const box = $('feedback');
  box.replaceChildren();
  box.hidden = !state.finished;
  if (!state.finished) return;
  const heading = document.createElement('strong');
  box.append(heading);
  if (q.kind === 'written') {
    heading.textContent = 'Professor’s marking rubric · 5 points';
    for (const text of q.rubric) {
      const p = document.createElement('p'); p.textContent = text; box.append(p);
    }
    const label = document.createElement('label');
    label.textContent = 'Your self-mark ';
    const mark = document.createElement('select');
    mark.add(new Option('Choose points', ''));
    for (let i = 0; i <= q.points; i++) mark.add(new Option(String(i), String(i)));
    mark.disabled = !answered(q);
    mark.value = mark.disabled ? '0' : String(state.writtenMark ?? '');
    mark.onchange = () => {
      state.writtenMark = mark.value === '' ? null : Number(mark.value);
      save(); updateSummary();
    };
    label.append(mark); box.append(label);
  } else if (q.correct) {
    const outcome = !answered(q) ? 'Unanswered' : isCorrect(q, state.answers[q.number]) ? 'Correct' : 'Incorrect';
    heading.textContent = outcome + ' · ' + (q.part ? 'Published answer' : 'Study answer');
    for (const i of q.correct) {
      const p = document.createElement('p'); p.textContent = q.options[i]; box.append(p);
    }
  } else {
    heading.textContent = 'Discussion only · excluded from score';
  }
  if (q.note) {
    const p = document.createElement('p'); p.textContent = q.note; box.append(p);
  }
  if (references[q.reference]) {
    const [title, url] = references[q.reference];
    const link = document.createElement('a');
    link.textContent = title; link.href = url; link.target = '_blank'; link.rel = 'noopener';
    box.append(link);
  }
}

function render() {
  const q = questions[state.index];
  $('jump').value = String(state.index);
  $('meta').textContent = q.part ? 'Part ' + q.part + ' · ' + q.points + (q.points === 1 ? ' point' : ' points') : '2025 exam · question ' + q.number;
  $('prompt').textContent = q.prompt;
  $('code').hidden = !q.code;
  $('code').textContent = q.code || '';
  $('pdf').href = paper.pdf + '#page=' + q.page;
  $('pdf').textContent = 'Open original question · PDF page ' + q.page + ' ↗';
  const field = $('response');
  field.replaceChildren(); field.disabled = state.finished;
  const legend = document.createElement('legend');
  legend.textContent = {
    single: 'Select one answer.',
    multiple: 'Select all correct answers. One or more may be correct.',
    written: 'Write about 80–150 words in English or Norwegian.'
  }[q.kind];
  field.append(legend);
  if (q.kind === 'written') {
    const area = document.createElement('textarea');
    area.setAttribute('aria-label', 'Your written answer'); area.rows = 8;
    area.value = state.answers[q.number] || '';
    area.oninput = () => { state.answers[q.number] = area.value; save(); updateSummary(); };
    field.append(area);
  } else {
    for (const i of state.orders[state.index]) {
      const label = document.createElement('label'); label.className = 'option';
      const input = document.createElement('input');
      input.type = q.kind === 'multiple' ? 'checkbox' : 'radio';
      input.name = 'answer'; input.value = String(i);
      input.checked = (state.answers[q.number] || []).includes(i);
      input.onchange = () => {
        state.answers[q.number] = [...field.querySelectorAll('input:checked')].map(el => Number(el.value));
        save(); updateSummary();
      };
      label.append(input, document.createTextNode(q.options[i])); field.append(label);
    }
  }
  showFeedback(q);
  $('prev').disabled = state.index === 0;
  $('next').disabled = state.index === questions.length - 1 && state.finished;
  $('next').textContent = state.index === questions.length - 1 ? (state.finished ? 'End of paper' : 'Finish paper') : 'Next question →';
  $('finish').textContent = state.finished ? 'Practise again' : 'Finish paper';
  $('finish').hidden = !state.finished && state.index === questions.length - 1;
  updateSummary();
}

function go(index) {
  state.index = index; save(); render(); $('prompt').focus();
}

function finish() {
  if (state.finished) {
    if (!confirm('Start this paper again and clear this paper’s saved responses?')) return;
    state = newState(); $('summary').textContent = '';
  } else {
    const remaining = questions.filter(q => !answered(q)).length;
    if (!confirm('Finish this paper and reveal the answers? Unanswered questions: ' + remaining + '.')) return;
    state.finished = true;
  }
  go(0);
}

try {
  if (!paper) throw new Error('Choose a paper from the practice overview.');
  const response = await fetch(id + '.json');
  if (!response.ok) throw new Error('Could not load the questions.');
  questions = await response.json();
  state = newState();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isInteger(saved.index) && questions[saved.index] && saved.answers &&
        Array.isArray(saved.orders) && saved.orders.length === questions.length &&
        questions.every((q, i) => Array.isArray(saved.orders[i]) &&
          saved.orders[i].length === (q.options?.length || 0) &&
          (q.options || []).every((_, n) => saved.orders[i].includes(n)) &&
          (saved.answers[q.number] === undefined || (q.kind === 'written'
            ? typeof saved.answers[q.number] === 'string' : Array.isArray(saved.answers[q.number]))))) state = saved;
  } catch { /* A fresh session can still run when storage is unavailable. */ }
  document.title = paper.title + ' · DAVE3625'; $('paper-title').textContent = paper.title;
  $('description').textContent = paper.description + ' Your progress is saved in this browser.';
  questions.forEach((q, i) => $('jump').add(new Option(String(q.number), String(i))));
  $('jump').onchange = e => go(Number(e.target.value));
  $('prev').onclick = () => go(state.index - 1);
  $('next').onclick = () => state.index === questions.length - 1 ? finish() : go(state.index + 1);
  $('finish').onclick = finish;
  render(); $('reader').hidden = false;
} catch (error) { $('notice').textContent = error.message; }
