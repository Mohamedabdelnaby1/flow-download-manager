const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),http=require('node:http');
const {spawn}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../extension/media-model.js'),'utf8')+';'+fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
function harness(options={}){
  const events={},calls=[],local={autoCapture:true,fileTypes:'ZIP PDF BIN',...options.local},session={};
  const event=name=>({addListener:fn=>events[name]=fn});
  const storage=data=>({get:async keys=>{if(typeof keys==='string')return {[keys]:data[keys]};if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,data[k]]));return {...keys,...data};},set:async v=>Object.assign(data,v),remove:async key=>{for(const k of Array.isArray(key)?key:[key])delete data[k];}});
  const chrome={runtime:{getManifest:()=>({version:'2.5.2'}),id:'abcdefghijklmnopabcdefghijklmnop',onInstalled:event('installed'),onMessage:event('message'),sendNativeMessage:async(_host,msg)=>{calls.push(['native',msg]);if(options.error)throw Error(options.error);if(options.native)return msg.type==='ping'&&!options.customPing?{app:'Flow',version:'2.5.2',settings:{}}:options.native(msg);return msg.type==='ping'?{app:'Flow',version:'2.5.2',settings:{}}:{result:{id:'desktop-id',name:msg.name||'file.bin'}};}},storage:{local:storage(local),session:storage(session)},contextMenus:{onClicked:event('context'),create:()=>{},removeAll:async()=>{}},alarms:{onAlarm:event('alarm'),create:async()=>{}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},cookies:{getAll:async()=>[{name:'session',value:'authorized-fixture'}]},tabs:{onRemoved:event('tabRemoved'),onUpdated:event('tabUpdated'),get:async()=>({url:'https://example.test/page'}),sendMessage:async()=>{}},webRequest:{onBeforeSendHeaders:event('headers'),onHeadersReceived:event('media')},downloads:{onDeterminingFilename:event('filename'),pause:async id=>calls.push(['pause',id]),resume:async id=>calls.push(['resume',id]),cancel:async id=>calls.push(['cancel',id])}};
  vm.runInNewContext(source,{chrome,importScripts:()=>{},navigator:{userAgent:'Chrome/test'},URL,crypto:crypto.webcrypto,AbortSignal,fetch,console,Map,Set,Error});
  const capture=item=>new Promise(resolve=>events.filename({id:12,url:'https://example.test/export',finalUrl:'https://example.test/export',filename:'report.pdf',startTime:'2026-10-23T01:02:03.000Z',referrer:'https://example.test/page',...item},()=>{calls.push(['suggest']);resolve();}));
  return {events,calls,local,session,capture};
}
test('Chrome captures Content-Disposition filename, transfers cookies, and cancels only after acknowledgement',async()=>{
  const h=harness();await h.capture();assert.deepEqual(h.calls.map(c=>c[0]),['pause','native','native','cancel','suggest']);const request=h.calls.find(c=>c[0]==='native'&&c[1].type==='download')[1];assert.equal(request.headers.cookie,'session=authorized-fixture');assert.equal(request.headers.referer,'https://example.test/page');assert.equal(request.name,'report.pdf');assert.ok(h.session.lastCapture.id);
});
test('Chrome resumes its own download if Flow is unavailable or does not acknowledge',async()=>{
  for(const options of [{error:'Host is not installed'},{native:async()=>({})}]){const h=harness(options);await h.capture();assert.equal(h.calls.some(c=>c[0]==='cancel'),false);assert.ok(h.calls.some(c=>c[0]==='resume'));assert.match(h.session.lastError,/Browser download kept/);}
});
test('Chrome keeps POST, incognito, excluded hosts, unknown extensions and blob downloads',async()=>{
  const cases=[{item:{incognito:true}},{item:{url:'blob:https://example.test/id',finalUrl:'blob:https://example.test/id'}},{item:{filename:'index.html'}},{local:{excludedSites:'*.example.test'}},{local:{autoCapture:false}},{post:true}];
  for(const c of cases){const h=harness({local:c.local});if(c.post)h.events.headers({url:'https://example.test/export',method:'POST',requestHeaders:[]});await h.capture(c.item);assert.equal(h.calls.some(x=>x[0]==='pause'||x[0]==='native'),false);assert.equal(h.calls.at(-1)[0],'suggest');}
});
test('Alt bypass is temporary and respects the exact URL',async()=>{
  const h=harness();await new Promise(resolve=>h.events.message({type:'bypass',url:'https://example.test/export'},{tab:{id:1}},resolve));await h.capture();assert.equal(h.calls.some(c=>c[0]==='native'),false);
});
test('capture waits for desktop acknowledgement before cancelling Chrome',async()=>{
  let acknowledge;const h=harness({native:()=>new Promise(r=>acknowledge=r)}),done=h.capture();
  while(!acknowledge)await new Promise(r=>setTimeout(r,1));assert.equal(h.calls.some(c=>c[0]==='cancel'),false);acknowledge({result:{id:'acknowledged',name:'report.pdf'}});await done;assert.ok(h.calls.some(c=>c[0]==='cancel'));
});
const child=(exe,args,input)=>new Promise((resolve,reject)=>{const p=spawn(exe,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});const chunks=[];let errors='';p.stdout.on('data',b=>chunks.push(b));p.stderr.on('data',b=>errors+=b);p.on('error',reject);p.on('close',code=>code?reject(Error(errors||'Child failed: '+code)):resolve(Buffer.concat(chunks)));p.stdin.end(input);});
function frame(value){const body=Buffer.from(JSON.stringify(value)),head=Buffer.alloc(4);head.writeUInt32LE(body.length);return Buffer.concat([head,body]);}
test('real Windows native host protects token, verifies origin, and downloads an authenticated file',{skip:process.platform!=='win32'},async()=>{
  const {Service}=require('../src/service.cjs'),{createServer}=require('../src/server.cjs'),{extensionId}=require('../src/browser.cjs');
  const root=path.join(require('node:os').tmpdir(),'flow-tests/native-test-'+Date.now());fs.mkdirSync(root,{recursive:true});const exe=path.join(root,'FlowNativeHost.exe');fs.copyFileSync(path.join(__dirname,'../native/FlowNativeHost.exe'),exe);
  const bytes=Buffer.from('Authorized native download fixture '.repeat(2000));
  const fixture=http.createServer((req,res)=>{if(req.headers.cookie!=='session=test-auth'||req.headers.referer!=='https://example.test/page'){res.writeHead(401);res.end();return;}let start=0,end=bytes.length-1;const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');if(m){start=+m[1];if(m[2])end=Math.min(+m[2],end);}res.writeHead(m?206:200,{'content-length':end-start+1,etag:'"auth-v1"',...(m?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})});res.end(bytes.subarray(start,end+1));});
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));const s=new Service(path.join(root,'data'));s.store.saveSettings({integration:true,retries:0});const web=await createServer(s,0);
  try{
    await child(exe,['--configure'],JSON.stringify({address:web.origin,extensionId,token:s.extensionToken,executable:process.execPath,arguments:''}));
    const saved=fs.readFileSync(path.join(root,'host-config.json'),'utf8');assert.equal(saved.includes(s.extensionToken),false);
    const input=Buffer.concat([frame({type:'ping',client:'Chrome test'}),frame({type:'download',client:'Chrome test',requestId:'native-fixture',url:`http://127.0.0.1:${fixture.address().port}/export`,name:'authenticated.pdf',headers:{cookie:'session=test-auth',referer:'https://example.test/page'},directory:'C:\\forbidden'})]);
    const output=await child(exe,['chrome-extension://'+extensionId+'/'],input);const firstLength=output.readUInt32LE(0),first=JSON.parse(output.subarray(4,4+firstLength));assert.equal(first.app,'Flow');const off=firstLength+4,secondLength=output.readUInt32LE(off),second=JSON.parse(output.subarray(off+4,off+4+secondLength));assert.ok(second.result.id);
    const start=Date.now();while(s.store.find(second.result.id).status!=='complete'){if(Date.now()-start>10000)throw Error(s.store.find(second.result.id).error||'Native download timed out');await new Promise(r=>setTimeout(r,20));}
    const item=s.store.find(second.result.id);assert.notEqual(item.directory,'C:\\forbidden');assert.deepEqual(fs.readFileSync(JSON.parse(item.meta).filePath),bytes);assert.equal(s.snapshot().browser.name,'Chrome test');
    const duplicate=await s.browserAdd({requestId:'native-fixture',url:`http://127.0.0.1:${fixture.address().port}/export`});assert.equal(duplicate.id,item.id);assert.equal(s.store.list().length,1);
    const bad=await child(exe,['chrome-extension://untrusted/'],frame({type:'ping'}));assert.match(JSON.parse(bad.subarray(4)).error,/Untrusted extension/);
  }finally{await web.close();await s.close();fixture.closeAllConnections();await new Promise(r=>fixture.close(r));require('realm').shutdown();}
});
test('native host starts the closed desktop service and completes its handshake',{skip:process.platform!=='win32'},async()=>{
  const {Service}=require('../src/service.cjs'),{extensionId}=require('../src/browser.cjs');
  const root=path.join(require('node:os').tmpdir(),'flow-tests/native-launch-'+Date.now());fs.mkdirSync(root,{recursive:true});const exe=path.join(root,'FlowNativeHost.exe');fs.copyFileSync(path.join(__dirname,'../native/FlowNativeHost.exe'),exe);
  const s=new Service(path.join(root,'data'));s.store.saveSettings({integration:true});const token=s.extensionToken;await s.close();
  const reserve=require('node:net').createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
  await child(exe,['--configure'],JSON.stringify({address:`http://127.0.0.1:${port}`,extensionId,token,executable:process.execPath,arguments:`"${path.join(__dirname,'native-launch-fixture.cjs')}" "${root}" ${port}`}));
  try{const output=await child(exe,['chrome-extension://'+extensionId+'/'],frame({type:'ping',client:'Chrome autostart test'}));const out=JSON.parse(output.subarray(4));assert.equal(out.app,'Flow',out.error);assert.ok(fs.existsSync(path.join(root,'fixture.pid')));}
  finally{if(fs.existsSync(path.join(root,'fixture.pid'))){const pid=Number(fs.readFileSync(path.join(root,'fixture.pid'),'utf8'));try{process.kill(pid);}catch{}}require('realm').shutdown();}
});

