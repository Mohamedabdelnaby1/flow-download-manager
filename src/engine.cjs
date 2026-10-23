const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const { Client } = require('basic-ftp');
const { request, probe, validateURL } = require('./network.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const ACTIVE=['probing','downloading','processing'];
function fileName(value) {
  const s=String(value||'download').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,180);
  return !s||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)?`file_${s||'download'}`:s;
}
function category(name) {
  const ext=name.split('.').pop().toLowerCase();
  return /^(zip|rar|7z|tar|gz|bz2|xz)$/.test(ext)?'compressed':/^(pdf|docx?|xlsx?|pptx?|txt|csv|epub)$/.test(ext)?'documents':/^(mp3|wav|ogg|flac|aac|m4a)$/.test(ext)?'music':/^(mp4|mkv|mov|avi|webm|ts|m3u8|mpd)$/.test(ext)?'video':/^(exe|msi|iso|dmg|apk|deb|appimage)$/.test(ext)?'programs':'other';
}
class Engine extends EventEmitter {
  constructor(store, options={}) {
    super();this.store=store;this.active=new Map();this.maintenance=new Set();this.globalNext=0;this.queueNext=new Map();this.closing=false;this.completedQueues=new Set();this.onComplete=options.onComplete;this.video=new (require('./video.cjs').VideoResolver)(store);
    this.usage=store.get('usage',{start:Date.now(),bytes:0,total:0});
    this.tick=setInterval(()=>this.pump().catch(e=>this.store.log('error',e.message)),500);this.tick.unref();
  }
  settings(){return {...this.store.settings,...require('./automation.cjs').effectiveTraffic(this.store)};}
  authHeaders(url,meta={}) {
    const headers={'user-agent':this.settings().userAgent,...meta.headers};
    const login=this.store.auth(new URL(url).hostname);
    if(login&&!headers.authorization)headers.authorization='Basic '+Buffer.from(login.username+':'+login.password).toString('base64');
    return headers;
  }
  add(data) {
    data=require('./automation.cjs').applyRules(data,this.store);
    const u=validateURL(data.url);let name=data.name;
    if(!name){try{name=decodeURIComponent(u.pathname.split('/').pop())||u.hostname;}catch{name=u.hostname;}}
    const mode=require('./video.cjs').isVideoPage(u.href)||data.mode==='site'?'site':data.mode==='media'||/\.(m3u8|mpd)(\?|$)/i.test(u.href)?'media':'file';
    name=fileName(name);if(mode==='site'&&!/\.(mp4|mkv|mp3)$/i.test(name))name+='.mp4';if(mode==='media')name=name.replace(/\.(m3u8|mpd|ts)$/i,'')+(/\.(mp4|mkv)$/i.test(name)?'':'.'+(data.format==='mkv'?'mkv':'mp4'));
    const cat=data.category||(['media','site'].includes(mode)?(data.quality==='audio'?'music':'video'):category(name));
    const item=this.store.add({url:u.href,name,category:cat,queueId:data.queueId||'main',
      directory:data.directory||this.settings().categoryFolders?.[cat]||this.settings().downloadDir,
      description:String(data.description||''),meta:JSON.stringify({headers:data.headers||{},autoName:!data.name,autoCategory:!data.category,autoDirectory:!data.directory,speedLimit:Number(data.speedLimit)||0,priority:Number(data.priority)||0,ruleId:data.ruleId||'',ruleName:data.ruleName||'',mode,quality:data.quality||'best',audioURL:data.audioURL||'',format:data.format||'mp4',sourcePage:data.sourcePage||''})});
    this.store.log('added',name,item.id); if(!data.later) this.start(item.id).catch(()=>{});return item;
  }
  async start(id) {
    if(this.active.has(id)||this.maintenance.has(id))return;
    const item=this.store.find(id);if(!item||item.status==='complete')return;
    if(this.quotaReached()){this.store.update(id,{status:'limited',error:'تم بلوغ حصة التحميل؛ الاستئناف تلقائي في الدورة التالية'});return;}
    if(this.active.size>=this.settings().simultaneous){this.store.update(id,{status:'queued'});this.store.putQueue({...this.store.queues().find(q=>q.id===item.queueId),running:true});return;}
    const ctx={id,item,controllers:new Set(),stopped:false,segments:item.segments.map(s=>({...s})),speed:0,received:0,lastBytes:0,lastTime:Date.now(),checkpoint:Date.now(),fileNext:0,fd:null};
    this.active.set(id,ctx);this.store.update(id,{status:'probing',error:'',speed:0});
    ctx.promise=this.run(ctx).catch(e=>{
      if(!ctx.stopped){this.checkpoint(ctx);this.store.update(id,{status:'error',speed:0,error:e.message});this.store.log('error',e.message,id);this.emit('failure',this.store.find(id));}
    }).finally(()=>{if(ctx.fd!==null){try{fs.fsyncSync(ctx.fd);fs.closeSync(ctx.fd);}catch{}ctx.fd=null;}this.active.delete(id);if(!this.active.size)this.globalNext=0;this.emit('change');});
    this.emit('started',this.store.find(id));return ctx.promise;
  }
  async run(ctx) {
    const item=ctx.item, meta=JSON.parse(item.meta);
    fs.mkdirSync(this.settings().tempDir,{recursive:true});fs.mkdirSync(item.directory,{recursive:true});
    ctx.temp=path.join(this.settings().tempDir,item.id+'.part');
    if(meta.mode==='site')return this.video.download(ctx,this,meta);
    if(meta.mode==='media'||/\.(m3u8|mpd)(\?|$)/i.test(item.url)) return this.media(ctx,meta);
    if(/^ftps?:/i.test(item.url))return this.ftp(ctx,meta);
    const controller=new AbortController();ctx.controllers.add(controller);
    const headers=this.authHeaders(item.url,meta);
    const info=await probe(item.url,{headers,settings:this.settings(),signal:controller.signal});ctx.controllers.delete(controller);
    if(ctx.stopped)return;
    if(meta.autoName&&info.disposition&&!item.downloaded){
      const utf8=/filename\*\s*=\s*UTF-8''([^;]+)/i.exec(info.disposition),plain=/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(info.disposition);
      let name=utf8?utf8[1]:plain?.[1]||plain?.[2];if(name){try{name=decodeURIComponent(name);}catch{}item.name=fileName(name.trim());if(meta.autoCategory)item.category=category(item.name);if(meta.autoDirectory){item.directory=this.settings().categoryFolders?.[item.category]||this.settings().downloadDir;fs.mkdirSync(item.directory,{recursive:true});}this.store.update(item.id,{name:item.name,category:item.category,directory:item.directory});}
    }
    if(/text\/html/i.test(info.type)&&!/[.]html?$/i.test(item.name))throw Error('الخادم أعاد صفحة ويب بدل الملف. قد يلزم تسجيل الدخول أو اختيار وضع فيديو الموقع. لحفظ صفحة ويب اختر اسمًا ينتهي بـ .html أو استخدم ساحب المواقع.');
    if(item.downloaded>0 && fs.existsSync(ctx.temp)){
      if((item.size&&info.size!==item.size)||(item.etag&&info.etag&&item.etag!==info.etag)||(!this.settings().ignoreModified&&item.modified&&info.modified&&item.modified!==info.modified))throw Error('تغير الملف على الخادم. أعد التحميل للحفاظ على سلامة البيانات.');
    }else{ctx.segments=[];}
    if(!info.resumable){ctx.segments=[];fs.writeFileSync(ctx.temp,Buffer.alloc(0));}
    ctx.size=info.size;ctx.resumable=info.resumable;ctx.etag=info.etag;ctx.modified=info.modified;
    ctx.fd=fs.openSync(ctx.temp,fs.existsSync(ctx.temp)?'r+':'w+');
    if(info.size)fs.ftruncateSync(ctx.fd,info.size);
    if(!ctx.segments.length)ctx.segments=[{id:1,start:0,current:0,end:info.size||Number.MAX_SAFE_INTEGER,state:'waiting'}];
    for(const s of ctx.segments)s.state=s.current>=s.end?'complete':'waiting';
    this.store.update(item.id,{...{size:info.size,resumable:info.resumable,etag:info.etag,modified:info.modified},status:'downloading',segments:ctx.segments});
    const limit=info.resumable?Math.min(32,this.settings().serverConnections?.[new URL(item.url).hostname]||this.settings().connections):1;
    let fatal;
    const workers=new Set();
    const launch=s=>{
      s.state='active';
      const p=this.worker(ctx,s,headers).catch(e=>{if(!ctx.stopped){fatal=e;ctx.stopped=true;for(const c of ctx.controllers)c.abort();}}).finally(()=>workers.delete(p));workers.add(p);
    };
    while(!ctx.stopped){
      while(workers.size<limit){
        let s=ctx.segments.find(s=>s.state==='waiting'&&s.current<s.end);
        if(!s&&info.resumable){
          const biggest=[...ctx.segments].filter(s=>s.state==='active').sort((a,b)=>(b.end-b.current)-(a.end-a.current))[0];
          if(biggest&&biggest.end-biggest.current>1024*1024){
            const middle=biggest.current+Math.floor((biggest.end-biggest.current)/2);
            s={id:Math.max(...ctx.segments.map(s=>s.id))+1,start:middle,current:middle,end:biggest.end,state:'waiting'};biggest.end=middle;ctx.segments.push(s);
          }
        }
        if(!s)break;launch(s);
      }
      if(!workers.size)break;
      await Promise.race([...workers,delay(100)]);
      this.measure(ctx);
    }
    await Promise.allSettled([...workers]);
    if(fatal){ctx.stopped=false;throw fatal;}
    this.checkpoint(ctx);
    if(ctx.stopped)return;
    if(ctx.segments.some(s=>s.current<s.end))throw Error('لم تصل جميع أجزاء الملف');
    if(!ctx.size){ctx.size=ctx.segments.reduce((n,s)=>n+s.current-s.start,0);fs.ftruncateSync(ctx.fd,ctx.size);}
    fs.fsyncSync(ctx.fd);fs.closeSync(ctx.fd);ctx.fd=null;
    await this.finish(ctx);
  }
  async worker(ctx,s,baseHeaders){
    let attempts=0;
    while(s.current<s.end&&!ctx.stopped){
      const ac=new AbortController();ctx.controllers.add(ac);let response;
      try{
        const headers={...baseHeaders};if(ctx.resumable){headers.range=`bytes=${s.current}-${s.end-1}`;if(ctx.etag&&!ctx.etag.startsWith('W/'))headers['if-range']=ctx.etag;else if(ctx.modified)headers['if-range']=ctx.modified;}
        response=await request(ctx.item.url,{headers,signal:ac.signal,settings:this.settings()});
        if(ctx.resumable){
          const cr=/bytes (\d+)-(\d+)\/(\d+)/.exec(response.headers['content-range']||'');
          if(response.statusCode!==206||!cr||Number(cr[1])!==s.current||Number(cr[3])!==ctx.size)throw Error('الخادم لم يؤكد نطاق الاستئناف؛ تم إيقاف التحميل لمنع تلف الملف');
          if(response.headers['content-encoding']&&response.headers['content-encoding']!=='identity')throw Error('لا يمكن تقسيم استجابة مضغوطة');
        }else if(response.statusCode!==200)throw Error(`HTTP ${response.statusCode}`);
        if(ctx.etag&&response.headers.etag&&ctx.etag!==response.headers.etag||!this.settings().ignoreModified&&ctx.modified&&response.headers['last-modified']&&ctx.modified!==response.headers['last-modified'])throw Error('تغير الملف أثناء التحميل؛ تم إيقافه لمنع دمج نسخ مختلفة');
        if(!ctx.resumable&&ctx.size&&response.headers['content-length']!==undefined&&Number(response.headers['content-length'])!==ctx.size)throw Error('تغير حجم الملف بين الفحص وبدء التحميل');
        for await(const chunk of response){
          if(ctx.stopped)break;
          const n=Math.min(chunk.length,s.end-s.current);if(n<=0)break;
          await this.throttle(ctx,n);
          if(ctx.stopped)break;
          // End offsets may have changed while this worker waited for the limiter.
          const count=Math.min(n,s.end-s.current);if(count<=0)break;
          fs.writeSync(ctx.fd,chunk,0,count,s.current);s.current+=count;ctx.received+=count;this.usage.bytes+=count;this.usage.total+=count;
          if(Date.now()-ctx.checkpoint>1000)this.checkpoint(ctx);
          if(this.quotaReached()){this.pause(ctx.id,'limited');break;}
          if(s.current>=s.end)break;
        }
        if(!ctx.resumable&&!ctx.stopped){if(ctx.size&&s.current!==ctx.size)throw Error('حجم البيانات المستلمة لا يطابق الملف');s.end=s.current;ctx.size=s.current;}
        if(s.current>=s.end){s.state='complete';return;}
        if(!ctx.stopped)throw Error('انقطع الاتصال قبل اكتمال الجزء');
      }catch(e){
        if(ctx.stopped)return;
        if(!ctx.resumable&&s.current>0){s.current=0;ctx.received=0;}
        if(++attempts>this.settings().retries)throw e;
        this.store.log('retry',`المحاولة ${attempts}: ${e.message}`,ctx.id);
        const retryAt=Date.now()+Math.min(10000,this.settings().retryDelay*1000*attempts);while(!ctx.stopped&&Date.now()<retryAt)await delay(Math.min(100,retryAt-Date.now()));
      }finally{response?.destroy();ctx.controllers.delete(ac);}
    }
  }
  async throttle(ctx,n){
    const global=Number(this.settings().speedLimit)*1024,file=Number(JSON.parse(this.store.find(ctx.id)?.meta||'{}').speedLimit)*1024;
    const queue=this.store.find(ctx.id)?.queueId||'main',q=this.store.queues().find(q=>q.id===queue),queueLimit=Number(JSON.parse(q?.schedule||'{}').bandwidthKB||0)*1024;
    const now=Date.now();let waitUntil=now;
    if(queueLimit>0){const next=Math.max(now,this.queueNext.get(queue)||0)+n/queueLimit*1000;this.queueNext.set(queue,next);waitUntil=Math.max(waitUntil,next);}
    if(global>0){this.globalNext=Math.max(now,this.globalNext)+n/global*1000;waitUntil=Math.max(waitUntil,this.globalNext);}
    if(file>0){ctx.fileNext=Math.max(now,ctx.fileNext)+n/file*1000;waitUntil=Math.max(waitUntil,ctx.fileNext);}
    while(!ctx.stopped&&Date.now()<waitUntil)await delay(Math.min(100,waitUntil-Date.now()));
  }
  measure(ctx){const now=Date.now();if(now-ctx.lastTime<450)return;ctx.speed=(ctx.received-ctx.lastBytes)/((now-ctx.lastTime)/1000);ctx.lastBytes=ctx.received;ctx.lastTime=now;this.store.update(ctx.id,{speed:ctx.speed,downloaded:ctx.segments.reduce((n,s)=>n+s.current-s.start,0),segments:ctx.segments});}
  checkpoint(ctx){
    if(ctx.fd!==null){try{fs.fsyncSync(ctx.fd);}catch{}}
    if(ctx.segments.length)this.store.update(ctx.id,{downloaded:ctx.segments.reduce((n,s)=>n+s.current-s.start,0),segments:ctx.segments});
    this.store.set('usage',this.usage);ctx.checkpoint=Date.now();
  }
  async pause(id,status='paused'){
    const c=this.active.get(id);if(c){c.stopped=true;for(const ac of c.controllers)ac.abort();c.ftp?.close();c.scanner?.kill();if(c.stopProcess)await c.stopProcess();else c.process?.kill();await c.promise;this.checkpoint(c);}
    const d=this.store.find(id);if(d&&d.status!=='complete')this.store.update(id,{status,speed:0});
  }
  async pauseAll(){await Promise.all([...this.active.keys()].map(id=>this.pause(id)));}
  quotaReached(){
    const s=this.settings();if(Date.now()-this.usage.start>=s.quotaHours*3600000){this.usage.start=Date.now();this.usage.bytes=0;}
    return s.quotaMB>0&&this.usage.bytes>=s.quotaMB*1024*1024;
  }
  async pump(){
    if(this.closing)return;
    const limited=this.quotaReached(),now=new Date();
    if(!limited)for(const d of this.store.list().filter(d=>d.status==='limited'&&!this.active.has(d.id))){this.store.update(d.id,{status:'queued',error:''});this.start(d.id).catch(()=>{});}
    for(let q of this.store.queues()){
      const s=JSON.parse(q.schedule||'{}');
      if(s.enabled){
        const today=now.toLocaleDateString('en-CA'),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        if((!s.date||s.date===today)&&(!s.days?.length||s.days.includes(now.getDay()))&&s.start===time&&s.lastRun!==today){s.lastRun=today;q={...q,running:true,schedule:JSON.stringify(s)};this.store.putQueue(q);for(const d of this.store.list().filter(d=>d.queueId===q.id&&d.status==='paused'))this.store.update(d.id,{status:'queued'});}
        if(q.running&&s.stop===time&&s.lastStop!==today){s.lastStop=today;q={...q,running:false,schedule:JSON.stringify(s)};this.store.putQueue(q);for(const d of this.store.list().filter(d=>d.queueId===q.id&&ACTIVE.includes(d.status)))await this.pause(d.id);}
      }
      if(!q.running||limited)continue;
      const all=this.store.list().filter(d=>d.queueId===q.id),count=all.filter(d=>this.active.has(d.id)).length;
      for(const d of all.filter(d=>d.status==='queued').sort((a,b)=>(JSON.parse(b.meta).priority||0)-(JSON.parse(a.meta).priority||0)||a.createdAt.localeCompare(b.createdAt)).slice(0,Math.max(0,Math.min(q.simultaneous-count,this.settings().simultaneous-this.active.size))))this.start(d.id).catch(()=>{});
      if(all.length&&all.every(d=>['complete','error'].includes(d.status))){this.store.putQueue({...q,running:false});this.store.log('queue',`${q.name}: انتهت القائمة`);this.emit('queueComplete',q);if(s.completion==='quit')this.emit('quitRequested');}
    }
  }
  async finish(ctx){
    if(ctx.stopped)return;const item=this.store.find(ctx.id);let dest=path.join(item.directory,item.name);
    const ext=path.extname(item.name),stem=path.basename(item.name,ext);let i=1;
    while(fs.existsSync(dest))dest=path.join(item.directory,`${stem} (${i++})${ext}`);
    this.store.update(ctx.id,{status:'processing',speed:0});
    let copied=false;try{
    for(;;){try{await fs.promises.copyFile(ctx.temp,dest,fs.constants.COPYFILE_EXCL);copied=true;break;}catch(error){if(error.code!=='EEXIST')throw error;dest=path.join(item.directory,`${stem} (${i++})${ext}`);}}
    const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(dest)){if(ctx.stopped)return;hash.update(chunk);}
    if(ctx.stopped)return;
    const meta={...JSON.parse(item.meta),filePath:dest,sha256:hash.digest('hex')};
    if(this.settings().scanner){
      try{
        const template=this.settings().scannerArgs==='[File]'?['[File]']:JSON.parse(this.settings().scannerArgs);
        if(!Array.isArray(template)||template.some(x=>typeof x!=='string'))throw Error('معاملات برنامج الفحص يجب أن تكون مصفوفة JSON');
        const args=template.map(x=>x.replaceAll('[File]',dest));
        await new Promise((resolve,reject)=>{const child=spawn(this.settings().scanner,args,{windowsHide:true,stdio:'ignore'});ctx.scanner=child;const timer=setTimeout(()=>{child.kill();reject(Error('انتهت مهلة الفحص'));},120000);child.on('error',err=>{clearTimeout(timer);reject(err);});child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error(`Scanner exit code: ${code}`));});});
        meta.scan={status:'passed'};
      }catch(err){meta.scan={status:'error',message:err.message};this.store.log('scan',err.message,ctx.id);}
    }
    if(ctx.stopped)return;
    fs.unlinkSync(ctx.temp);
    this.store.update(ctx.id,{status:'complete',size:fs.statSync(dest).size,downloaded:fs.statSync(dest).size,speed:0,name:path.basename(dest),error:'',meta:JSON.stringify(meta)});
    if(meta.mode==='media'){this.usage.total+=fs.statSync(dest).size;this.usage.bytes+=fs.statSync(dest).size;this.store.set('usage',this.usage);}
    this.store.log('complete',path.basename(dest),ctx.id);await this.onComplete?.(dest);this.emit('complete',this.store.find(ctx.id));
    }finally{if(copied&&this.store.find(ctx.id)?.status!=='complete')try{await fs.promises.unlink(dest);}catch{}}
  }
  async ftp(ctx,meta){
    const u=new URL(ctx.item.url),client=new Client(30000);ctx.ftp=client;const login=this.store.auth(u.hostname);
    const ac={abort:()=>client.close()};ctx.controllers.add(ac);
    try{
      await client.access({host:u.hostname,port:Number(u.port)||21,user:login?.username||'anonymous',password:login?.password||'flow@localhost',secure:u.protocol==='ftps:'});
      const remote=decodeURIComponent(u.pathname),size=await client.size(remote);
      let offset=fs.existsSync(ctx.temp)?fs.statSync(ctx.temp).size:0;
      if(ctx.item.size&&ctx.item.size!==size)throw Error('تغير حجم ملف FTP. أعد التحميل.');
      this.store.update(ctx.id,{status:'downloading',size,resumable:true});
      client.trackProgress(p=>{const n=p.bytes-ctx.received;ctx.received=p.bytes;this.usage.bytes+=Math.max(0,n);this.usage.total+=Math.max(0,n);this.store.update(ctx.id,{downloaded:offset+p.bytes,speed:p.bytes/Math.max(1,(Date.now()-ctx.lastTime)/1000)});if(this.quotaReached())this.pause(ctx.id,'limited');});
      if(this.settings().speedLimit||meta.speedLimit)throw Error('محدد السرعة لملفات FTP غير متاح. أزل الحد أو استخدم HTTP.');
      await client.downloadTo(ctx.temp,remote,offset);if(!ctx.stopped)await this.finish(ctx);
    }finally{client.close();ctx.controllers.delete(ac);this.store.set('usage',this.usage);}
  }
  async media(ctx,meta){
    let ffmpeg=require('ffmpeg-static');
    if(ffmpeg&&process.versions.electron)ffmpeg=ffmpeg.replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
    if(!ffmpeg||!fs.existsSync(ffmpeg))throw Error('FFmpeg غير متاح؛ أعد تثبيت الاعتمادات');
    if(this.settings().speedLimit||meta.speedLimit||this.settings().quotaMB)throw Error('معالجة البث لا تدعم حد السرعة أو الحصة حالياً؛ عطّلها قبل بدء هذا النوع.');
    for(const url of [ctx.item.url,meta.audioURL].filter(Boolean))validateURL(url,['http:','https:']);
    const inspect=async(url,depth=0,visited=new Set())=>{
      if(visited.has(url)||depth>3||visited.size>=24)return;visited.add(url);
      if(!/\.(m3u8|mpd)(\?|$)/i.test(url)){const info=await require('./network.cjs').probe(url,{headers:this.authHeaders(url,meta),settings:this.settings()});if(!/mpegurl|dash\+xml/i.test(info.type))return;}
      const check=await require('./network.cjs').buffer(url,{headers:this.authHeaders(url,meta),settings:this.settings()},8*1024*1024);
      const text=check.body.toString();if(/#EXT-X-(KEY|SESSION-KEY):.*METHOD=(?!NONE)|ContentProtection|pssh/i.test(text))throw Error('هذا البث مشفر أو محمي ولا يمكن تحميله');
      if(text.startsWith('#EXTM3U')){
        const children=text.split(/\r?\n/).map(l=>l.trim()).filter((l,i,lines)=>l&&!l.startsWith('#')&&(/\.m3u8(\?|$)/i.test(l)||lines[i-1]?.startsWith('#EXT-X-STREAM-INF:')));
        for(const line of text.split(/\r?\n/)){if(/^#EXT-X-MEDIA:/.test(line)){const m=/URI="([^"]+)"/.exec(line);if(m)children.push(m[1]);}}
        for(const child of children)await inspect(new URL(child,check.url).href,depth+1,visited);
      }
    };
    await inspect(ctx.item.url);if(meta.audioURL)await inspect(meta.audioURL);
    ctx.temp=path.join(this.settings().tempDir,ctx.id+'.'+(meta.format==='mkv'?'mkv':'mp4'));
    const args=['-hide_banner','-nostdin','-y','-protocol_whitelist','http,https,tcp,tls,crypto','-user_agent',this.authHeaders(ctx.item.url,meta)['user-agent']];
    const headers=this.authHeaders(ctx.item.url,meta);delete headers['user-agent'];
    if(Object.keys(headers).length)args.push('-headers',Object.entries(headers).map(([k,v])=>`${k}: ${v}\r\n`).join(''));
    if(this.settings().proxy)args.push('-http_proxy',this.settings().proxy);
    args.push('-i',ctx.item.url);
    if(meta.audioURL)args.push('-i',meta.audioURL,'-map','0:v:0','-map','1:a:0');
    args.push('-c','copy','-progress','pipe:1','-f',meta.format==='mkv'?'matroska':'mp4');if(meta.format!=='mkv')args.push('-movflags','+faststart');args.push(ctx.temp);
    this.store.update(ctx.id,{status:'processing',resumable:false});
    await new Promise((resolve,reject)=>{
      const p=spawn(ffmpeg,args,{windowsHide:true});ctx.process=p;let err='';p.stderr.on('data',b=>err=(err+b).slice(-3000));
      p.stdout.on('data',b=>{const m=/total_size=(\d+)/.exec(String(b));if(m)this.store.update(ctx.id,{downloaded:Number(m[1])});});
      p.on('error',reject);p.on('close',code=>code===0||ctx.stopped?resolve():reject(Error('تعذرت معالجة الوسائط: '+err.slice(-700))));
    });if(!ctx.stopped)await this.finish(ctx);
  }
  async remove(id,deleteFile=false){await this.pause(id);const d=this.store.find(id);if(!d)return;
    if(deleteFile){const target=JSON.parse(d.meta).filePath;if(target&&fs.existsSync(target))fs.unlinkSync(target);}
    if(fs.existsSync(this.settings().tempDir))for(const name of fs.readdirSync(this.settings().tempDir).filter(n=>n.startsWith(id+'.'))){const p=path.join(this.settings().tempDir,name);if(fs.statSync(p).isFile())fs.unlinkSync(p);}
    this.store.remove(id);
  }
  async redownload(id){await this.pause(id);const d=this.store.find(id);if(!d)return;if(fs.existsSync(this.settings().tempDir))for(const name of fs.readdirSync(this.settings().tempDir).filter(n=>n.startsWith(id+'.'))){const p=path.join(this.settings().tempDir,name);if(fs.statSync(p).isFile())fs.unlinkSync(p);}this.store.update(id,{segments:[],downloaded:0,size:0,etag:'',modified:'',status:'queued'});this.start(id).catch(()=>{});}
  async close(){this.closing=true;clearInterval(this.tick);await this.pauseAll();await this.video.close();this.store.set('usage',this.usage);}
}
module.exports={Engine,fileName,category,ACTIVE};
