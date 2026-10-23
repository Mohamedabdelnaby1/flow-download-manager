const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Store}=require('./store.cjs');
const {Engine,fileName}=require('./engine.cjs');
const {Grabber}=require('./grabber.cjs');
const net=require('./network.cjs');
function cleanHeaders(headers={}){const out={};for(const [k,v]of Object.entries(headers)){
  if(!/^(user-agent|referer|cookie|authorization|accept|origin)$/i.test(k))continue;
  if(/[\r\n]/.test(String(v)))throw Error('ترويسة غير صالحة');out[k.toLowerCase()]=String(v).slice(0,16000);
}return out;}
function finiteNumber(value,min=0,max=1000000){const n=Number(value??0);if(!Number.isFinite(n)||n<min||n>max)throw Error('قيمة رقمية غير صالحة');return n;}
function validateAdd(data,store){
  net.validateURL(data.url);if(data.audioURL)net.validateURL(data.audioURL,['http:','https:']);
  if(data.category&&!['compressed','documents','music','programs','video','other'].includes(data.category))throw Error('تصنيف غير صالح');
  if(data.queueId&&!store.queues().some(q=>q.id===data.queueId))throw Error('قائمة الانتظار غير موجودة');
  if(data.directory&&!path.isAbsolute(data.directory))throw Error('مسار الحفظ يجب أن يكون مطلقاً');
  return {url:data.url,name:data.name&&fileName(data.name),category:data.category,description:String(data.description||'').slice(0,2000),directory:data.directory,queueId:data.queueId,later:!!data.later,headers:cleanHeaders(data.headers),mode:require('./video.cjs').isVideoPage(data.url)||data.mode==='site'?'site':data.mode==='media'?'media':'file',quality:/^(best|audio|[a-z0-9_.-]{1,80})$/i.test(String(data.quality||'best'))?String(data.quality||'best'):'best',audioURL:data.audioURL,format:data.format==='mkv'?'mkv':'mp4',sourcePage:data.sourcePage,speedLimit:finiteNumber(data.speedLimit),priority:data.priority===undefined||data.priority===''?undefined:Math.max(-2,Math.min(2,Math.trunc(Number(data.priority)||0)))};
}
function validateSettings(patch){
  const result={};const {DEFAULTS}=require('./store.cjs');
  for(const [k,v]of Object.entries(patch)){if(!(k in DEFAULTS)&&!['downloadDir','tempDir'].includes(k))continue;
    if(['downloadDir','tempDir'].includes(k)){if(typeof v!=='string'||!path.isAbsolute(v))throw Error('مسار المجلد غير صالح');result[k]=v;}
    else if(typeof DEFAULTS[k]==='boolean')result[k]=!!v;
    else if(typeof DEFAULTS[k]==='number'){const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('قيمة رقمية غير صالحة');result[k]=n;}
    else if(typeof DEFAULTS[k]==='string'){result[k]=String(v).slice(0,16000);}
    else if(k==='categoryFolders'){result[k]={};for(const[c,p]of Object.entries(v||{})){if(!path.isAbsolute(p))throw Error('مسار تصنيف غير صالح');result[k][c]=p;}}
    else if(k==='serverConnections'){result[k]={};for(const[h,n]of Object.entries(v||{}))result[k][h]=Math.max(1,Math.min(32,Number(n)||1));}
  }
  if('textScale'in result)result.textScale=Math.max(80,Math.min(150,result.textScale));
  if(result.language&&!['ar','en'].includes(result.language))throw Error('لغة غير صالحة');
  if('theme'in result&&!['system','light','dark'].includes(result.theme))throw Error('مظهر غير صالح');
  if(result.panelMode&&!['full','mini'].includes(result.panelMode))throw Error('حجم لوحة غير صالح');
  if('connections'in result)result.connections=Math.max(1,Math.min(32,Math.floor(result.connections)));
  if('simultaneous'in result)result.simultaneous=Math.max(1,Math.min(16,Math.floor(result.simultaneous)));
  if('quotaHours'in result)result.quotaHours=Math.max(0.01,result.quotaHours);
  if('retries'in result)result.retries=Math.min(30,Math.floor(result.retries));
  if('retryDelay'in result)result.retryDelay=Math.max(0.1,Math.min(60,result.retryDelay));
  if(result.userAgent&&/[\r\n]/.test(result.userAgent))throw Error('User-Agent غير صالح');
  if(result.proxy){const u=new URL(result.proxy);if(!['http:','https:','socks:','socks4:','socks5:','socks5h:'].includes(u.protocol))throw Error('عنوان الوكيل غير صالح');}
  return result;
}
class Service{
  constructor(dir,options={}){
    this.closed=false;this.browserControllers=new Set();this.browserPending=new Map();this.store=new Store(dir,options.protection);this.engine=new Engine(this.store,options);this.grabber=new Grabber(this.store,this.engine);this.desktop=options.desktop;
    this.extensionToken=this.store.get('extensionToken');if(!this.extensionToken){this.extensionToken=crypto.randomBytes(32).toString('hex');this.store.set('extensionToken',this.extensionToken);}
    this.smart=new (require('./smart.cjs').SmartTools)(this);
    this.power=new (require('./power.cjs').Power)(this);this.library=new (require('./library.cjs').Library)(this);
    this.timer=setInterval(()=>{try{this.grabber.finalize();}catch(e){this.store.log('error',e.message);}},3000);this.timer.unref();
  }
  snapshot(){const browser=this.store.get('browserLastSeen',{});return {browser:{...browser,...this.browserBridge?.info(),connected:!!browser.lastSeen&&Date.now()-new Date(browser.lastSeen).getTime()<90000},downloads:this.store.list().map(d=>({...d,meta:JSON.stringify((({headers,...rest})=>rest)(JSON.parse(d.meta)))})),power:this.power.snapshot(),library:this.library.snapshot(),settings:this.store.settings,queues:this.store.queues(),projects:this.store.projects(),usage:this.engine.usage,logins:this.store.logins(),database:{engine:'Realm',encrypted:true,path:path.join(this.store.dir,'flow.realm')},desktop:!!this.desktop,extensionToken:this.extensionToken};}
  async browserAdd(data){
    if(this.closed)throw Error('البرنامج يغلق؛ أكمل التنزيل في المتصفح');
    const key=String(data.requestId||crypto.randomUUID());
    if(this.browserPending.has(key))return this.browserPending.get(key);
    const pending=this.acceptBrowserDownload(data);this.browserPending.set(key,pending);
    try{return await pending;}finally{this.browserPending.delete(key);}
  }
  async acceptBrowserDownload(data){
    const requestId=String(data.requestId||'');if(requestId&&!/^[a-z0-9:-]{1,100}$/i.test(requestId))throw Error('Invalid handoff identifier');
    const recent=this.store.get('browserRequests',[]),existing=recent.find(r=>r.id===requestId);if(existing&&this.store.find(existing.downloadId))return this.store.find(existing.downloadId);
    const validated=validateAdd({url:data.url,name:data.name,headers:data.headers,sourcePage:data.sourcePage,later:!!data.later,mode:data.mode},this.store);
    if(this.store.settings.preventDuplicates){const duplicate=this.library.duplicates(validated.url)[0];if(duplicate){if(this.desktop){await this.desktop.downloadInfo?.(duplicate.id,duplicate.status);}return duplicate;}}
    let info;
    if(this.desktop&&!['media','site'].includes(validated.mode)&&/^https?:/.test(validated.url)){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);timer.unref();this.browserControllers.add(controller);
      try{info=await net.probe(validated.url,{headers:this.engine.authHeaders(validated.url,{headers:validated.headers}),settings:this.store.settings,signal:controller.signal});}finally{clearTimeout(timer);this.browserControllers.delete(controller);}
      if(/text\/html/i.test(info.type)&&!/(?:text\/html|\.html?)(?:$|[?;])/i.test(validated.name||new URL(validated.url).pathname))throw Error('الرابط أعاد صفحة تسجيل دخول أو صفحة مشاهدة، وليس ملفًا مباشرًا. أكمل التنزيل في المتصفح أو اختر رابط الفيديو المكتشف.');
    }
    if(this.closed)throw Error('البرنامج يغلق؛ أكمل التنزيل في المتصفح');
    const pending=!!this.desktop?.downloadInfo&&this.store.settings.browserConfirm&&!validated.later;
    const item=this.engine.add({...validated,later:pending||validated.later});
    if(pending){this.store.update(item.id,{status:'pending',...(info?{size:info.size,resumable:info.resumable}:{})});try{await this.desktop.downloadInfo(item.id);}catch(error){await this.engine.remove(item.id);throw error;}}
    if(requestId)this.store.set('browserRequests',[...this.store.get('browserRequests',[]),{id:requestId,downloadId:item.id}].slice(-200));return this.store.find(item.id);
  }
  browserSeen(client,version){this.store.set('browserLastSeen',{lastSeen:new Date().toISOString(),name:String(client||'Chromium').slice(0,50),extensionVersion:/^\d+\.\d+\.\d+$/.test(String(version))?String(version):'legacy'});}
  async action(type,data={}){
    const s=this.store,e=this.engine;
    if(type==='remove'&&!data.deleteFile&&this.library.removing.has(data.id))return this.library.removing.get(data.id);
    if(require('./library.cjs').ACTIONS.has(type))return this.library.action(type,data);
    if(require('./power.cjs').ACTIONS.has(type))return this.power.action(type,data);
    if(['start','remove','redownload','update','confirmDownload'].includes(type)&&e.maintenance.has(data.id))throw Error('انتظر انتهاء الفحص أو العملية الحالية');
    switch(type){
      case'libraryHealth':return this.smart.run(()=>this.smart.library());
      case'verifyFile':return this.smart.verify(data.id,data.expected);
      case'rescueLink':return this.smart.rescue(data.id,data.url,cleanHeaders(data.headers));
      case'add':{const validated=validateAdd(data,s);if(data.duplicateMode==='reuse'){const existing=this.library.duplicates(validated.url)[0];if(existing)return existing;}const item=e.add(validated);this.library.remember(item.directory);return item;}
      case'confirmDownload':{
        const item=s.find(data.id);if(!item||item.status!=='pending')throw Error('طلب التحميل لم يعد بانتظار التأكيد');
        const meta=JSON.parse(item.meta),nextURL=data.url||item.url,sameOrigin=new URL(nextURL).origin===new URL(item.url).origin,validated=validateAdd({...data,url:nextURL,headers:{...(sameOrigin?meta.headers:{}),...data.headers}},s);
        const name=validated.name||item.name,category=validated.category||require('./engine.cjs').category(name);
        s.update(item.id,{url:validated.url,name,category,directory:validated.directory||item.directory,description:validated.description,queueId:validated.queueId||item.queueId,status:'paused',meta:JSON.stringify({...meta,autoDirectory:validated.directory&&validated.directory!==item.directory?false:meta.autoDirectory,headers:validated.headers,autoName:!data.name||meta.autoName&&data.name===item.name,mode:validated.mode,quality:validated.quality,speedLimit:validated.speedLimit,priority:validated.priority??meta.priority??0})});
        this.library.remember(validated.directory||item.directory);if(data.later)s.update(item.id,{status:'queued'});else e.start(item.id).catch(()=>{});return {id:item.id};
      }
      case'authorProfile':if(!this.desktop)throw Error('افتح الرابط من نسخة سطح المكتب');return this.desktop.authorProfile();
      case'browserFallback':{const item=s.find(data.id);if(!item||!this.desktop?.browserFallback)throw Error('افتح رابط المصدر في المتصفح');const meta=JSON.parse(item.meta);return this.desktop.browserFallback(meta.sourcePage||item.url);}
      case'batch':{
        if(!Array.isArray(data.urls)||data.urls.length>500)throw Error('الحد الأقصى 500 رابط');
        const items=data.urls.map(url=>validateAdd({...data,url,later:true},s));
        return items.map(item=>e.add(item));
      }
      case'videoInfo':case'probe':{net.validateURL(data.url,['http:','https:']);const stored=data.id&&s.find(data.id),headers=e.authHeaders(data.url,{headers:{...(stored&&new URL(stored.url).origin===new URL(data.url).origin?JSON.parse(stored.meta).headers:{}),...cleanHeaders(data.headers)}});if(type==='videoInfo'||data.mode==='site'||require('./video.cjs').isVideoPage(data.url))return e.video.inspect(data.url,headers);return net.probe(data.url,{headers,settings:s.settings});}
      case'zip':return net.zipPreview(data.url,{headers:e.authHeaders(data.url),settings:s.settings});
      case'start':{const item=s.find(data.id);if(!item)throw Error('التحميل غير موجود');if(item.status==='pending'&&this.desktop?.downloadInfo)return this.desktop.downloadInfo(item.id);e.start(data.id).catch(()=>{});return true;}
      case'pause':await e.pause(data.id);return true;
      case'pauseAll':for(const q of s.queues())s.putQueue({...q,running:false});await e.pauseAll();return true;
      case'remove':if(data.deleteFile)await e.remove(data.id,true);else await this.library.trash(data.id);return true;
      case'clearComplete':for(const d of s.list().filter(d=>d.status==='complete'))await this.library.trash(d.id);return true;
      case'redownload':await e.redownload(data.id);return true;
      case'update':{
        await e.pause(data.id);const d=s.find(data.id);if(!d)throw Error('التحميل غير موجود');const patch={};
        const meta=JSON.parse(d.meta);if(data.url){net.validateURL(data.url);patch.url=data.url;if(new URL(data.url).origin!==new URL(d.url).origin){for(const key of ['cookie','authorization','referer','origin'])delete meta.headers[key];}}
        if(data.name)patch.name=fileName(data.name);if(data.description!==undefined)patch.description=String(data.description).slice(0,2000);
        if(data.queueId&&s.queues().some(q=>q.id===data.queueId))patch.queueId=data.queueId;
        if(data.speedLimit!==undefined)meta.speedLimit=finiteNumber(data.speedLimit);patch.meta=JSON.stringify(meta);
        return s.update(d.id,patch);
      }
      case'settings':{
        if((e.active.size||e.maintenance.size)&&(['tempDir','downloadDir'].some(k=>data[k]!==undefined&&data[k]!==s.settings[k])))throw Error('أوقف التحميلات وانتظر انتهاء الفحص قبل تغيير مجلدات الحفظ');
        if(data.tempDir&&data.tempDir!==s.settings.tempDir&&s.list().some(d=>d.downloaded>0&&d.status!=='complete'))throw Error('لا يمكن تغيير مجلد الأجزاء قبل إكمال أو إزالة التحميلات غير المكتملة');
        const patch=validateSettings(data);if(patch.startAtLogin!==undefined){if(!this.desktop&&patch.startAtLogin)throw Error('التشغيل مع النظام متاح داخل Electron');this.desktop?.startup(patch.startAtLogin);}
        const result=s.saveSettings(patch);if(patch.textScale!==undefined)this.desktop?.scale?.(Math.max(.8,Math.min(1.5,patch.textScale/100)));return result;
      }
      case'queue':{
        const id=data.id||crypto.randomUUID(),old=s.queues().find(q=>q.id===id);
        if(!/^[a-z0-9-]{1,80}$/i.test(id))throw Error('معرف قائمة غير صالح');
        const schedule={...(data.schedule||JSON.parse(old?.schedule||'{}'))};
        if(data.bandwidthKB!==undefined)schedule.bandwidthKB=finiteNumber(data.bandwidthKB);
        if(schedule.bandwidthKB!==undefined)schedule.bandwidthKB=finiteNumber(schedule.bandwidthKB);
        if(!schedule||typeof schedule!=='object'||Array.isArray(schedule))throw Error('جدول غير صالح');
        if(schedule.days!==undefined&&(!Array.isArray(schedule.days)||schedule.days.some(n=>!Number.isInteger(n)||n<0||n>6)))throw Error('أيام الجدولة غير صالحة');
        if(schedule.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(schedule.date)||!Number.isFinite(Date.parse(schedule.date))))throw Error('تاريخ غير صالح');
        if(schedule.enabled&&!schedule.start)throw Error('حدد وقت بدء الجدول');
        for(const key of ['start','stop'])if(schedule[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule[key]))throw Error('وقت غير صالح');
        if(schedule.completion&&!['none','quit'].includes(schedule.completion))throw Error('إجراء الإنهاء غير مدعوم');
        if(data.running===true)for(const d of s.list().filter(d=>d.queueId===id&&d.status==='paused'))s.update(d.id,{status:'queued'});
        e.queueNext.delete(id);return s.putQueue({id,name:String(data.name||old?.name||(s.settings.language==='en'?'New queue':'قائمة جديدة')).slice(0,100),running:data.running??old?.running??false,simultaneous:Math.max(1,Math.min(16,Math.trunc(Number(data.simultaneous))||old?.simultaneous||3)),schedule:JSON.stringify(schedule)});
      }
      case'queueStop':{const q=s.queues().find(q=>q.id===data.id);if(!q)throw Error('القائمة غير موجودة');s.putQueue({...q,running:false});for(const d of s.list().filter(d=>d.queueId===q.id))if(e.active.has(d.id))await e.pause(d.id);return true;}
      case'queueRemove':s.removeQueue(data.id);return true;
      case'login':{const host=String(data.host||'').trim().toLowerCase();if(!/^[a-z0-9.-]+$/.test(host)||!host)throw Error('اسم النطاق غير صالح');s.saveLogin({host,username:String(data.username||''),password:String(data.password||'')});return s.logins();}
      case'loginRemove':s.set('logins',s.get('logins',[]).filter(x=>x.host!==data.host));return s.logins();
      case'diagnostics':return require('./diagnostics.cjs').diagnostics(this);
      case'logs':return s.logs();
      case'export':return {format:'Flow',version:1,createdAt:new Date().toISOString(),downloads:s.list().map(({url,name,category,description,queueId})=>({url,name,category,description,queueId})),queues:s.queues().map(q=>({...q,running:false})),settings:{...s.settings,proxy:''}};
      case'import':{
        if(data.format!=='Flow'||!Array.isArray(data.downloads)||data.downloads.length>5000)throw Error('ملف النسخة الاحتياطية غير صالح');
        const items=data.downloads.map(({url,name,category,description})=>validateAdd({url,name,category,description,queueId:'main',later:true},s));for(const d of items)e.add(d);return items.length;
      }
      case'grab':{net.validateURL(data.url,['http:','https:']);const id=crypto.randomUUID();this.grabber.scan({...data,id}).catch(e=>s.log('error',e.message));return {id};}
      case'grabCancel':this.grabber.cancel(data.id);return true;
      case'grabDownload':return this.grabber.download(data.id,data.urls||[]);
      case'extensionRotate':this.extensionToken=crypto.randomBytes(32).toString('hex');s.set('extensionToken',this.extensionToken);await this.browserBridge?.configure();return this.extensionToken;
      case'browserInstall':if(!this.browserBridge)throw Error('افتح نسخة سطح المكتب لإعداد الربط');return this.browserBridge.install();
      case'browserFolder':if(!this.browserBridge)throw Error('افتح نسخة سطح المكتب');if(!require('node:fs').existsSync(this.browserBridge.extensionPath))throw Error('جهّز ربط المتصفح أولاً');return this.desktop.open(this.browserBridge.extensionPath);
      case'browserExtensions':if(!this.desktop)throw Error('افتح chrome://extensions يدويًا');return this.desktop.browserExtensions();
      case'quit':if(!this.desktop)throw Error('هذه الوظيفة لسطح المكتب');return this.desktop.quit();
      case'open':case'folder':{
        const d=s.find(data.id),file=d&&JSON.parse(d.meta).filePath;if(!file||d.status!=='complete')throw Error('الملف لم يكتمل بعد');if(!this.desktop)throw Error('فتح الملفات متاح داخل تطبيق Electron');return this.desktop[type](file);
      }
      case'chooseDirectory':if(!this.desktop)throw Error('اكتب مسار المجلد في نسخة المتصفح');return this.desktop.chooseDirectory();
      case'chooseSound':if(!this.desktop)throw Error('اكتب مسار WAV في نسخة المتصفح');return this.desktop.chooseSound();
      case'playSound':if(!this.desktop)throw Error('معاينة ملف صوتي محلي تحتاج Electron');return this.desktop.playSound(String(data.path));
      case'vpnConnect':if(!this.desktop)throw Error('هذه الوظيفة تحتاج نسخة ويندوز Electron');return this.desktop.vpnConnect(s.settings.vpnName);
      case'vpnDisconnect':if(!this.desktop)throw Error('هذه الوظيفة تحتاج نسخة ويندوز Electron');return this.desktop.vpnDisconnect(s.settings.vpnName);
      default:throw Error('أمر غير معروف');
    }
  }
  async close(){this.closed=true;clearInterval(this.timer);for(const c of this.browserControllers)c.abort();await Promise.allSettled([...this.browserPending.values()]);await Promise.allSettled([...this.library.removing.values()]);await this.power.close();await this.smart.close();for(const id of this.grabber.running)this.grabber.cancel(id);while(this.grabber.running.size)await new Promise(r=>setTimeout(r,50));await this.engine.close();this.store.close();}
}
module.exports={Service,validateAdd,validateSettings};
