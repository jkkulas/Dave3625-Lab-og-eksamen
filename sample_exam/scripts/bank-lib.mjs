export const questions=[];
const sourceFiles={
  basics:['Basics and history of AI','../Powerpoints/Basics and history of AI-dave3625.pptx'],
  data:['Data for AI','../Powerpoints/Data-for-AI-DAVE3625.pptx'],
  ml1:['Machine Learning I','../Powerpoints/MachineLearning-2026-DAVE3625-p1.pptx'],
  ml2:['Machine Learning II','../Powerpoints/MachineLearning-p2-supervised-unsupervised-algortihms-2026-DAVE3625.pptx'],
  ml3:['Regression and Clustering','../Powerpoints/DAVE3625_ML_III_Regression_and_Clustering_2026.pptx'],
  eval:['Model Evaluation','../Powerpoints/ModelEvaluation-2026-DAVE3625.pptx'],
  book:['Andrew Ng · Machine Learning Yearning','../Powerpoints/Ng-MLY01-MachineLearning Yearning.pdf'],
  notes:['Supplementary study notes','study-notes.html'],
  lab3:['Lab 3 · solution notebook','../Lab3/solution.ipynb'],
  lab4:['Lab 4 · solution notebook','../Lab4/solution.ipynb'],
  lab5:['Lab 5 · KNN and SVM','../Lab5/README.md'],
  lab6:['Lab 6 · Trees and Naive Bayes','../Lab6/README.md'],
  ma1:['Mandatory Assignment 1','../Mandatory_Assignments/MA1/Mandatory_assignment_1.pdf'],
  ma2:['Mandatory Assignment 2','../Mandatory_Assignments/MA2/README.md'],
};
export function source(ref) {
  const [key,locator]=ref.split(':');const [title,path]=sourceFiles[key]||[];if(!title||!locator)throw new Error(`Bad source: ${ref}`);
  const pdf=key==='book'||key==='ma1';
  return {title,path,locator:pdf?`PDF page ${locator}`:key==='notes'||key.startsWith('lab')||key==='ma2'?locator:`Slide ${locator}`,...(pdf?{page:Number(locator.split('–')[0])}:{}),...(key==='notes'?{anchor:locator,supplemental:true}:{})};
}
export function add(topic,ref,rows) {
  for(const row of rows.trim().split('\n').filter(r=>r.trim())) {
    const [prompt,choices,explanation]=row.split('|').map(s=>s.trim());
    if(!prompt||!choices||!explanation)throw new Error(`Malformed row ${row}`);
    const raw=choices.split('~').map(s=>s.trim());
    push(topic,prompt.replaceAll('\\n','\n'),raw.map(s=>s.replace(/^\*/,'')),raw.flatMap((s,i)=>s.startsWith('*')?[i]:[]),explanation,ref);
  }
}
export function push(topic,prompt,options,correct,explanation,ref,family) {
  const id=`${topic}-${String(questions.filter(q=>q.topic===topic).length+1).padStart(3,'0')}`;
  questions.push({id,topic,prompt,options,correct,explanation,sources:ref.split(';').map(source),...(family?{family}:{})});
}
