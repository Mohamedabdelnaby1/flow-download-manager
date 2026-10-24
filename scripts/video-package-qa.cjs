const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFile}=require('node:child_process'),assert=require('node:assert/strict');
module.exports=async({app,service})=>{
 const root=process.env.FLOW_SMOKE_DIR,report={version:app.getVersion(),packaged:app.isPackaged,checks:[],errors:[]},check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
 try{
  service.store.saveSettings({sounds:false,showProgress:false,completionDialog:false,retries:0,downloadDir:path.join(root,'Downloads'),tempDir:path.join(root,'Partial')});
  const tools=service.engine.video.tools;check('distribution contains the bundled extractor',fs.existsSync(tools.bundled));const expected=tools.metadata.sha256;check('bundled extractor has the pinned SHA-256',crypto.createHash('sha256').update(fs.readFileSync(tools.bundled)).digest('hex')===expected);
  const url='https://www.youtube.com/watch?v=peIksHiel34';const info=await service.action('videoInfo',{url});report.video={url,title:info.title,durationSeconds:info.duration,formatCount:info.formats.length};check('exact user video metadata and quality options are extracted',!!info.title&&info.formats.length>0);
  const started=Date.now(),d=await service.action('add',{url,quality:'max480',later:true});await service.engine.start(d.id);const result=service.store.find(d.id);report.video.status=result.status;report.video.elapsedMs=Date.now()-started;if(result.status!=='complete')throw Error(result.error||'Download did not complete');
  const file=JSON.parse(result.meta).filePath;report.video.bytes=fs.statSync(file).size;report.video.sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');check('exact user video fully downloads as a nonempty MP4',path.extname(file)==='.mp4'&&report.video.bytes>10000);
  const ffmpeg=require(path.join(app.getAppPath(),'node_modules/ffmpeg-static')).replace(/app\.asar([\\/])/,'app.asar.unpacked$1');await new Promise((resolve,reject)=>execFile(ffmpeg,['-v','error','-i',file,'-f','null','-'],{windowsHide:true,timeout:180000,maxBuffer:1024*1024},(error,_out,stderr)=>error?reject(Error(stderr||error.message)):resolve()));check('downloaded MP4 fully decodes with FFmpeg',true);
  tools.ready=null;tools.bundled=path.join(root,'simulate-missing-extractor.exe');const repaired=await tools.ensure();check('missing extractor restores to the profile from the official release',repaired===tools.cached()&&fs.existsSync(repaired));check('restored extractor matches the pinned SHA-256',crypto.createHash('sha256').update(fs.readFileSync(repaired)).digest('hex')===expected);
  for(const event of ['complete','error','queue']){const p=require(path.join(app.getAppPath(),'src/sounds.cjs')).soundPath('',event);check('packaged '+event+' sound exists outside ASAR',p.includes('app.asar.unpacked')&&fs.existsSync(p));await service.action('playSound',{event});check('packaged '+event+' sound playback completes',true);}
 }catch(error){report.errors.push(error.stack);}finally{report.passed=report.checks.length;fs.writeFileSync(path.join(root,'video-package-qa.json'),JSON.stringify(report,null,2));}
 if(report.errors.length)throw Error(report.errors.join('\n'));
};

