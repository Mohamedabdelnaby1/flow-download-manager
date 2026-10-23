const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {validateURL}=require('./network.cjs');
const isVideoPage=require('../extension/media-model.js').sitePage;
function vendor(name){return path.join(__dirname,'../vendor',name).replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);}
class VideoResolver{
  constructor(store){this.store=store;this.cache=new Map();this.children=new Set();}
  command(url,headers={},extra=[]){
    validateURL(url,['http:','https:']);const exe=vendor('yt-dlp.exe');if(!fs.existsSync(exe))throw Error('محرك المواقع غير موجود؛ استخدم حزمة البرنامج الكاملة');
    const args=['--ignore-config','--no-playlist','--no-color','--socket-timeout','20','--retries','2','--extractor-retries','1','--no-js-runtimes','--js-runtimes','node:'+process.execPath,'--cache-dir',path.join(this.store.dir,'VideoCache')];
    if(headers['user-agent'])args.push('--user-agent',headers['user-agent']);if(headers.referer)args.push('--referer',headers.referer);
    const proxy=this.store.settings.proxy;if(proxy)args.push('--proxy',proxy);
    let cookieFile;
    if(headers.cookie){const host=new URL(url).hostname;cookieFile=path.join(this.store.dir,'video-cookies-'+crypto.randomUUID()+'.txt');const rows=headers.cookie.split(';').map(p=>{const split=p.indexOf('=');return split>0?[host,'FALSE','/','TRUE','0',p.slice(0,split).trim(),p.slice(split+1).trim()].join('\t'):'';}).filter(Boolean);fs.writeFileSync(cookieFile,'# Netscape HTTP Cookie File\n'+rows.join('\n')+'\n',{mode:0o600});args.push('--cookies',cookieFile);}
    const env={...process.env,...(process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})};
    const child=spawn(exe,[...args,...extra,'--',url],{windowsHide:true,env,stdio:['ignore','pipe','pipe']});
    this.children.add(child);child.once('close',()=>{this.children.delete(child);if(cookieFile)try{fs.unlinkSync(cookieFile);}catch{}});child.once('error',()=>{this.children.delete(child);if(cookieFile)try{fs.unlinkSync(cookieFile);}catch{}});return child;
  }
  stop(child){return new Promise(done=>{if(!child.pid){done();return;}if(process.platform==='win32'){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.once('close',done);killer.once('error',()=>{child.kill();done();});}else{child.kill();done();}});}
  async close(){await Promise.all([...this.children].map(child=>this.stop(child)));}
  async inspect(url,headers={}){
    const key=crypto.createHash('sha256').update(url+JSON.stringify(headers)).digest('hex'),cached=this.cache.get(key);if(cached&&Date.now()-cached.time<120000)return cached.value;
    const data=await new Promise((resolve,reject)=>{const p=this.command(url,headers,['--skip-download','--dump-single-json','--no-warnings']);let output='',error='';const timer=setTimeout(()=>{this.stop(p).catch(()=>{});reject(Error('انتهت مهلة قراءة معلومات الفيديو؛ جرّب مرة أخرى'));},90000);p.stdout.on('data',b=>{output+=b;if(output.length>24*1024*1024){this.stop(p).catch(()=>{});reject(Error('معلومات الفيديو أكبر من حد الفحص'));}});p.stderr.on('data',b=>error=(error+b).slice(-3000));p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);if(code!==0){reject(Error(videoError(error)));return;}try{resolve(JSON.parse(output));}catch{reject(Error('تعذر قراءة معلومات الفيديو'));}});});
    if(data.is_drm)throw Error('الفيديو محمي ولا يمكن تنزيله');
    const formats=(data.formats||[]).filter(f=>f.vcodec&&!['none','images'].includes(f.vcodec)&&f.protocol!=='mhtml'&&!f.has_drm&&/^[a-z0-9_.-]{1,80}$/i.test(f.format_id)).map(f=>({id:f.format_id,height:f.height||0,fps:f.fps||0,ext:f.ext,codec:f.vcodec,size:f.filesize||f.filesize_approx||0,note:f.format_note||'',hasAudio:!!f.acodec&&f.acodec!=='none'}));
    const value={video:true,title:data.title||data.id,id:data.id,duration:data.duration||0,formats:formats.sort((a,b)=>b.height-a.height||b.fps-a.fps),extractor:data.extractor_key||data.extractor,type:'video/site',size:0,resumable:true};
    this.cache.set(key,{time:Date.now(),value});if(this.cache.size>50)this.cache.delete(this.cache.keys().next().value);return value;
  }
  async collection(url,limit=100){
    const u=validateURL(url,['https:']);if(!/^(www\.|m\.|music\.)?youtube\.com$/.test(u.hostname)||!u.searchParams.has('list'))throw Error('أدخل رابط قائمة YouTube يحتوي على list=');
    limit=Math.min(200,Math.max(1,Math.trunc(limit)));
    const data=await new Promise((resolve,reject)=>{const p=this.command(url,{},['--yes-playlist','--flat-playlist','--playlist-end',String(limit),'--dump-single-json','--no-warnings']);let output='',error='';const timer=setTimeout(()=>{this.stop(p).catch(()=>{});reject(Error('انتهت مهلة قراءة القائمة'));},90000);p.stdout.on('data',b=>{output+=b;if(output.length>12*1024*1024){this.stop(p).catch(()=>{});reject(Error('القائمة أكبر من حد الفحص'));}});p.stderr.on('data',b=>error=(error+b).slice(-2000));p.once('error',e=>{clearTimeout(timer);reject(e);});p.once('close',code=>{clearTimeout(timer);if(code!==0)return reject(Error(videoError(error)));try{resolve(JSON.parse(output));}catch{reject(Error('تعذر قراءة القائمة'));}});});
    const seen=new Set(),items=[];for(const e of data.entries||[]){if(!/^[a-z0-9_-]{11}$/i.test(e.id||'')||seen.has(e.id)||['private','premium_only','subscriber_only','needs_auth'].includes(e.availability)||/^\[(Private|Deleted) video\]$/i.test(e.title||''))continue;seen.add(e.id);items.push({id:e.id,url:'https://www.youtube.com/watch?v='+e.id,title:String(e.title||e.id).slice(0,300),duration:Number(e.duration)||0});if(items.length>=limit)break;}
    return {title:String(data.title||'YouTube playlist').slice(0,300),items,scanned:(data.entries||[]).length,limit};
  }
  async download(ctx,engine,meta){
    const headers=engine.authHeaders(ctx.item.url,meta),info=await this.inspect(ctx.item.url,headers);if(ctx.stopped)return;
    const quality=meta.quality||'best';if(!/^(best|audio|[a-z0-9_.-]{1,80})$/i.test(quality))throw Error('جودة فيديو غير صالحة');
    const ffmpeg=require('ffmpeg-static').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
    const format=quality==='audio'?'bestaudio/best':/^max(480|720|1080)$/.test(quality)?`bv*[height<=${quality.slice(3)}][ext=mp4]+ba[ext=m4a]/b[height<=${quality.slice(3)}][ext=mp4]/b[height<=${quality.slice(3)}]`:quality==='best'?'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b':info.formats.find(f=>f.id===quality)?.hasAudio?quality:`${quality}+ba/${quality}`;
    const args=['--newline','--progress','--progress-delta','0.25','--no-warnings','--continue','--ffmpeg-location',ffmpeg,'--format',format,'--output',path.join(engine.settings().tempDir,ctx.id+'.%(ext)s'),'--print','after_move:FLOW_FILE:%(filepath)s','--progress-template','download:FLOW_PROGRESS:%(info.format_id)s:%(progress)j'];
    if(quality==='audio')args.push('--extract-audio','--audio-format','mp3');else args.push('--merge-output-format',meta.format==='mkv'?'mkv':'mp4');
    const rate=meta.speedLimit||engine.settings().speedLimit;if(rate)args.push('--limit-rate',rate+'K');
    const title=require('./engine.cjs').fileName(info.title);if(meta.autoName)engine.store.update(ctx.id,{name:title+(quality==='audio'?'.mp3':'.'+(meta.format==='mkv'?'mkv':'mp4'))});
    engine.store.update(ctx.id,{status:'downloading',resumable:true,meta:JSON.stringify({...meta,videoTitle:info.title,videoDuration:info.duration})});
    let outputFile;
    await new Promise((resolve,reject)=>{
      const p=this.command(ctx.item.url,headers,args);ctx.process=p;
      ctx.stopProcess=()=>this.stop(p);
      let line='',error='',lastBytes=ctx.item.downloaded||0;const streams=new Map();
      const consume=value=>{
        if(value.startsWith('FLOW_FILE:')){outputFile=value.slice(10).trim();return;}
        const match=/^FLOW_PROGRESS:([^:]+):(.*)$/.exec(value);if(!match)return;
        try{const progress=JSON.parse(match[2]),old=streams.get(match[1])||{};streams.set(match[1],{bytes:Math.max(old.bytes||0,Number(progress.downloaded_bytes)||0),total:Number(progress.total_bytes||progress.total_bytes_estimate)||0});const downloaded=[...streams.values()].reduce((n,s)=>n+s.bytes,0),total=[...streams.values()].reduce((n,s)=>n+s.total,0);const delta=Math.max(0,downloaded-lastBytes);lastBytes=Math.max(lastBytes,downloaded);engine.usage.bytes+=delta;engine.usage.total+=delta;engine.store.update(ctx.id,{downloaded,size:Math.max(total,downloaded),speed:Number(progress.speed)||0});engine.store.set('usage',engine.usage);if(engine.quotaReached()&&!ctx.stopped)engine.pause(ctx.id,'limited').catch(()=>{});}catch{}
      };
      p.stdout.on('data',b=>{line+=b;let index;while((index=line.indexOf('\n'))>=0){consume(line.slice(0,index).trim());line=line.slice(index+1);}});p.stderr.on('data',b=>error=(error+b).slice(-4000));
      p.on('error',reject);p.on('close',code=>{if(line)consume(line.trim());if(ctx.stopped||code===0)resolve();else reject(Error(videoError(error)));});
    });
    if(ctx.stopped)return;
    if(!outputFile||!path.resolve(outputFile).startsWith(path.resolve(engine.settings().tempDir)+path.sep)||!path.basename(outputFile).startsWith(ctx.id+'.')||!fs.existsSync(outputFile))throw Error('لم يُنتج محرك المواقع ملفًا صالحًا');
    ctx.temp=outputFile;const item=engine.store.find(ctx.id),extension=path.extname(outputFile),name=path.basename(item.name,path.extname(item.name))+extension;engine.store.update(ctx.id,{name});await engine.finish(ctx);
  }
}
function videoError(value){const message=String(value||'').replace(/\x1b\[[0-9;]*m/g,'').trim().slice(-1400);return /sign in|not a bot|cookies|login required/i.test(message)?'الموقع طلب تسجيل دخول أو تحققًا من المتصفح. افتح الفيديو في كروم وأرسله من إضافة Flow؛ قد يظل تحقق الموقع مطلوبًا.\n'+message:/unavailable|private|removed|not available/i.test(message)?'الفيديو غير متاح لهذا الطلب أو محذوف أو خاص.\n'+message:'تعذر استخراج أو تنزيل الفيديو.\n'+message;}
module.exports={VideoResolver,isVideoPage,videoError};
