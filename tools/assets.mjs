import fs from 'fs'; import path from 'path'; import pLimit from 'p-limit';
const O='https://www.fixwebsiteissues.com'; const OUT='public';
const re=/(?:https?:\/\/www\.fixwebsiteissues\.com)?(\/wp-(?:content|includes)\/[^"'\s)>,\\]+)/g;
const want=new Set();
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f); if(fs.statSync(p).isDirectory())walk(p); else {const h=fs.readFileSync(p,'utf8'); for(const m of h.matchAll(re)) want.add(m[1].replace(/&amp;/g,'&'));}}}
walk('html');
for(const m of JSON.parse(fs.readFileSync('media.json','utf8'))) want.add(new URL(m.source_url).pathname);
const lim=pLimit(8); const done=new Set(); const failed=[];
const skip=p=>/\.(js|php)(\?|$)/.test(p)||/\/wp-json\//.test(p);
const local=p=>{const u=new URL(p,O); return path.join(OUT, decodeURIComponent(u.pathname));};
async function dl(p){ const key=p.split('#')[0]; if(done.has(key)||skip(key))return; done.add(key);
  const file=local(key); 
  if(!fs.existsSync(file)){ let r; try{r=await fetch(O+key,{headers:{'user-agent':'Mozilla/5.0 (site-migration-crawler)'}});}catch(e){failed.push([key,'neterr']);return;}
    if(!r.ok){failed.push([key,r.status]);return;}
    fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,Buffer.from(await r.arrayBuffer())); }
  if(/\.css(\?|$)/.test(key)){ const css=fs.readFileSync(file,'utf8'); const subs=[];
    for(const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)){ const u=m[1]; if(u.startsWith('data:'))continue; try{const x=new URL(u,O+key); if(x.origin===O) subs.push(x.pathname);}catch{} }
    for(const s of subs) await dl(s); }
}
const list=[...want]; console.log('initial',list.length);
// note: CSS sub-downloads go through same limiter; avoid deadlock by not awaiting inside limiter
async function dl2(p){return dl(p)}
await Promise.all(list.map(p=>lim(()=>dl2(p))));
fs.writeFileSync('assets_failed.json',JSON.stringify(failed,null,1)); console.log('done',done.size,'failed',failed.length);
