import * as cheerio from 'cheerio'; import fs from 'fs'; import path from 'path'; import pLimit from 'p-limit';
const ORIGIN='https://www.fixwebsiteissues.com';
const seeds=new Set([ORIGIN+'/', ...fs.readFileSync('rest_urls.txt','utf8').split('\n'), ...fs.readFileSync('sm_urls.txt','utf8').split('\n'), ...fs.readFileSync('tag_urls.txt','utf8').split('\n'), ...fs.readFileSync('extra.txt','utf8').split('\n')].filter(Boolean));
const done=new Map(); const found=new Set(); const limit=pLimit(5);
const fileFor=u=>{let p=decodeURIComponent(new URL(u).pathname); return path.join('html',p,'index.html');};
async function get(u,tries=3){for(let i=0;i<tries;i++){try{const r=await fetch(u,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 (site-migration-crawler)'}});return r;}catch(e){await new Promise(r=>setTimeout(r,2000*(i+1)));}}throw new Error('fail '+u);}
async function crawl(u){ if(done.has(u))return; done.set(u,'pending');
 const r=await get(u); const st=r.status;
 if(st>=300&&st<400){done.set(u,{status:st,location:r.headers.get('location')});return;}
 const html=await r.text(); done.set(u,{status:st});
 if(st!==200)return;
 const f=fileFor(u); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,html);
 const $=cheerio.load(html);
 $('a[href]').each((i,a)=>{let h=$(a).attr('href'); try{const x=new URL(h,u); if(x.origin===ORIGIN){x.hash='';x.search=''; found.add(x.href);} }catch{}});
 // follow pagination
 const next=[]; $('link[rel=next], a[href*="/page/"], a.page-numbers, .elementor-pagination a, a.next').each((i,a)=>{const h=$(a).attr('href'); if(h) next.push(new URL(h,u).href.split('#')[0]);});
 for(const n of next.filter(n=>/\/page\/\d+\/?$/.test(n))) if(!done.has(n)) queue.push(limit(()=>crawl(n)));
}
const queue=[...seeds].map(s=>limit(()=>crawl(s))); for(let i=0;i<queue.length;i++) await queue[i];
const res=Object.fromEntries(done); fs.writeFileSync('crawl.json',JSON.stringify(res,null,1));
const missing=[...found].filter(x=>!done.has(x)&&!/\/wp-(content|admin|json|includes)|\.(xml|php|pdf|jpg|png|webp|txt)$/.test(x));
fs.writeFileSync('missing.txt',missing.join('\n'));
console.log('crawled',done.size,'ok',Object.values(res).filter(v=>v.status===200).length,'missing-links',missing.length);