test('a successful connection check preserves the last file failure for diagnostics',async()=>{const h=harness();h.session.lastError='HTTP 403 for last transfer';await new Promise(resolve=>h.events.message({type:'ping'},{},resolve));assert.equal(h.session.lastError,'HTTP 403 for last transfer');});


test('media discovery deduplicates signed CDN URLs and drops byte-range fragments',async()=>{
 const h=harness();await Promise.resolve();const response=url=>h.events.media({tabId:7,url,responseHeaders:[{name:'content-type',value:'video/mp4'},{name:'content-length',value:'1200000'}]});
 response('https://video.xx.fbcdn.net/v/ABC123longfilehashwith24characters.mp4?oh=first&oe=111');response('https://video.xx.fbcdn.net/v/ABC123longfilehashwith24characters.mp4?oh=second&oe=222');response('https://video.xx.fbcdn.net/v/ABC123longfilehashwith24characters.mp4?bytestart=0&byteend=999');
 const result=await new Promise(r=>h.events.message({type:'media'},{tab:{id:7}},r));assert.equal(result.result.media.length,1);assert.equal(result.result.media[0].name,'Video file');assert.match(result.result.media[0].fileName,/\.mp4$/);assert.ok(!result.result.media[0].label.includes('ABC123'));
});
test('clearing media pauses discovery until explicitly resumed',async()=>{
 const h=harness();await Promise.resolve();const message=type=>new Promise(r=>h.events.message({type},{tab:{id:7}},r)),response=()=>h.events.media({tabId:7,url:'https://example.test/file.mp4',responseHeaders:[{name:'content-type',value:'video/mp4'}]});
 response();assert.equal((await message('media')).result.media.length,1);await message('clearMedia');response();const empty=await message('media');assert.equal(empty.result.media.length,0);assert.equal(empty.result.discoveryPaused,true);await message('resumeMedia');response();assert.equal((await message('media')).result.media.length,1);
});

