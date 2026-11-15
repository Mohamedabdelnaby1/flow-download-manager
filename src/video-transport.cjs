const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {configuredConnections}=require('./transfer-policy.cjs');
let verified;
async function parallelTransport(engine,ctx){
 const connections=Math.min(16,configuredConnections(engine.settings(),new URL(ctx.item.url).hostname));
 if(connections<2)return null;
 const binary=path.join(__dirname,'../vendor/aria2',process.platform==='win32'?'aria2c.exe':'aria2c').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
 if(!fs.existsSync(binary))return null;
 const stat=fs.statSync(binary),identity=binary+':'+stat.size+':'+stat.mtimeMs;
 if(process.platform==='win32'&&verified!==identity){if(crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex')!==require('../vendor/aria2/PROVENANCE.json').binarySHA256)throw Error('Video transfer engine verification failed. Repair Flow.');verified=identity;}
 const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 const secret=crypto.randomBytes(24).toString('hex'),origin='http://127.0.0.1:'+port+'/jsonrpc';
 const rpc=async(method,params=[])=>{const response=await fetch(origin,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:['token:'+secret,...params]}),signal:AbortSignal.timeout(900)});const value=await response.json();if(value.error)throw Error(value.error.message||'Video transfer status unavailable');return value.result;};
 return {connections,args:['--downloader',binary,'--downloader','dash,m3u8:native','--downloader-args','aria2c:'+['--split='+connections,'--max-connection-per-server='+connections,'--max-concurrent-downloads=1','--min-split-size=1M','--enable-rpc=true','--rpc-listen-all=false','--rpc-listen-port='+port,'--rpc-secret='+secret,'--console-log-level=error','--summary-interval=0','--max-tries=4','--retry-wait=2','--connect-timeout=15','--timeout=30'].join(' ')],
  async progress(){const keys=['status','errorMessage','completedLength','totalLength','downloadSpeed','connections','files','bitfield','numPieces'],active=await rpc('aria2.tellActive',[keys]),stopped=await rpc('aria2.tellStopped',[0,10,keys]);const own=items=>items.filter(item=>path.basename(item.files?.[0]?.path||'').startsWith(ctx.id+'.'));
   if(!active.length&&own(stopped).length){const failure=own(stopped).find(item=>item.status==='error');if(failure)this.error=failure.errorMessage||'The video source refused the transfer.';await rpc('aria2.shutdown');}
   return own([...active,...stopped]).flatMap(item=>{const name=path.basename(item.files?.[0]?.path||''),format=name.slice(ctx.id.length+1).replace(/\.[^.]+(?:\.part)?$/,'');if(!/^[a-z0-9_.+-]{1,100}$/i.test(format))return [];const bits=String(item.bitfield||''),count=Math.min(1048576,Number(item.numPieces)||0),blocks=count&&/^[a-f0-9]+$/i.test(bits)?Array.from({length:Math.min(64,count)},(_,i)=>{const a=Math.floor(i*count/Math.min(64,count)),b=Math.floor((i+1)*count/Math.min(64,count));let done=0;for(let n=a;n<b;n++)if((parseInt(bits[Math.floor(n/4)]||'0',16)>>(3-n%4))&1)done++;return done/Math.max(1,b-a);}):[];return [{id:format,blocks,downloaded_bytes:Number(item.completedLength)||0,total_bytes:Number(item.totalLength)||0,speed:Number(item.downloadSpeed)||0,connections:Number(item.connections)||0,status:item.status==='complete'?'finished':'downloading'}];});}
 };
}
module.exports={parallelTransport};
