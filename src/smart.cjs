const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const net=require('./network.cjs');
function diagnosis(item){
 const error=item.error||'',meta=JSON.parse(item.meta),code=/HTTP\s*(\d{3})/i.exec(error)?.[1];
 if(item.status==='complete')return {code:'complete',message:'اكتمل التحميل؛ يمكنك فحص البصمة ووجود الملف على القرص.',action:'verify'};
 if(item.status==='pending')return {code:'confirmation',message:'بانتظار تأكيدك في نافذة معلومات التحميل.',action:'confirm'};
 if(code==='401'||code==='403'||code==='410')return {code:'session',message:'قد يكون الرابط أو تصريح الدخول انتهى. افتح صفحة المصدر وأحضر رابطًا حديثًا لنفس الملف.',action:'rescue'};
 if(/تغير الملف|Content.Range|نطاق|ETag/i.test(error))return {code:'changed',message:'الخادم يعرض بيانات مختلفة أو نطاقًا غير صحيح. لا تدمجها مع الأجزاء القديمة؛ تحقق من رابط الملف الأصلي.',action:'rescue'};
 if(/ENOSPC|مساحة/i.test(error))return {code:'disk',message:'مساحة القرص غير كافية. حرّر مساحة في مجلدي الحفظ والأجزاء ثم استأنف.',action:'details'};
 if(/ENOTFOUND|ECONN|مهلة|timeout|network/i.test(error))return {code:'network',message:'تعذر الاتصال بالخادم. راجع الشبكة والوكيل ثم جرّب الاستئناف.',action:'details'};
 if(/مشفر|DRM|protected/i.test(error))return {code:'protected',message:'هذا المحتوى محمي أو مشفر، ولا يدعم البرنامج تجاوزه.',action:'source'};
 if(meta.mode==='site'&&error)return {code:'video',message:'افتح صفحة الفيديو وتحقق من إتاحته وجلسة الحساب، ثم أعد فحص الجودات. قد تتغير متطلبات الموقع.',action:'source'};
 if(item.status==='limited')return {code:'quota',message:'تم بلوغ حصة البيانات؛ سيُستأنف التحميل عند تجددها، أو عدّل الحصة من الإعدادات.',action:'settings'};
 return {code:item.status,message:error||'يمكن استئناف هذا الملف أو مراجعة تفاصيله ومجلد الحفظ.',action:'details'};
}
class SmartTools{
 constructor(service){this.service=service;this.jobs=new Set();this.controllers=new Set();this.closed=false;}
 run(fn){if(this.closed)return Promise.reject(Error('البرنامج يُغلق'));const job=fn();this.jobs.add(job);job.finally(()=>this.jobs.delete(job)).catch(()=>{});return job;}
 async library(){
  const files=[];for(const d of this.service.store.list()){
   const meta=JSON.parse(d.meta);let disk='partial',bytes=0;
   if(d.status==='complete'){try{const st=await fs.promises.stat(meta.filePath||'');disk=st.isFile()?(st.size===d.size?'present':'size-changed'):'missing';bytes=st.size;}catch(e){disk=e.code==='ENOENT'?'missing':'unreadable';}}
   files.push({id:d.id,name:d.name,status:d.status,size:d.size,downloaded:d.downloaded,disk,bytes,sha256:meta.sha256||'',verification:meta.verification||null,diagnosis:diagnosis(d),rescue:!['complete','pending','probing','downloading','processing'].includes(d.status)&&meta.mode==='file'&&/^https?:/.test(d.url)});
  }
  const hashes=new Map();for(const d of files)if(d.disk==='present'&&d.sha256){const key=d.size+':'+d.sha256;if(!hashes.has(key))hashes.set(key,[]);hashes.get(key).push(d);}
  // A stored fingerprint identifies candidates; users re-hash before removing anything.
  const duplicates=[...hashes.values()].filter(g=>g.length>1).map(g=>({ids:g.map(d=>d.id),names:g.map(d=>d.name),size:g[0].size,sha256:g[0].sha256,savings:(g.length-1)*g[0].size}));
  return {files,duplicates,totals:{count:files.length,missing:files.filter(d=>d.disk==='missing').length,changed:files.filter(d=>d.disk==='size-changed').length,errors:files.filter(d=>d.status==='error').length,savings:duplicates.reduce((n,g)=>n+g.savings,0)},checkedAt:new Date().toISOString()};
 }
 verify(id,expected='',algorithm='sha256'){return this.run(async()=>{
  if(!['sha256','sha512'].includes(algorithm))throw Error('Choose SHA-256 or SHA-512');expected=String(expected).trim().toLowerCase();if(expected&&!new RegExp('^[a-f0-9]{'+(algorithm==='sha512'?128:64)+'}$').test(expected))throw Error('Invalid '+algorithm.toUpperCase()+' fingerprint; expected '+(algorithm==='sha512'?128:64)+' hexadecimal characters');
  const d=this.service.store.find(id),meta=d&&JSON.parse(d.meta);if(!d||d.status!=='complete'||!meta.filePath)throw Error('اختر ملفًا مكتملًا');
  const controller=new AbortController();this.controllers.add(controller);
  try{const before=await fs.promises.stat(meta.filePath),hash=crypto.createHash(algorithm);
   for await(const chunk of fs.createReadStream(meta.filePath,{signal:controller.signal}))hash.update(chunk);
   const after=await fs.promises.stat(meta.filePath);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('تغير الملف أثناء الفحص؛ أعد المحاولة');
   const digest=hash.digest('hex'),result={algorithm,digest,[algorithm]:digest,expectedMatch:expected?digest===expected:null,baselineMatch:meta[algorithm]?digest===meta[algorithm]:null,bytes:after.size,checkedAt:new Date().toISOString()};
   const latest=this.service.store.find(id);if(latest){const next=JSON.parse(latest.meta);if(next.filePath===meta.filePath)this.service.store.update(id,{meta:JSON.stringify({...next,verification:result})});}
   return result;
  }finally{this.controllers.delete(controller);}
 });}
 rescue(id,url,headers){return this.run(async()=>{
  net.validateURL(url,['http:','https:']);const {store,engine}=this.service;
  if(engine.maintenance.has(id))throw Error('هذا الملف قيد الفحص');
  const d=store.find(id);if(!d||['complete','pending'].includes(d.status)||JSON.parse(d.meta).mode!=='file'||!/^https?:/.test(d.url))throw Error('الإنقاذ متاح لملف HTTP غير مكتمل فقط');
  if(engine.active.has(id))throw Error('أوقف الملف أولًا قبل إنقاذ الرابط');
  engine.maintenance.add(id);const controller=new AbortController();this.controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),120000);timeout.unref();
  try{
   const oldMeta=JSON.parse(d.meta),sameOrigin=new URL(url).origin===new URL(d.url).origin;
   const nextHeaders={...(sameOrigin?oldMeta.headers:{}),...headers};
   const auth=engine.authHeaders(url,{headers:nextHeaders}),options={headers:auth,settings:store.settings,signal:controller.signal};
   const info=await net.probe(url,options);if(/text\/html/i.test(info.type))throw Error('الرابط يعرض صفحة ويب؛ اختر رابط الملف المباشر');
   let samples=0;
   if(d.downloaded){
    if(!info.resumable||!d.size||info.size!==d.size)throw Error('الحجم مختلف أو الخادم لا يدعم الاستئناف؛ الأجزاء القديمة محفوظة');
    if(d.etag&&info.etag&&d.etag!==info.etag||d.modified&&info.modified&&d.modified!==info.modified)throw Error('هوية الملف تغيرت؛ تم رفض الرابط لحماية الأجزاء القديمة');
    const partial=path.join(store.settings.tempDir,id+'.part'),handle=await fs.promises.open(partial,'r');
    try{const segments=d.segments.filter(s=>s.current>s.start);if(!segments.length)throw Error('لا توجد نطاقات محفوظة يمكن التحقق منها');
     // Compare beginning and end of every saved segment, rather than a single prefix.
     for(const segment of segments){const length=Math.min(32768,segment.current-segment.start),starts=[...new Set([segment.start,segment.current-length])];
      for(const start of starts){const end=start+length-1,r=await net.request(url,{...options,headers:{...auth,range:`bytes=${start}-${end}`}});
       if(r.statusCode!==206||r.headers['content-range']!==`bytes ${start}-${end}/${d.size}`){r.destroy();throw Error('الخادم لم يُرجع النطاق المطابق؛ الأجزاء محفوظة');}
       const chunks=[];let size=0;for await(const c of r){size+=c.length;if(size>length){r.destroy();throw Error('نطاق أكبر من المتوقع');}chunks.push(c);}
       const remote=Buffer.concat(chunks),local=Buffer.alloc(length),read=await handle.read(local,0,length,start);
       if(read.bytesRead!==length||remote.length!==length||!local.equals(remote))throw Error('محتوى الرابط لا يطابق الأجزاء المحفوظة؛ تم رفضه');samples++;
      }
     }
    }finally{await handle.close();}
   }
   const latest=store.find(id);if(!latest||latest.url!==d.url||latest.meta!==d.meta||latest.downloaded!==d.downloaded||JSON.stringify(latest.segments)!==JSON.stringify(d.segments))throw Error('تغيرت المهمة أثناء الفحص؛ أعد المحاولة');
   const result={samples,checkedAt:new Date().toISOString(),preservedBytes:d.downloaded};
   store.update(id,{url,name:d.name,status:'paused',error:'',meta:JSON.stringify({...oldMeta,headers:nextHeaders,rescue:result})});store.log('rescue','تم تحديث الرابط بعد فحص الهوية والأجزاء',id);return result;
  }finally{clearTimeout(timeout);this.controllers.delete(controller);engine.maintenance.delete(id);}
 });}
 async close(){this.closed=true;for(const c of this.controllers)c.abort();await Promise.allSettled([...this.jobs]);}
}
module.exports={SmartTools,diagnosis};
