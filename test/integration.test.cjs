const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {Service}=require('../src/service.cjs');
const {Store}=require('../src/store.cjs');
const {createServer}=require('../src/server.cjs');
const {fileName}=require('../src/engine.cjs');
const {probe,zipPreview}=require('../src/network.cjs');
const root=path.join(require('node:os').tmpdir(),'flow-tests/tests-'+Date.now());fs.mkdirSync(root,{recursive:true});
const body=Buffer.alloc(6*1024*1024);for(let i=0;i<body.length;i++)body[i]=(i*37+19)%251;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let fixture,origin,version='"fixture-v1"',ranges=[],failOnce=false;
const services=[];
function service(label){const s=new Service(path.join(root,label));s.store.saveSettings({connections:6,simultaneous:3,retryDelay:.1,retries:2,completionDialog:false});services.push(s);return s;}
async function until(fn,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){const result=fn();if(result)return result;await wait(40);}throw Error('Timed out waiting for expected state');}
async function complete(s,id){return until(()=>{const d=s.store.find(id);if(d.status==='error')throw Error(d.error);return d.status==='complete'?d:null;});}
function archive(){const name=Buffer.from('folder/hello.txt'),data=Buffer.from('hello'),central=Buffer.alloc(46+name.length);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);name.copy(central,46);const local=Buffer.alloc(30+name.length);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(name.length,26);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);name.copy(local,30);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(local.length+data.length,16);return Buffer.concat([local,data,central,end]);}
before(async()=>{
  fixture=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/redirect'){res.writeHead(302,{location:'/file.bin'});res.end();return;}
    if(u.pathname==='/site/index.html'){res.setHeader('content-type','text/html');res.end('<html><title>Local fixture</title><a href="child.html">child</a><a href="/tiny.pdf">file</a><img src="image.png"></html>');return;}
    if(u.pathname==='/site/child.html'){res.setHeader('content-type','text/html');res.end('<html><a href="index.html">home</a></html>');return;}
    const mediaPath=path.join(root,'media',path.basename(u.pathname));
    let bytes=u.pathname==='/archive.zip'?archive():u.pathname.startsWith('/tiny')?body.subarray(0,32768):u.pathname==='/site/image.png'?Buffer.from('image-fixture'):u.pathname.startsWith('/media/')&&fs.existsSync(mediaPath)?fs.readFileSync(mediaPath):body;
    if(u.pathname==='/auth'&&req.headers.authorization!=='Basic '+Buffer.from('test:pass').toString('base64')){res.writeHead(401);res.end();return;}
    const headers={'content-type':u.pathname.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'application/octet-stream',etag:version,'last-modified':'Fri, 01 Jan 2021 00:00:00 GMT'};
    if(u.pathname==='/named')headers['content-disposition']="attachment; filename*=UTF-8''"+encodeURIComponent('تقرير.pdf');
    let start=0,end=bytes.length-1,status=200;
    const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
    if(match&&u.pathname!=='/no-range'&&u.pathname!=='/unknown'){
      start=Number(match[1]);end=Math.min(Number(match[2]||end),end);status=206;headers['content-range']=`bytes ${start}-${end}/${bytes.length}`;headers['accept-ranges']='bytes';ranges.push({start,end,path:u.pathname});
      if(u.pathname==='/bad-range'&&end>start)headers['content-range']=`bytes ${start+1}-${end}/${bytes.length}`;
    }
    if(u.pathname!=='/unknown')headers['content-length']=end-start+1;
    res.writeHead(status,headers);
    if(u.pathname==='/retry'&&end>start&&failOnce){failOnce=false;res.write(bytes.subarray(start,start+1000));setTimeout(()=>res.destroy(),3);return;}
    if(bytes.length<65536||end===start){res.end(bytes.subarray(start,end+1));return;}
    let offset=start;const timer=setInterval(()=>{if(offset>end){clearInterval(timer);res.end();return;}const next=Math.min(end+1,offset+32768);res.write(bytes.subarray(offset,next));offset=next;},3);res.on('close',()=>clearInterval(timer));
  });
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${fixture.address().port}`;
});
after(async()=>{for(const s of services)await s.close();fixture.closeAllConnections();await new Promise(r=>fixture.close(r));require('realm').shutdown();});
test('Realm persists encrypted data, settings, and encrypted site credentials',async()=>{
  const dir=path.join(root,'persistence');let s=new Store(dir);s.saveSettings({connections:16});s.saveLogin({host:'example.com',username:'alice',password:'secret-password'});s.add({url:origin+'/file.bin',name:'محاضرة.bin',category:'other',status:'paused'});s.close();
  s=new Store(dir);assert.equal(s.settings.connections,16);assert.equal(s.list()[0].name,'محاضرة.bin');assert.equal(s.auth('example.com').password,'secret-password');assert.equal(fs.readFileSync(path.join(dir,'flow.realm')).includes(Buffer.from('secret-password')),false);assert.equal(JSON.stringify(s.logins()).includes('secret-password'),false);s.close();
});
test('dynamic range splitting produces a byte-identical file and SHA-256',async()=>{
  ranges=[];const s=service('segmented');const d=await s.action('add',{url:origin+'/file.bin'});const done=await complete(s,d.id);const meta=JSON.parse(done.meta);assert.equal(hash(fs.readFileSync(meta.filePath)),hash(body));assert.equal(meta.sha256,hash(body));assert.ok(done.segments.length>=4);assert.equal(done.downloaded,body.length);assert.ok(ranges.some(r=>r.start>0));
  const sorted=[...done.segments].sort((a,b)=>a.start-b.start);assert.equal(sorted[0].start,0);assert.equal(sorted.at(-1).end,body.length);for(let i=1;i<sorted.length;i++)assert.equal(sorted[i-1].end,sorted[i].start);
});
test('pause, close Realm, restart and resume use saved byte offsets',async()=>{
  const dir=path.join(root,'resume');let s=new Service(dir);s.store.saveSettings({connections:3,speedLimit:1024});const d=await s.action('add',{url:origin+'/file.bin'});await until(()=>s.store.find(d.id).downloaded>100000);await s.action('pause',{id:d.id});const at=s.store.find(d.id).downloaded;assert.ok(at>0&&at<body.length);await s.close();
  s=new Service(dir);services.push(s);s.store.saveSettings({speedLimit:0});assert.equal(s.store.find(d.id).status,'paused');assert.equal(s.store.find(d.id).downloaded,at);await s.action('start',{id:d.id});const done=await complete(s,d.id);assert.equal(hash(fs.readFileSync(JSON.parse(done.meta).filePath)),hash(body));
});
test('changed ETag is refused during resume without destroying partial progress',async()=>{
  version='"fixture-v1"';const s=service('identity');s.store.saveSettings({speedLimit:1024});const d=await s.action('add',{url:origin+'/file.bin'});await until(()=>s.store.find(d.id).downloaded>50000);await s.action('pause',{id:d.id});const at=s.store.find(d.id).downloaded;version='"fixture-v2"';await s.action('start',{id:d.id});await until(()=>s.store.find(d.id).status==='error');assert.match(s.store.find(d.id).error,/تغير/);assert.equal(s.store.find(d.id).downloaded,at);version='"fixture-v1"';
});
test('servers without ranges and unknown content length finish correctly',async()=>{
  const s=service('fallback');for(const route of ['/no-range','/unknown']){const d=await s.action('add',{url:origin+route});const done=await complete(s,d.id);assert.equal(done.resumable,false);assert.equal(done.size,body.length);assert.equal(hash(fs.readFileSync(JSON.parse(done.meta).filePath)),hash(body));}
});
test('invalid Content-Range is refused rather than corrupting a file',async()=>{const s=service('invalid-range');const d=await s.action('add',{url:origin+'/bad-range'});await until(()=>s.store.find(d.id).status==='error');assert.match(s.store.find(d.id).error,/نطاق/);assert.equal(s.store.find(d.id).downloaded,0);});
test('a dropped connection retries remaining bytes and completes correctly',async()=>{failOnce=true;const s=service('retry');const d=await s.action('add',{url:origin+'/retry'});const done=await complete(s,d.id);assert.equal(JSON.parse(done.meta).sha256,hash(body));assert.ok(s.store.logs().some(e=>e.type==='retry'));});
test('quota pauses transfers and resumes the queue in the next window',async()=>{
  const s=service('quota');s.store.saveSettings({quotaMB:.12,quotaHours:4});const d=await s.action('add',{url:origin+'/file.bin'});await until(()=>s.store.find(d.id).status==='limited');assert.ok(s.store.find(d.id).downloaded<body.length);s.store.saveSettings({quotaMB:0});await s.action('queue',{id:'main',running:true});const done=await complete(s,d.id);assert.equal(JSON.parse(done.meta).sha256,hash(body));
});
test('speed limiter applies a real aggregate file delay',async()=>{const s=service('limiter');s.store.saveSettings({speedLimit:64});const start=Date.now();const d=await s.action('add',{url:origin+'/tiny.bin'});await complete(s,d.id);assert.ok(Date.now()-start>=450);});
test('queue remains stopped until started and honors simultaneous=1',async()=>{
  const s=service('queue');await s.action('queue',{id:'main',simultaneous:1});for(let i=0;i<3;i++)await s.action('add',{url:origin+'/file.bin',name:`q${i}.bin`,later:true});await wait(650);assert.equal(s.engine.active.size,0);await s.action('queue',{id:'main',running:true});let max=0;await until(()=>{max=Math.max(max,s.engine.active.size);return s.store.list().every(d=>d.status==='complete');});assert.equal(max,1);
});
test('a manually paused file stays paused while its queue is running',async()=>{
  const s=service('manual-pause');s.store.saveSettings({speedLimit:256});const d=await s.action('add',{url:origin+'/file.bin',later:true});await s.action('queue',{id:'main',running:true});await until(()=>s.store.find(d.id).downloaded>50000);await s.action('pause',{id:d.id});await wait(1100);assert.equal(s.store.find(d.id).status,'paused');await s.action('queueStop',{id:'main'});
});
test('external scanner receives a filename without a shell',async()=>{
  const s=service('scanner');s.store.saveSettings({scanner:process.execPath,scannerArgs:JSON.stringify(['-e','process.exit(0)','[File]'])});const d=await s.action('add',{url:origin+'/tiny.pdf'});const done=await complete(s,d.id);assert.equal(JSON.parse(done.meta).scan.status,'passed');
});
test('schedule triggers in local time without duplicate runs',async()=>{
  const s=service('schedule'),now=new Date();const hhmm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;const d=await s.action('add',{url:origin+'/tiny.pdf',later:true});await s.action('queue',{id:'main',schedule:{enabled:true,start:hhmm,days:[now.getDay()]}});await complete(s,d.id);await until(()=>!s.store.queues()[0].running);assert.ok(JSON.parse(s.store.queues()[0].schedule).lastRun);
});
test('batch validation is atomic, exports omit credentials, import validates URLs',async()=>{
  const s=service('import');await assert.rejects(s.action('batch',{urls:[origin+'/tiny.pdf','javascript:alert(1)']}));assert.equal(s.store.list().length,0);await s.action('login',{host:'127.0.0.1',username:'test',password:'pass'});await s.action('add',{url:origin+'/auth',headers:{cookie:'private=secret'}});await until(()=>s.store.list()[0].status==='complete');const exported=await s.action('export');assert.equal(JSON.stringify(exported).includes('private=secret'),false);assert.equal(JSON.stringify(exported).includes('password'),false);const count=await s.action('import',exported);assert.equal(count,1);await assert.rejects(s.action('import',{format:'Flow',downloads:[{url:'file:///C:/Windows/win.ini'}]}));
});
test('ZIP preview reads central directory through HTTP ranges',async()=>{const files=await zipPreview(origin+'/archive.zip');assert.deepEqual(files.map(x=>[x.name,x.size]),[['folder/hello.txt',5]]);});
test('probe follows redirects and returns real resume metadata',async()=>{const info=await probe(origin+'/redirect');assert.equal(info.size,body.length);assert.equal(info.resumable,true);});
test('grabber discovers, downloads and rewrites HTML into local links',async()=>{
  const s=service('grabber');const p=await s.grabber.scan({url:origin+'/site/index.html',depth:1,maxPages:5,includeHTML:true,noParent:false});const data=JSON.parse(p.data);assert.equal(data.status,'ready');assert.ok(data.links.some(l=>l.url.endsWith('/tiny.pdf')));s.grabber.download(p.id,data.links.map(l=>l.url));await until(()=>s.store.list().every(d=>d.status==='complete'));s.grabber.finalize();const final=JSON.parse(s.store.projects()[0].data);assert.equal(final.status,'complete');const entry=final.mapping[origin+'/site/index.html'];const file=JSON.parse(s.store.find(entry.id).meta).filePath;const html=fs.readFileSync(file,'utf8');assert.ok(html.includes('href="child.html"'));assert.equal(html.includes('href="/tiny.pdf"'),false);
});
test('HTTP server isolates sessions, rejects CSRF and authenticates the extension',async()=>{
  const s=service('security');const web=await createServer(s,0);try{
    let r=await fetch(web.origin+'/api/state');assert.equal(r.status,401);
    r=await fetch(web.origin+'/api/session',{headers:{origin:'https://evil.invalid'}});assert.equal(r.status,403);
    const {token}=await(await fetch(web.origin+'/api/session')).json();r=await fetch(web.origin+'/api/state',{headers:{'x-flow-token':token}});assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);
    await s.action('settings',{integration:true});const extOrigin='chrome-extension://'+'a'.repeat(32);
    r=await fetch(web.origin+'/extension/add',{method:'POST',headers:{origin:extOrigin,'content-type':'application/json','x-flow-token':'wrong'},body:JSON.stringify({url:origin+'/tiny.pdf'})});assert.equal(r.status,401);
    r=await fetch(web.origin+'/extension/add',{method:'POST',headers:{origin:extOrigin,'content-type':'application/json','x-flow-token':s.extensionToken},body:JSON.stringify({url:origin+'/tiny.pdf',later:true,directory:'C:\\sensitive'})});assert.equal(r.status,200);assert.equal(s.store.list()[0].directory,s.store.settings.downloadDir);
    r=await fetch(web.origin+'/api/action',{method:'POST',headers:{'content-type':'application/json','x-flow-token':token},body:JSON.stringify({type:'add',data:{url:origin+'/tiny.pdf',headers:{cookie:'a\r\nbad'}}})});assert.equal(r.status,400);
  }finally{await web.close();}
});
test('file names and numeric settings cannot escape their bounds',async()=>{const s=service('validation');assert.equal(fileName('../unsafe.exe'),'.._unsafe.exe');assert.equal(fileName('CON.txt'),'file_CON.txt');await s.action('settings',{connections:10000,simultaneous:0});assert.equal(s.store.settings.connections,32);assert.equal(s.store.settings.simultaneous,1);await assert.rejects(s.action('settings',{speedLimit:-1}));});
test('Content-Disposition names Unicode files and preserves an explicit category',async()=>{
  const s=service('disposition');const first=await s.action('add',{url:origin+'/named'});let done=await complete(s,first.id);assert.equal(done.name,'تقرير.pdf');assert.equal(done.category,'documents');
  const second=await s.action('add',{url:origin+'/named',category:'video'});done=await complete(s,second.id);assert.equal(done.category,'video');assert.match(done.name,/تقرير/);
});
test('untrusted imports cannot inject categories, headers, paths, or queue markup',async()=>{
  const s=service('untrusted');await assert.rejects(s.action('add',{url:origin+'/tiny.pdf',category:'x" onclick="alert(1)'}));await assert.rejects(s.action('queue',{id:'"><img>',name:'bad'}));
  await s.action('import',{format:'Flow',downloads:[{url:origin+'/tiny.pdf',directory:'C:\\outside',headers:{authorization:'private'},mode:'media'}]});const d=s.store.list()[0];assert.equal(d.directory,s.store.settings.downloadDir);assert.deepEqual(JSON.parse(d.meta).headers,{});assert.equal(JSON.parse(d.meta).mode,'file');
});
test('FFmpeg downloads unencrypted HLS and rejects encrypted manifests',async()=>{
  const ffmpeg=require('ffmpeg-static'),media=path.join(root,'media');fs.mkdirSync(media,{recursive:true});
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=green:s=160x90:r=10:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-f','hls','-hls_time','1','-hls_segment_filename',path.join(media,'part%d.ts'),path.join(media,'stream.m3u8')],{windowsHide:true});
  const s=service('media'),d=await s.action('add',{url:origin+'/media/stream.m3u8',mode:'media'});const done=await complete(s,d.id);const file=JSON.parse(done.meta).filePath;assert.match(done.name,/\.mp4$/);assert.ok(fs.statSync(file).size>1000);assert.equal(fs.readFileSync(file).subarray(4,8).toString(),'ftyp');
  fs.writeFileSync(path.join(media,'encrypted.m3u8'),'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:1,\npart0.ts');const protectedItem=await s.action('add',{url:origin+'/media/encrypted.m3u8',mode:'media',name:'protected.mp4'});await until(()=>s.store.find(protectedItem.id).status==='error');assert.match(s.store.find(protectedItem.id).error,/محمي/);
  fs.writeFileSync(path.join(media,'master.m3u8'),'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100000\nencrypted.m3u8');const protectedMaster=await s.action('add',{url:origin+'/media/master.m3u8',mode:'media'});await until(()=>s.store.find(protectedMaster.id).status==='error');assert.match(s.store.find(protectedMaster.id).error,/محمي/);
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',file,'-c','copy','-f','dash','manifest.mpd'],{windowsHide:true,cwd:media});
  const dash=await s.action('add',{url:origin+'/media/manifest.mpd'});const dashDone=await complete(s,dash.id);assert.ok(dashDone.size>1000);assert.match(dashDone.name,/\.mp4$/);
});
