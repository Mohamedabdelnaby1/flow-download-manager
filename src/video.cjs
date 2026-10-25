const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {validateURL}=require('./network.cjs');
const isVideoPage=require('../extension/media-model.js').sitePage;
const {VideoTools}=require('./video-tools.cjs');
class VideoResolver{
  constructor(store){this.store=store;this.cache=new Map();this.pending=new Map();this.children=new Set();this.tools=new VideoTools(store.dir);}
  async command(url,headers={},extra=[],options={}){
    validateURL(url,['http:','https:']);const exe=await this.tools.ensure(options);
    const args=['--ignore-config','--no-playlist','--no-color','--socket-timeout','20','--retries','2','--extractor-retries','1','--no-js-runtimes','--js-runtimes','node:'+process.execPath,'--cache-dir',path.join(this.store.dir,'VideoCache')];
    if(headers['user-agent'])args.push('--user-agent',headers['user-agent']);if(headers.referer)args.push('--referer',headers.referer);
    const proxy=this.store.settings.proxy;if(proxy)args.push('--proxy',proxy);
    let cookieFile;
    if(headers.cookie){const host=new URL(url).hostname;cookieFile=path.join(this.store.dir,'video-cookies-'+crypto.randomUUID()+'.txt');const rows=headers.cookie.split(';').map(p=>{const split=p.indexOf('=');return split>0?[host,'FALSE','/','TRUE','0',p.slice(0,split).trim(),p.slice(split+1).trim()].join('\t'):'';}).filter(Boolean);fs.writeFileSync(cookieFile,'# Netscape HTTP Cookie File\n'+rows.join('\n')+'\n',{mode:0o600});args.push('--cookies',cookieFile);}
    const env={...process.env,...(process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})};
    // Reuse fresh extraction in memory. No signed URLs or session metadata are written to disk.
    const child=spawn(exe,[...args,...extra,...(options.info?['--load-info-json','-']:['--',canonicalURL(url)])],{windowsHide:true,env,stdio:[options.info?'pipe':'ignore','pipe','pipe']});
    if(options.info){child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(options.info));}
    this.children.add(child);child.once('close',()=>{this.children.delete(child);if(cookieFile)try{fs.unlinkSync(cookieFile);}catch{}});child.once('error',()=>{this.children.delete(child);if(cookieFile)try{fs.unlinkSync(cookieFile);}catch{}});return child;
  }
  stop(child){return new Promise(done=>{if(!child.pid){done();return;}if(process.platform==='win32'){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.once('close',done);killer.once('error',()=>{child.kill();done();});}else{child.kill();done();}});}
  async close(){this.tools.close();for(const job of this.pending.values())job.controller.abort();this.cache.clear();await Promise.all([...this.children].map(child=>this.stop(child)));}
  async json(url,headers,args,{signal,timeout=90000,max=24*1024*1024}={}){
    if(signal?.aborted)throw signal.reason||Error('Cancelled');
    const p=await this.command(url,headers,args,{signal});
    if(signal?.aborted){await this.stop(p);throw signal.reason||Error('Cancelled');}
    return new Promise((resolve,reject)=>{
      let output='',error='',settled=false;
      const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(err){this.stop(p).catch(()=>{});reject(err);}else resolve(value);};
      const abort=()=>finish(signal.reason||Error('Cancelled'));
      const timer=setTimeout(()=>finish(Error('انتهت مهلة قراءة معلومات الموقع؛ جرّب مرة أخرى')),timeout);
      signal?.addEventListener('abort',abort,{once:true});
      p.stdout.on('data',b=>{if(settled)return;output+=b;if(Buffer.byteLength(output)>max)finish(Error('معلومات الموقع أكبر من حد الفحص'));});
      p.stderr.on('data',b=>error=(error+b).slice(-3000));
      p.once('error',e=>finish(e));p.once('close',code=>{if(settled)return;if(code!==0)return finish(Error(videoError(error)));try{finish(null,JSON.parse(output));}catch{finish(Error('تعذر قراءة معلومات الموقع'));}});
    });
  }
  key(url,headers){return crypto.createHash('sha256').update(canonicalURL(url)+JSON.stringify(Object.entries(headers).sort(([a],[b])=>a.localeCompare(b)))+String(this.store.settings.proxy||'')).digest('hex');}
  async resolve(url,headers={},options={}){
    if(options.signal?.aborted)throw options.signal.reason||Error('Cancelled');
    const key=this.key(url,headers),cached=this.cache.get(key);if(cached&&Date.now()-cached.time<60000)return cached;
    let job=this.pending.get(key);
    if(!job){const controller=new AbortController();job={controller,users:0};job.promise=this.extract(url,headers,{...options,signal:controller.signal,timeout:45000}).then(result=>{this.cache.set(key,result);while(this.cache.size>8||[...this.cache.values()].reduce((n,v)=>n+v.bytes,0)>32*1024*1024)this.cache.delete(this.cache.keys().next().value);return result;}).finally(()=>{if(this.pending.get(key)===job)this.pending.delete(key);});this.pending.set(key,job);}
    job.users++;
    return new Promise((resolve,reject)=>{let done=false;const finish=(error,value)=>{if(done)return;done=true;options.signal?.removeEventListener('abort',abort);if(--job.users===0&&this.pending.get(key)===job){this.pending.delete(key);job.controller.abort();}error?reject(error):resolve(value);};const abort=()=>finish(options.signal.reason||Error('Cancelled'));options.signal?.addEventListener('abort',abort,{once:true});job.promise.then(value=>finish(null,value),finish);if(options.signal?.aborted)abort();});
  }
  async inspect(url,headers={},options={}){return (await this.resolve(url,headers,options)).value;}
  async extract(url,headers,options){
    const data=await this.json(canonicalURL(url),headers,['--skip-download','--dump-single-json','--no-warnings','--no-write-comments'],options);
    if(data.is_drm)throw Error('الفيديو محمي ولا يمكن تنزيله');
    const formats=(data.formats||[]).filter(f=>f.vcodec&&!['none','images'].includes(f.vcodec)&&f.protocol!=='mhtml'&&!f.has_drm&&/^[a-z0-9_.-]{1,80}$/i.test(f.format_id)).map(f=>({id:f.format_id,height:f.height||0,fps:f.fps||0,ext:f.ext,codec:f.vcodec,size:f.filesize||f.filesize_approx||0,note:f.format_note||'',hasAudio:!!f.acodec&&f.acodec!=='none'}));
    const value={video:true,title:data.title||data.id,id:data.id,duration:data.duration||0,formats:formats.sort((a,b)=>b.height-a.height||b.fps-a.fps),extractor:data.extractor_key||data.extractor,type:'video/site',size:0,resumable:true};
    return {time:Date.now(),value,data,bytes:Buffer.byteLength(JSON.stringify(data))};
  }
  async collection(url,limit=10000,options={}){
    const u=validateURL(url,['https:']);if(!isPlaylist(u.href))throw Error('أدخل رابط قائمة YouTube يحتوي على list=');
    limit=Math.min(10000,Math.max(1,Math.trunc(Number(limit)||10000)));
    const canonical='https://www.youtube.com/playlist?list='+encodeURIComponent(u.searchParams.get('list'));
    // Fetch one extra entry so large playlists never appear silently complete.
    const data=await this.json(canonical,{},['--yes-playlist','--flat-playlist','--playlist-end',String(limit+1),'--dump-single-json','--no-warnings'],{...options,timeout:300000,max:48*1024*1024});
    const entries=Array.isArray(data.entries)?data.entries:[],seen=new Set(),items=[];
    for(const [i,e]of entries.slice(0,limit).entries()){
      if(!e||!/^[a-z0-9_-]{11}$/i.test(e.id||'')||seen.has(e.id)||['private','premium_only','subscriber_only','needs_auth'].includes(e.availability)||/^\[(Private|Deleted) video\]$/i.test(e.title||''))continue;
      seen.add(e.id);items.push({id:e.id,url:'https://www.youtube.com/watch?v='+e.id,title:String(e.title||e.id).slice(0,300),duration:Number(e.duration)||0,index:i+1});
    }
    return {title:String(data.title||'YouTube playlist').slice(0,300),items,scanned:Math.min(entries.length,limit),skipped:Math.min(entries.length,limit)-items.length,truncated:entries.length>limit,limit,url:canonical};
  }
  async download(ctx,engine,meta){
    const headers=engine.authHeaders(ctx.item.url,meta),controller=new AbortController();ctx.controllers.add(controller);let resolved;try{resolved=await this.resolve(ctx.item.url,headers,{signal:controller.signal});}finally{ctx.controllers.delete(controller);}if(ctx.stopped)return;const info=resolved.value;
    const quality=meta.quality||'best';if(!/^(best|audio|[a-z0-9_.-]{1,80})$/i.test(quality))throw Error('جودة فيديو غير صالحة');
    const ffmpeg=require('ffmpeg-static').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
    const format=quality==='audio'?'bestaudio/best':/^max(480|720|1080)$/.test(quality)?`bv*[height<=${quality.slice(3)}][ext=mp4]+ba[ext=m4a]/b[height<=${quality.slice(3)}][ext=mp4]/b[height<=${quality.slice(3)}]/b[ext=mp4]/b`:quality==='best'?'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b':info.formats.find(f=>f.id===quality)?.hasAudio?quality:`${quality}+ba/${quality}`;
    const args=['--newline','--progress','--progress-delta','0.25','--no-simulate','--no-warnings','--continue','--concurrent-fragments',String(Math.max(1,Math.min(4,engine.settings().connections))),'--fragment-retries','5','--abort-on-unavailable-fragments','--http-chunk-size','10M','--ffmpeg-location',ffmpeg,'--format',format,'--output',path.join(engine.settings().tempDir,ctx.id+'.%(ext)s'),'--print','post_process:FLOW_PROCESS','--print','after_move:FLOW_FILE:%(filepath)s','--progress-template','download:FLOW_PROGRESS:%(info.format_id)s:%(progress)j'];
    if(quality==='audio')args.push('--extract-audio','--audio-format','mp3');else args.push('--merge-output-format',meta.format==='mkv'?'mkv':'mp4');
    const rate=meta.speedLimit||engine.settings().speedLimit;if(rate)args.push('--limit-rate',rate+'K');
    const title=require('./engine.cjs').fileName(info.title);if(meta.autoName)engine.store.update(ctx.id,{name:title+(quality==='audio'?'.mp3':'.'+(meta.format==='mkv'?'mkv':'mp4'))});
    engine.store.update(ctx.id,{status:'probing',resumable:true,meta:JSON.stringify({...meta,videoTitle:info.title,videoDuration:info.duration})});
    let outputFile;const p=await this.command(ctx.item.url,headers,args,{info:resolved.data});ctx.process=p;ctx.stopProcess=()=>this.stop(p);
    if(ctx.stopped){await this.stop(p);return;}
    await new Promise((resolve,reject)=>{
      let line='',error='',lastBytes=ctx.item.downloaded||0,lastActivity=Date.now(),timedOut=false;const streams=new Map(),samples=[];const watchdog=setInterval(()=>{if(!ctx.stopped&&Date.now()-lastActivity>120000){timedOut=true;this.stop(p).catch(()=>{});}else if(!ctx.stopped&&Date.now()-lastActivity>3000)engine.store.update(ctx.id,{speed:0});},1000);watchdog.unref();
      const consume=value=>{
        if(value.startsWith('FLOW_FILE:')){outputFile=value.slice(10).trim();return;}
        if(value==='FLOW_PROCESS'){lastActivity=Date.now();engine.store.update(ctx.id,{status:'processing',speed:0});return;}
        const match=/^FLOW_PROGRESS:([^:]+):(.*)$/.exec(value);if(!match)return;
        try{const progress=JSON.parse(match[2]),old=streams.get(match[1])||{};streams.set(match[1],{bytes:Math.max(old.bytes||0,Number(progress.downloaded_bytes)||0),total:Number(progress.total_bytes||progress.total_bytes_estimate)||old.total||0});const downloaded=[...streams.values()].reduce((n,s)=>n+s.bytes,0),total=[...streams.values()].reduce((n,s)=>n+s.total,0),now=Date.now();const delta=Math.max(0,downloaded-lastBytes);if(delta>0||progress.status==='finished')lastActivity=now;lastBytes=Math.max(lastBytes,downloaded);samples.push({time:now,bytes:downloaded});while(samples.length>2&&samples[1].time<now-3000)samples.shift();const measured=samples.length>1?(downloaded-samples[0].bytes)/Math.max(.001,(now-samples[0].time)/1000):0;ctx.received=downloaded;ctx.speed=Number(progress.speed)>0?Number(progress.speed):measured;engine.usage.bytes+=delta;engine.usage.total+=delta;engine.store.update(ctx.id,{status:'downloading',downloaded:Math.max(ctx.item.downloaded||0,downloaded),size:Math.max(total,downloaded),speed:ctx.speed});engine.store.set('usage',engine.usage);if(engine.quotaReached()&&!ctx.stopped)engine.pause(ctx.id,'limited').catch(()=>{});}catch{}
      };
      p.stdout.on('data',b=>{line+=b;let index;while((index=line.indexOf('\n'))>=0){consume(line.slice(0,index).trim());line=line.slice(index+1);}});p.stderr.on('data',b=>error=(error+b).slice(-4000));
      p.on('error',e=>{clearInterval(watchdog);reject(e);});p.on('close',code=>{clearInterval(watchdog);if(line)consume(line.trim());if(ctx.stopped)resolve();else if(timedOut)reject(Error('انتهت مهلة تنزيل الفيديو دون تقدم؛ أعد المحاولة أو حدّث الرابط'));else if(code===0)resolve();else reject(Error(videoError(error)));});
    });
    if(ctx.stopped)return;
    if(!outputFile||!path.resolve(outputFile).startsWith(path.resolve(engine.settings().tempDir)+path.sep)||!path.basename(outputFile).startsWith(ctx.id+'.')||!fs.existsSync(outputFile))throw Error('لم يُنتج محرك المواقع ملفًا صالحًا');
    ctx.temp=outputFile;const item=engine.store.find(ctx.id),extension=path.extname(outputFile),name=path.basename(item.name,path.extname(item.name))+extension;engine.store.update(ctx.id,{name});await engine.finish(ctx);
  }
}
function canonicalURL(value){const u=validateURL(value,['http:','https:']);if(/(^|\.)youtube\.com$/.test(u.hostname)&&u.searchParams.get('v'))return 'https://www.youtube.com/watch?v='+encodeURIComponent(u.searchParams.get('v'));if(u.hostname==='youtu.be')return 'https://www.youtube.com/watch?v='+encodeURIComponent(u.pathname.slice(1));if(/(^|\.)facebook\.com$/.test(u.hostname)){for(const name of [...u.searchParams.keys()])if(name.startsWith('__')||['fbclid','mibextid','ref','refsrc'].includes(name))u.searchParams.delete(name);}u.hash='';return u.href;}
function videoError(value){const message=String(value||'').replace(/\x1b\[[0-9;]*m/g,'').trim().slice(-1400);return /Requested format is not available/i.test(message)?'This video quality is unavailable. Choose Best available and try again.\n'+message:/sign in|not a bot|cookies|login required/i.test(message)?'الموقع طلب تسجيل دخول أو تحققًا من المتصفح. افتح الفيديو في كروم وأرسله من إضافة Flow؛ قد يظل تحقق الموقع مطلوبًا.\n'+message:/unavailable|private|removed|not available/i.test(message)?'الفيديو غير متاح لهذا الطلب أو محذوف أو خاص.\n'+message:'تعذر استخراج أو تنزيل الفيديو.\n'+message;}
function isPlaylist(value){try{const u=new URL(value);return /^(www\.|m\.|music\.)?youtube\.com$/.test(u.hostname)&&!!u.searchParams.get('list')&&(u.pathname==='/playlist'||!u.searchParams.get('v')&&u.pathname==='/watch');}catch{return false;}}
module.exports={VideoResolver,isVideoPage,isPlaylist,videoError,canonicalURL};
