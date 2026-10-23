const path=require('node:path'),crypto=require('node:crypto'),net=require('./network.cjs'),{validateRule,applyRules,validateTraffic,effectiveTraffic}=require('./automation.cjs'),{Workshop}=require('./workshop.cjs');
function parseLinks(text){
 if(typeof text!=='string'||text.length>200000)throw Error('النص أكبر من الحد المسموح');
 const urls=new Set();const collect=line=>{for(const match of line.matchAll(/https?:\/\/[^\s<>"']+/g)){urls.add(net.validateURL(match[0],['http:','https:']).href);if(urls.size>200)throw Error('أدخل من 1 إلى 200 رابط HTTP/HTTPS');}};
 for(const raw of text.split(/\r?\n/)){const match=/\[(\d{1,6})-(\d{1,6})\]/.exec(raw);if(!match){collect(raw);continue;}if(raw.match(/\[\d+-\d+\]/g).length!==1)throw Error('استخدم نطاقًا رقميًا واحدًا في السطر');const a=+match[1],b=+match[2];if(b<a||b-a>199)throw Error('النطاق من 1 إلى 200 ملف');for(let n=a;n<=b;n++)collect(raw.replace(match[0],String(n).padStart(match[1].length,'0')));}
 if(!urls.size)throw Error('أدخل من 1 إلى 200 رابط HTTP/HTTPS');return [...urls];
}
class Power{
 constructor(service){this.service=service;this.links=new Map();this.closed=false;this.workshop=new Workshop(service);}
 snapshot(){return {rules:this.service.store.get('automationRules',[]),traffic:this.service.store.get('trafficPlan',{mode:'normal',kbps:512,slots:2,schedule:[]}),effective:effectiveTraffic(this.service.store),links:[...this.links.values()].map(({controllers,promise,...job})=>({...job,rows:job.rows.map(({...row})=>row)})).slice(-3),media:this.workshop.list()};}
 inspect(text){
  const urls=parseLinks(text),existing=new Set(this.service.store.list().map(d=>d.url)),id=crypto.randomUUID();if(this.closed)throw Error('البرنامج يغلق');for(const [key,job]of this.links)if(!['running'].includes(job.status))this.links.delete(key);if(this.links.size>=3)throw Error('انتظر انتهاء فحص الروابط الحالي');
  const job={id,status:'running',total:urls.length,checked:0,rows:[],controllers:new Set(),createdAt:Date.now()};this.links.set(id,job);let index=0;
  const run=async()=>{while(index<urls.length&&job.status==='running'&&!this.closed){const url=urls[index++],row={id:crypto.randomUUID(),url,name:'',size:0,status:'checking',duplicate:existing.has(url),resumable:false,error:''};job.rows.push(row);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);timer.unref();job.controllers.add(controller);
   try{const info=await net.probe(url,{headers:this.service.engine.authHeaders(url),settings:this.service.store.settings,signal:controller.signal});row.size=info.size;row.resumable=info.resumable;row.type=info.type;row.status=/text\/html/i.test(info.type)&&!require('./video.cjs').isVideoPage(url)?'page':'ready';const disposition=/filename\*\s*=\s*UTF-8''([^;]+)|filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(info.disposition||'');try{row.name=decodeURIComponent(disposition?.[1]||disposition?.[2]||disposition?.[3]||new URL(url).pathname.split('/').pop())||new URL(url).hostname;}catch{row.name='download';}row.name=require('./engine.cjs').fileName(row.name);}
   catch(e){row.status='error';row.error=e.name==='AbortError'?'انتهت مهلة الفحص':e.message;}
   finally{clearTimeout(timer);job.controllers.delete(controller);job.checked++;}
  }};job.promise=Promise.all(Array.from({length:Math.min(4,urls.length)},run)).then(()=>{if(job.status==='running')job.status='complete';});return {id};
 }
 cancel(id){const job=this.links.get(id);if(!job)return false;job.status='cancelled';for(const c of job.controllers)c.abort();return true;}
 async action(type,data={}){
  const s=this.service.store;
  switch(type){
   case'rulesImport':{if(data.format!=='FlowRules'||!Array.isArray(data.rules)||data.rules.length>100)throw Error('ملف قواعد غير صالح');const incoming=data.rules.map(r=>validateRule(r,s));if(new Set(incoming.map(r=>r.id)).size!==incoming.length)throw Error('معرفات قواعد مكررة');const map=new Map(s.get('automationRules',[]).map(r=>[r.id,r]));for(const rule of incoming)map.set(rule.id,rule);if(map.size>100)throw Error('الحد الأقصى 100 قاعدة');s.set('automationRules',[...map.values()]);return incoming.length;}
   case'ruleSave':{const rule=validateRule(data,s),rules=s.get('automationRules',[]),i=rules.findIndex(r=>r.id===rule.id);if(i<0){if(rules.length>=100)throw Error('الحد الأقصى 100 قاعدة');rules.push(rule);}else rules[i]=rule;s.set('automationRules',rules);return rule;}
   case'ruleDelete':s.set('automationRules',s.get('automationRules',[]).filter(r=>r.id!==data.id));return true;
   case'ruleMove':{const rules=s.get('automationRules',[]),i=rules.findIndex(r=>r.id===data.id),next=i+(data.direction==='up'?-1:1);if(i>=0&&next>=0&&next<rules.length)[rules[i],rules[next]]=[rules[next],rules[i]];s.set('automationRules',rules);return true;}
   case'rulePreview':net.validateURL(data.url);return applyRules({url:data.url,name:data.name},s);
   case'trafficSave':{const plan=validateTraffic(data);s.set('trafficPlan',plan);this.service.engine.globalNext=Date.now();return effectiveTraffic(s);}
   case'linksInspect':return this.inspect(data.text);
   case'linksCancel':return this.cancel(data.id);
   case'linksCommit':{const job=this.links.get(data.id);if(!job||job.status!=='complete'||Date.now()-job.createdAt>900000)throw Error('أعد فحص الروابط قبل إضافتها');if(!Array.isArray(data.ids)||!data.ids.length||data.ids.length>200)throw Error('حدد روابط جاهزة');const wanted=[...new Set(data.ids)],rows=wanted.map(id=>job.rows.find(r=>r.id===id));if(rows.some(r=>!r||r.status!=='ready'||r.added))throw Error('بعض الروابط غير جاهزة أو تمت إضافتها');if(data.queueId&&!s.queues().some(q=>q.id===data.queueId))throw Error('قائمة غير موجودة');const items=rows.map(r=>this.service.engine.add({url:r.url,name:require('./video.cjs').isVideoPage(r.url)?undefined:r.name,later:true,queueId:data.queueId,priority:Math.max(-2,Math.min(2,Number(data.priority)||0))}));for(let i=0;i<rows.length;i++)rows[i].added=items[i].id;return {count:items.length};}
   case'priority':{if(!Array.isArray(data.ids)||data.ids.some(id=>typeof id!=='string'))throw Error('حدد ملفات صالحة');const ids=[...new Set(data.ids||[])];if(ids.length>500||!ids.length)throw Error('حدد ملفات');for(const id of ids)if(this.service.engine.maintenance.has(id))throw Error('انتظر انتهاء فحص الرابط');const priority=Math.max(-2,Math.min(2,Math.trunc(Number(data.priority)||0)));for(const id of ids){const d=s.find(id);if(d)s.update(id,{meta:JSON.stringify({...JSON.parse(d.meta),priority})});}return true;}
   case'collectionInfo':return this.service.engine.video.collection(data.url,Math.min(200,Math.max(1,Number(data.limit)||100)));
   case'collectionAdd':{if(!Array.isArray(data.items)||!data.items.length||data.items.length>100)throw Error('حدد من 1 إلى 100 فيديو');if(data.queueId&&!s.queues().some(q=>q.id===data.queueId))throw Error('قائمة غير موجودة');const items=data.items.map((item,index)=>{const u=net.validateURL(item.url,['https:']);if(!/^(www\.)?youtube\.com$/.test(u.hostname)||u.pathname!=='/watch'||!u.searchParams.get('v')?.match(/^[a-z0-9_-]{11}$/i))throw Error('رابط فيديو غير صالح');return {url:u.href,name:(data.numbered?String(index+1).padStart(3,'0')+' - ':'')+require('./engine.cjs').fileName(item.title||'Video')+(data.quality==='audio'?'.mp3':'.mp4'),mode:'site',quality:['audio','max480','max720','max1080'].includes(data.quality)?data.quality:'best',directory:data.makeFolder?path.join(s.settings.categoryFolders?.[data.quality==='audio'?'music':'video']||s.settings.downloadDir,require('./engine.cjs').fileName(data.title||'Playlist')):undefined,queueId:data.queueId,later:true};});return {count:items.map(i=>this.service.engine.add(i)).length};}
   case'mediaStart':return this.workshop.start(data);
   case'mediaCancel':return this.workshop.cancel(data.id);
   case'mediaOpen':case'mediaFolder':{const job=this.workshop.jobs.find(j=>j.id===data.id);if(!job||job.status!=='complete')throw Error('المعالجة لم تكتمل');if(!this.service.desktop)throw Error('افتح نسخة الديسكتوب');return this.service.desktop[type==='mediaOpen'?'open':'folder'](job.output);}
  }
 }
 async close(){this.closed=true;for(const job of this.links.values())this.cancel(job.id);await Promise.allSettled([...this.links.values()].map(j=>j.promise));await this.workshop.close();}
}
const ACTIONS=new Set(['rulesImport','ruleSave','ruleDelete','ruleMove','rulePreview','trafficSave','linksInspect','linksCancel','linksCommit','priority','collectionInfo','collectionAdd','mediaStart','mediaCancel','mediaOpen','mediaFolder']);
module.exports={Power,ACTIONS,parseLinks};
