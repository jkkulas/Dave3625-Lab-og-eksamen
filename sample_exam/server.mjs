import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAttempt} from './core.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(here);
const results=path.join(here,'results');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.pdf':'application/pdf','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.ipynb':'application/json; charset=utf-8'};
function json(res,status,data) { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
export const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')) {
      if(req.method==='GET'&&url.pathname==='/api/health') return json(res,200,{service:'dave3625-exam',fileSaving:true});
      if(req.method==='GET'&&url.pathname==='/api/results') {
        await fs.mkdir(results,{recursive:true}); const attempts=[];
        for(const name of await fs.readdir(results)) if(/^[-a-z0-9]+\.json$/i.test(name)) {
          try {attempts.push(validateAttempt(JSON.parse(await fs.readFile(path.join(results,name),'utf8'))));} catch { /* A malformed file must not hide valid history. */ }
        }
        return json(res,200,attempts);
      }
      if(req.method==='POST'&&url.pathname==='/api/results') {
        // Reject cross-site writes to a loopback server.
        const origin=req.headers.origin;
        if(origin&&origin!==`http://${req.headers.host}`) return json(res,403,{error:'Origin is not allowed.'});
        if(!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'Expected JSON.'});
        let bytes=0; const chunks=[];
        for await(const chunk of req) {bytes+=chunk.length; if(bytes>2_000_000) return json(res,413,{error:'Exam file too large.'}); chunks.push(chunk);}
        let attempt;
        try {attempt=validateAttempt(JSON.parse(Buffer.concat(chunks).toString('utf8')));} catch(e) {return json(res,400,{error:e.message});}
        await fs.mkdir(results,{recursive:true});
        const file=path.join(results,`${attempt.id}.json`);
        try {await fs.writeFile(file,JSON.stringify(attempt,null,2),{encoding:'utf8',flag:'wx'});}
        catch(e) {if(e.code!=='EEXIST')throw e; const previous=JSON.parse(await fs.readFile(file,'utf8')); if(JSON.stringify(previous)!==JSON.stringify(attempt))return json(res,409,{error:'This attempt ID already belongs to a different result.'});}
        return json(res,200,{saved:true,file:`sample_exam/results/${attempt.id}.json`});
      }
      return json(res,404,{error:'Unknown endpoint.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
    const pathname=decodeURIComponent(['/', '/sample_exam/'].includes(url.pathname)?'/sample_exam/index.html':url.pathname);
    const segments=pathname.split(/[\\/]/).filter(Boolean);
    if(segments.some(s=>s.startsWith('.')||s==='results'||s==='node_modules')||!['sample_exam','Powerpoints','Lab0','Lab1','Lab2','Lab3','Lab4','Lab5','Lab6','Mandatory_Assignments'].includes(segments[0])) return json(res,403,{error:'Path is not served.'});
    const file=path.resolve(root,...segments);
    if(!file.startsWith(root+path.sep))return json(res,403,{error:'Invalid path.'});
    const real=await fs.realpath(file); if(!real.startsWith(root+path.sep))return json(res,403,{error:'Invalid path.'});
    const ext=path.extname(file); if(!types[ext])return json(res,403,{error:'File type is not served.'});
    const data=await fs.readFile(real);
    res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  } catch(e) {if(!res.headersSent)json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'File not found.':'Could not read or save the file.'});else res.end();}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) server.listen(port,'127.0.0.1',()=>console.log(`Exam studio: http://127.0.0.1:${port}/sample_exam/\nOpen http://127.0.0.1:${port}/sample_exam/index.html\nCompleted exams: ${results}`));
