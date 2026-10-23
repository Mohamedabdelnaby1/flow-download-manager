const cheerio=require('cheerio');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {buffer,validateURL}=require('./network.cjs');
const {fileName}=require('./engine.cjs');
class Grabber{
  constructor(store,engine){this.store=store;this.engine=engine;this.cancelled=new Set();this.running=new Set();this.controllers=new Map();}
  async scan(input){
    const base=validateURL(input.url,['http:','https:']);const id=input.id||crypto.randomUUID();
    if(this.running.has(id))throw Error('الفحص جارٍ بالفعل');
    const depth=Math.max(0,Math.min(4,Number(input.depth)||0)),max=Math.max(1,Math.min(200,Number(input.maxPages)||30));
    const pending=[{url:base.href,level:0}],visited=new Set(),resources=new Map();let pagesRead=0,lastError='';
    const extensions=String(input.extensions||'').toLowerCase().split(/[ ,]+/).map(x=>x.replace(/^\./,'')).filter(Boolean);
    const project={id,name:input.name||base.hostname,url:base.href,createdAt:new Date().toISOString(),data:''};
    this.cancelled.delete(id);this.running.add(id);
    const save=(status,error='')=>{project.data=JSON.stringify({status,visited:visited.size,links:[...resources.values()],input,error});this.store.project(project);};save('scanning');
    try{
      while(pending.length&&visited.size<max&&!this.cancelled.has(id)){
        const {url,level}=pending.shift();if(visited.has(url))continue;visited.add(url);
        try{
          const ac=new AbortController();this.controllers.set(id,ac);
          const result=await buffer(url,{settings:this.store.settings,headers:this.engine.authHeaders(url),signal:ac.signal},5*1024*1024);
          if(!String(result.headers['content-type']).includes('text/html')){resources.set(url,{url,name:fileName(new URL(url).pathname.split('/').pop()),kind:'file'});continue;}
          pagesRead++;const $=cheerio.load(result.body);
          if(input.includeHTML)resources.set(url,{url,name:fileName(new URL(url).pathname.split('/').pop()||'index.html'),kind:'html'});
          const discovered=[];$('a[href],img[src],script[src],link[href],source[src],video[src],audio[src]').each((_,el)=>{
            const raw=$(el).attr('href')||$(el).attr('src');if(raw)discovered.push(raw);
          });
          for(const raw of discovered){
            let u;try{u=new URL(raw,result.url);u.hash='';validateURL(u.href,['http:','https:']);}catch{continue;}
            if(!input.external&&u.origin!==base.origin)continue;
            if(input.noParent&&u.origin===base.origin&&!u.pathname.startsWith(base.pathname.replace(/[^/]*$/,'')))continue;
            const ext=u.pathname.split('/').pop().split('.').slice(1).pop()?.toLowerCase();
            const html=!ext||['html','htm','php','asp','aspx'].includes(ext);
            if(html&&level<depth&&!visited.has(u.href))pending.push({url:u.href,level:level+1});
            if(!html&&(!extensions.length||extensions.includes(ext))){let name=u.pathname.split('/').pop();try{name=decodeURIComponent(name);}catch{}resources.set(u.href,{url:u.href,name:fileName(name),kind:'file'});}
          }save('scanning');
        }catch(e){lastError=e.message;this.store.log('grabber',`${new URL(url).hostname}: ${e.message}`);}
      }
      save(this.cancelled.has(id)?'cancelled':!pagesRead&&!resources.size&&lastError?'error':'ready',lastError);
    }catch(e){save('error',e.message);}finally{this.running.delete(id);this.controllers.delete(id);}
    return this.store.projects().find(p=>p.id===id);
  }
  cancel(id){this.cancelled.add(id);this.controllers.get(id)?.abort();}
  download(id,urls){
    const p=this.store.projects().find(p=>p.id===id);if(!p)throw Error('المشروع غير موجود');const data=JSON.parse(p.data);
    if(!Array.isArray(urls)||!urls.length||urls.length>500)throw Error('حدد من 1 إلى 500 رابط');
    const selected=data.links.filter(l=>urls.includes(l.url));if(!selected.length)throw Error('الروابط المحددة غير موجودة في المشروع');const root=path.join(this.store.settings.downloadDir,'Sites',fileName(p.name)+'-'+id.slice(0,6));
    const mapping={};
    for(const link of selected){
      const u=new URL(link.url);const parts=u.pathname.split('/').filter(Boolean).map(fileName);let name=parts.pop()||'index.html';
      if(link.kind==='html'&&!/\.html?$/i.test(name))name+='.html';
      if(u.search)name=path.basename(name,path.extname(name))+'-'+crypto.createHash('sha1').update(u.search).digest('hex').slice(0,8)+path.extname(name);
      const directory=path.join(root,fileName(u.hostname),...parts);const d=this.engine.add({url:link.url,name,directory,later:true,description:`Site: ${p.name}`});mapping[link.url]={id:d.id,path:path.join(directory,name),kind:link.kind};
    }
    data.mapping=mapping;data.root=root;data.status='downloading';this.store.project({...p,data:JSON.stringify(data)});
    this.store.putQueue({...this.store.queues().find(q=>q.id==='main'),running:true});return selected.length;
  }
  finalize(){for(const p of this.store.projects()){
    const data=JSON.parse(p.data);if(data.status!=='downloading')continue;
    const entries=Object.entries(data.mapping);if(!entries.length)continue;
    const states=entries.map(([,v])=>this.store.find(v.id));
    if(states.some(d=>d&&!['complete','error'].includes(d.status)))continue;
    if(states.some(d=>!d||d.status==='error')){data.status='partial';this.store.project({...p,data:JSON.stringify(data)});continue;}
    for(const [url,v] of entries){if(v.kind!=='html')continue;
      const d=this.store.find(v.id),file=JSON.parse(d.meta).filePath;const $=cheerio.load(fs.readFileSync(file,'utf8'));
      $('base').remove();$('[href],[src]').each((_,el)=>{for(const attr of ['href','src']){const raw=$(el).attr(attr);if(!raw||raw.startsWith('#'))continue;
        try{const absolute=new URL(raw,url);if(!['http:','https:'].includes(absolute.protocol))continue;const fragment=absolute.hash;absolute.hash='';const dest=data.mapping[absolute.href];
          $(el).attr(attr,dest?path.relative(path.dirname(file),JSON.parse(this.store.find(dest.id).meta).filePath).split(path.sep).join('/')+fragment:absolute.href+fragment);
        }catch{}}
      });fs.writeFileSync(file,$.html());
      const bytes=fs.readFileSync(file);this.store.update(d.id,{size:bytes.length,downloaded:bytes.length,meta:JSON.stringify({...JSON.parse(d.meta),sha256:crypto.createHash('sha256').update(bytes).digest('hex')})});
    }data.status='complete';this.store.project({...p,data:JSON.stringify(data)});this.store.log('grabber',`حُفظ الموقع: ${p.name}`);
  }}
}
module.exports={Grabber};