test('connection checks retain browser preferences and still synchronize untouched desktop defaults',async()=>{
 const native=async()=>({app:'Flow',version:'2.5.2',settings:{videoPanel:true,fileTypes:'PDF ZIP',excludedSites:'desktop.test',panelMode:'mini'}});
 const own=harness({native,customPing:true,local:{videoPanel:false,fileTypes:'MP3',preferenceOverrides:{videoPanel:false,fileTypes:'MP3'}}});
 await new Promise(r=>own.events.message({type:'ping'},{},r));assert.equal(own.local.videoPanel,false);assert.equal(own.local.fileTypes,'MP3');assert.equal(own.local.excludedSites,'desktop.test');assert.equal(own.local.panelMode,'mini');
 const defaults=harness({native,customPing:true});await new Promise(r=>defaults.events.message({type:'ping'},{},r));assert.equal(defaults.local.fileTypes,'PDF ZIP');assert.equal(defaults.local.videoPanel,true);
});
test('temporary capture snooze leaves Chrome in charge and manual send still works',async()=>{const h=harness(),message=payload=>new Promise(r=>h.events.message(payload,{tab:{id:1,url:'https://example.test/page'}},r));const paused=await message({type:'capturePause',minutes:15});assert.ok(paused.result.until>Date.now());await h.capture();assert.equal(h.calls.some(c=>c[0]==='pause'),false);const manual=await message({type:'download',url:'https://example.test/file.pdf'});assert.equal(manual.result.id,'desktop-id');await message({type:'capturePause',minutes:0});await h.capture();assert.ok(h.calls.some(c=>c[0]==='cancel'));});
test('site capture exclusion also covers a file served by a different CDN host',async()=>{const h=harness({local:{captureDisabledSites:['example.test']}});await h.capture({url:'https://cdn.test/file.pdf',finalUrl:'https://cdn.test/file.pdf',referrer:'https://example.test/article'});assert.equal(h.calls.some(c=>c[0]==='pause'||c[0]==='native'),false);});

test('old resident desktop cannot acknowledge a new companion download',async()=>{const h=harness({customPing:true,native:async()=>({app:'Flow',version:'2.0.0'})});await h.capture();assert.equal(h.calls.some(c=>c[0]==='cancel'),false);assert.equal(h.calls.filter(c=>c[0]==='native'&&c[1].type==='download').length,0);assert.match(h.session.lastError,/still running/);assert.ok(h.calls.some(c=>c[0]==='resume'));});
test('handoff carries the actual companion build version',async()=>{const h=harness();await h.capture();assert.ok(h.calls.filter(c=>c[0]==='native').every(c=>c[1].extensionVersion==='2.5.2'));});
