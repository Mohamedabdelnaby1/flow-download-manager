const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const formats={mp3:['-vn','-c:a','libmp3lame','-b:a','192k'],m4a:['-vn','-c:a','aac','-b:a','192k'],mp4:['-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-b:a','160k','-movflags','+faststart'],webm:['-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','5','-c:a','libopus']};
function ffmpegPath(){return require('ffmpeg-static').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);}
class Workshop{
 constructor(service){this.service=service;this.active=null;this.closed=false;this.jobs=service.store.get('mediaJobs',[]).slice(-100).map(raw=>{const j={...raw,seconds:Number(raw.seconds)||0,progress:Number(raw.progress)||0};
  if(!['queued','running'].includes(j.status))return j;
  const directory=j.input&&path.join(path.dirname(j.input),'Converted');
  if(directory&&/^[a-f0-9-]{36}$/i.test(j.id)&&formats[j.format]&&j.temp&&j.output&&path.dirname(j.output)===directory&&path.dirname(j.temp)===directory&&path.basename(j.temp)===`.flow-${j.id}.${j.format}`){
   try{fs.unlinkSync(j.temp);}catch{}try{if(fs.statSync(j.output).size===0)fs.unlinkSync(j.output);}catch{}
  }
  return {...j,status:'interrupted',error:'انقطع التشغيل؛ أعد المهمة عند الحاجة'};
 });this.save();}
 save(){this.jobs=this.jobs.slice(-100);this.service.store.set('mediaJobs',this.jobs);}
 list(){return this.jobs.map(({input,temp,...rest})=>rest).reverse();}
 start(data){
  if(this.closed||this.active)throw Error('انتظر انتهاء المعالجة الحالية أو ألغِها');
  const d=this.service.store.find(data.id),meta=d&&JSON.parse(d.meta);if(!d||d.status!=='complete'||!meta.filePath||!fs.existsSync(meta.filePath))throw Error('اختر ملف صوت أو فيديو مكتملًا وموجودًا');
  if(!formats[data.format])throw Error('صيغة غير مدعومة');
  const start=Number(data.start)||0,end=Number(data.end)||0;if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<0||end&&end<=start)throw Error('وقت القص غير صالح');
  const height=Number(data.height)||0;if(height&&![360,480,720,1080].includes(height))throw Error('دقة غير صالحة');
  const id=crypto.randomUUID(),directory=path.join(path.dirname(meta.filePath),'Converted'),name=path.basename(d.name,path.extname(d.name)).slice(0,130)+'-converted';
  fs.mkdirSync(directory,{recursive:true});let output=path.join(directory,name+'.'+data.format),index=1;
  while(fs.existsSync(output))output=path.join(directory,name+' ('+index+++').'+data.format);
  // Reserve a new output path; originals and previously converted files are never overwritten.
  fs.closeSync(fs.openSync(output,'wx'));const temp=path.join(directory,'.flow-'+id+'.'+data.format),job={id,sourceId:d.id,name:path.basename(output),format:data.format,input:meta.filePath,output,temp,status:'running',seconds:0,progress:0,start,end,height,createdAt:new Date().toISOString(),error:''};
  const args=['-hide_banner','-nostdin','-y'];if(start)args.push('-ss',String(start));args.push('-protocol_whitelist','file,pipe','-i',meta.filePath);if(end)args.push('-t',String(end-start));args.push(...formats[data.format]);if(height&&['mp4','webm'].includes(data.format))args.push('-vf',`scale=-2:min(${height}\\,ih)`);args.push('-progress','pipe:1','-nostats',temp);
  const child=spawn(ffmpegPath(),args,{windowsHide:true,stdio:['ignore','pipe','pipe']}),ctx={job,child,promise:null,cancelled:false};this.active=ctx;this.jobs.push(job);this.save();
  let line='',error='',duration=0;const consume=s=>{const [key,value]=s.trim().split('=');if(key==='out_time_us'){const seconds=Number(value)/1000000;if(!Number.isFinite(seconds))return;job.seconds=Math.max(0,seconds);const total=end?end-start:duration?duration-start:0;job.progress=total?Math.min(99,100*job.seconds/total):0;}};
  child.stdout.on('data',b=>{line+=b;let n;while((n=line.indexOf('\n'))>=0){consume(line.slice(0,n));line=line.slice(n+1);}});child.stderr.on('data',b=>{error=(error+b).slice(-6000);const m=/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(error);if(m)duration=+m[1]*3600 + +m[2]*60 + +m[3];});
  ctx.promise=new Promise(resolve=>{let finalized=false;const finish=(code,err)=>{if(finalized)return;finalized=true;
   try{if(ctx.cancelled){job.status='cancelled';}else if(err||code!==0){job.status='error';job.error=String(err?.message||error||'فشلت المعالجة').slice(-1600);}else if(job.seconds>0&&fs.existsSync(temp)&&fs.statSync(temp).size){if(fs.existsSync(output)&&fs.statSync(output).size!==0)throw Error('تغير ملف الإخراج أثناء المعالجة؛ تم الحفاظ عليه');fs.renameSync(temp,output);job.status='complete';job.progress=100;job.bytes=fs.statSync(output).size;}else{job.status='error';job.error='لم تُنتج المعالجة ملفًا صالحًا';}
   }catch(e){job.status='error';job.error=e.message;}
   if(job.status!=='complete'){try{fs.unlinkSync(temp);}catch{}try{if(fs.statSync(output).size===0)fs.unlinkSync(output);}catch{}}
   job.finishedAt=new Date().toISOString();this.active=null;this.save();resolve(job);
  };child.on('error',e=>finish(-1,e));child.on('close',code=>finish(code));});return {id};
 }
 async cancel(id){const c=this.active;if(!c||c.job.id!==id)return false;c.cancelled=true;c.child.kill();await c.promise;return true;}
 async close(){this.closed=true;if(this.active)await this.cancel(this.active.job.id);}
}
module.exports={Workshop,formats,ffmpegPath};
