const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function unpacked(file){return file.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');}
class VideoTools{
 constructor(dir,options={}){this.dir=dir;this.platform=options.platform||process.platform;this.asset=this.platform==='linux'?'yt-dlp_linux':'yt-dlp.exe';this.bundled=options.bundled||unpacked(path.join(__dirname,'../vendor',this.asset));this.metadata=options.metadata||require(this.platform==='linux'?'../vendor/yt-dlp-linux.json':'../vendor/yt-dlp.json');this.fetch=options.fetch||globalThis.fetch;this.controller=null;this.pending=null;this.ready=null;}
 cached(){return path.join(this.dir,'Tools','yt-dlp-'+this.metadata.version+(this.platform==='linux'?'-linux':'.exe'));}
 available(){return fs.existsSync(this.bundled)||fs.existsSync(this.cached());}
 async ensure({signal}={}){
  signal?.throwIfAborted();if(this.ready&&fs.existsSync(this.ready))return this.ready;
  if(!this.pending)this.pending=this.prepare().finally(()=>{this.pending=null;});
  if(!signal)return this.pending;
  return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||Error('Cancelled'));signal.addEventListener('abort',abort,{once:true});this.pending.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));if(signal.aborted)abort();});
 }
 async prepare(){
  const {version,url,sha256}=this.metadata;
  if(!/^[\d.]+$/.test(version)||url!==`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${this.asset}`||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Video tool metadata is invalid');
  for(const candidate of [this.bundled,this.cached()])if(fs.existsSync(candidate)&&digest(candidate)===sha256){this.ready=candidate;return candidate;}
  this.controller=new AbortController();const timeout=setTimeout(()=>this.controller?.abort(Error('Video tool repair timed out; check your connection and retry.')),600000);timeout.unref();
  const target=this.cached(),temp=target+'.'+crypto.randomUUID()+'.part';let handle;
  try{
   fs.mkdirSync(path.dirname(target),{recursive:true});
   // Fixed official release URL, no browser cookies, stored request headers or credentials.
   const response=await this.fetch(url,{signal:this.controller.signal,headers:{accept:'application/octet-stream'},credentials:'omit'});
   if(!response.ok||!response.body)throw Error('Cannot restore the video extractor (HTTP '+response.status+'). Check your connection and retry.');
   const hash=crypto.createHash('sha256');let length=0;handle=fs.openSync(temp,'wx',0o600);
   for await(const chunk of response.body){const bytes=Buffer.from(chunk);length+=bytes.length;if(length>50*1024*1024)throw Error('Video tool exceeds the expected size.');hash.update(bytes);let offset=0;while(offset<bytes.length)offset+=fs.writeSync(handle,bytes,offset,bytes.length-offset);}
   fs.closeSync(handle);handle=undefined;
   if(hash.digest('hex')!==sha256)throw Error('Video extractor verification failed. No unverified executable was installed.');
   if(this.platform==='linux')fs.chmodSync(temp,0o700);fs.renameSync(temp,target);this.ready=target;return target;
  }finally{clearTimeout(timeout);this.controller=null;if(handle!==undefined)fs.closeSync(handle);try{fs.unlinkSync(temp);}catch{}}
 }
 close(){this.controller?.abort(Error('Flow is closing'));}
}
module.exports={VideoTools,unpacked};

