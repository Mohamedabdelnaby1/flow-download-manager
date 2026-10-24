const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fileName}=require('./engine.cjs');
const COLUMNS=['name','queueId','size','status','time','speed','updatedAt','description'];
const FONTS=['system','Segoe UI','Arial','Tahoma','Noto Sans'];
const DEFAULT={columns:COLUMNS,font:'system',retentionDays:0,slowEnabled:false,slowKB:32,slowSeconds:90,slowHoldSeconds:120};
const ACTIONS=new Set(['toolsPreferences','toolsSnapshot','duplicatePlan','duplicateClean','historyCleanup','relocateStart','relocateCancel','renameCompleted','zipExtract']);
function preferences(data={}){
 const out={...DEFAULT,...data};if(!Array.isArray(out.columns)||out.columns.some(k=>!COLUMNS.includes(k))||new Set(out.columns).size!==out.columns.length||!out.columns.includes('name')||!out.columns.includes('status'))throw Error('Keep the file name and status columns; choose valid columns.');
 if(!FONTS.includes(out.font))throw Error('Choose a supported font');
 for(const [key,min,max]of [['retentionDays',0,3650],['slowKB',1,1000000],['slowSeconds',30,3600],['slowHoldSeconds',30,3600]])if(!Number.isInteger(Number(out[key]))||Number(out[key])<min||Number(out[key])>max)throw Error('Invalid '+key);
 return {columns:out.columns,font:out.font,retentionDays:Number(out.retentionDays),slowEnabled:out.slowEnabled===true,slowKB:Number(out.slowKB),slowSeconds:Number(out.slowSeconds),slowHoldSeconds:Number(out.slowHoldSeconds)};
}
function canonical(value){const u=new URL(value);u.hash='';return u.href;}
class DownloadTools{
 constructor(service,{now=Date.now}={}){this.service=service;this.now=now;this.jobs=new Map();this.slow=new Map();this.closed=false;this.lastRetention=0;this.timer=setInterval(()=>this.tick().catch(e=>service.store.log('tools',e.message)),5000);this.timer.unref();}
 config(){try{return preferences(this.service.store.get('downloadTools',{}));}catch{return {...DEFAULT};}}
 snapshot(){return {preferences:this.config(),jobs:[...this.jobs.values()].map(({controller,promise,...job})=>({...job})),platform:process.platform};}
 duplicatePlan(){const groups=new Map();for(const d of this.service.store.list()){
  if(d.status==='pending'||this.service.engine.active.has(d.id)||this.service.engine.maintenance.has(d.id))continue;
  const key=canonical(d.url);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);
 }return [...groups.values()].filter(g=>g.length>1).map(g=>{g.sort((a,b)=>Number(b.status==='complete')-Number(a.status==='complete')||b.downloaded-a.downloaded||a.createdAt.localeCompare(b.createdAt));return {keep:{id:g[0].id,name:g[0].name},remove:g.slice(1).map(d=>({id:d.id,name:d.name,bytes:d.downloaded})),urlHost:new URL(g[0].url).hostname};});}
 async cleanup(days){const cutoff=this.now()-days*86400000,s=this.service.store;let count=0;
  for(const d of s.list())if(d.status==='complete'&&!this.service.engine.maintenance.has(d.id)&&Number.isFinite(Date.parse(d.updatedAt))&&Date.parse(d.updatedAt)<cutoff){await this.service.library.trash(d.id);count++;}return {count};
 }
 async tick(){if(this.closed||this.busy)return;this.busy=true;try{const p=this.config(),{engine,store}=this.service,now=this.now();
  if(p.retentionDays&&now-this.lastRetention>=3600000){this.lastRetention=now;await this.cleanup(p.retentionDays);}
  if(!p.slowEnabled){this.slow.clear();return;}
  for(const id of this.slow.keys())if(!engine.active.has(id))this.slow.delete(id);
  for(const d of store.list().filter(d=>d.status==='downloading'&&d.resumable&&engine.active.has(d.id))){
   const q=store.queues().find(q=>q.id===d.queueId);if(!q?.running||!store.list().some(x=>x.id!==d.id&&x.queueId===d.queueId&&x.status==='queued'&&(!JSON.parse(x.meta).yieldUntil||JSON.parse(x.meta).yieldUntil<=now))){this.slow.delete(d.id);continue;}
   const rec=this.slow.get(d.id)||{since:now};this.slow.set(d.id,rec);
   if(d.speed>=p.slowKB*1024){rec.since=now;continue;}
   if(now-rec.since<p.slowSeconds*1000)continue;
   await engine.pause(d.id);const latest=store.find(d.id);if(!latest||this.closed)continue;
   store.update(d.id,{status:'queued',meta:JSON.stringify({...JSON.parse(latest.meta),yieldUntil:now+p.slowHoldSeconds*1000})});this.slow.delete(d.id);store.log('queue','Slow transfer yielded its slot; saved parts retained.',d.id);
  }
 }finally{this.busy=false;}}
 async renameCompleted(id,name){const {store,engine}=this.service,d=store.find(id);if(!d||d.status!=='complete'||engine.maintenance.has(id))throw Error('Choose an available completed download');const meta=JSON.parse(d.meta),old=meta.filePath;if(!old||!fs.existsSync(old)||fs.lstatSync(old).isSymbolicLink())throw Error('The completed file is missing');name=fileName(name);const dest=path.join(path.dirname(old),name);if(dest===old)return {id,name};engine.maintenance.add(id);
  try{await fs.promises.link(old,dest);try{store.update(id,{name,meta:JSON.stringify({...meta,filePath:dest,autoName:false})});}catch(e){await fs.promises.unlink(dest);throw e;}let sourceRetained=false;try{await fs.promises.unlink(old);}catch{sourceRetained=true;}return {id,name,sourceRetained};}finally{engine.maintenance.delete(id);}}
 relocate(id,directory){const {store,engine}=this.service,d=store.find(id);if(!d||d.status!=='complete'||engine.maintenance.has(id))throw Error('Choose an available completed download');if(!path.isAbsolute(directory))throw Error('Choose an absolute destination folder');const meta=JSON.parse(d.meta),source=meta.filePath,dest=path.join(directory,d.name);if(!source||path.resolve(dest)===path.resolve(source))throw Error('Choose a different destination');if(fs.existsSync(dest))throw Error('A file with this name already exists at the destination');
  const job={id:crypto.randomUUID(),downloadId:id,name:d.name,state:'copying',bytes:0,total:0,speed:0,error:'',controller:new AbortController()};this.jobs.set(job.id,job);engine.maintenance.add(id);
  job.promise=(async()=>{let own=false;try{await fs.promises.mkdir(directory,{recursive:true});const sourceType=await fs.promises.lstat(source);if(!sourceType.isFile()||sourceType.isSymbolicLink())throw Error('Choose a regular completed file');const before=await fs.promises.stat(source);job.total=before.size;const handle=await fs.promises.open(dest,'wx',0o600);own=true;const hash=crypto.createHash('sha256'),start=this.now();try{for await(const chunk of fs.createReadStream(source,{highWaterMark:1024*1024,signal:job.controller.signal})){job.controller.signal.throwIfAborted();hash.update(chunk);let offset=0;while(offset<chunk.length)offset+=(await handle.write(chunk,offset,chunk.length-offset)).bytesWritten;job.bytes+=chunk.length;job.speed=job.bytes/Math.max(.1,(this.now()-start)/1000);}await handle.sync();}finally{await handle.close();}
   job.controller.signal.throwIfAborted();const after=await fs.promises.stat(source);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||job.bytes!==before.size)throw Error('Source changed while moving; original retained');const digest=hash.digest('hex');if(meta.sha256&&digest!==meta.sha256)throw Error('Source fingerprint changed; original retained');
   const verify=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(dest,{signal:job.controller.signal}))verify.update(chunk);if(verify.digest('hex')!==digest)throw Error('Destination verification failed; original retained');
   const latest=store.find(id);if(!latest||latest.meta!==d.meta)throw Error('Task changed while moving; original retained');
   store.update(id,{directory,name:path.basename(dest),meta:JSON.stringify({...meta,filePath:dest,sha256:digest})});own=false;try{await fs.promises.unlink(source);}catch{job.sourceRetained=true;}job.state='complete';job.speed=0;
  }catch(e){job.state=job.controller.signal.aborted?'cancelled':'error';job.error=e.message;job.speed=0;if(own)await fs.promises.unlink(dest).catch(()=>{});}finally{engine.maintenance.delete(id);}})();
  // Keep a bounded recent operation history, never a live operation out of reach.
  for(const [key,value]of this.jobs)if(this.jobs.size>30&&!['copying'].includes(value.state))this.jobs.delete(key);return {id:job.id};
 }
 async action(type,data){switch(type){
  case'toolsSnapshot':return this.snapshot();
  case'toolsPreferences':{const value=preferences({...this.config(),...data});this.service.store.set('downloadTools',value);return value;}
  case'duplicatePlan':return this.duplicatePlan();
  case'duplicateClean':{if(!Array.isArray(data.ids)||!data.ids.length||data.ids.length>500)throw Error('Select up to 500 duplicate records');const valid=new Set(this.duplicatePlan().flatMap(g=>g.remove.map(d=>d.id)));if(data.ids.some(id=>!valid.has(id)))throw Error('Duplicate list changed; preview again');for(const id of data.ids)await this.service.library.trash(id);return {count:data.ids.length};}
  case'historyCleanup':{const days=Number(data.days);if(!Number.isInteger(days)||days<1||days>3650)throw Error('Choose 1–3650 days');return this.cleanup(days);}
  case'relocateStart':return this.relocate(data.id,String(data.directory||''));
  case'relocateCancel':{const job=this.jobs.get(data.id);if(!job)throw Error('Operation not found');if(job.state==='copying')job.controller.abort();return true;}
  case'renameCompleted':return this.renameCompleted(data.id,String(data.name||''));
  case'zipExtract':return require('./zip.cjs').extract(this.service,data);
 }}
 async close(){this.closed=true;clearInterval(this.timer);for(const job of this.jobs.values())if(job.state==='copying')job.controller.abort();await Promise.allSettled([...this.jobs.values()].map(j=>j.promise));while(this.busy)await new Promise(r=>setTimeout(r,10));}
}
module.exports={DownloadTools,preferences,COLUMNS,FONTS,ACTIONS};
