const {test,after}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{EventEmitter}=require('node:events');
const {Service}=require('../src/service.cjs'),net=require('../src/network.cjs'),{isPlaylist}=require('../src/video.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(fn){const s=new Service(fs.mkdtempSync(path.join(os.tmpdir(),'flow-reliability-')));s.store.saveSettings({retries:0,sounds:false,completionDialog:false});try{await fn(s);}finally{await s.close();}}
async function server(fn,run){const h=http.createServer(fn);await new Promise(r=>h.listen(0,'127.0.0.1',r));try{await run('http://127.0.0.1:'+h.address().port);}finally{h.closeAllConnections();await new Promise(r=>h.close(r));}}
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await wait(10);}throw Error('State timed out');}
function child(){const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();return p;}
test('HTTP headers have an absolute deadline even if the server keeps its socket open',()=>server(()=>{},async url=>{const started=Date.now();await assert.rejects(net.probe(url,{timeoutMs:100}),/مهلة/);assert.ok(Date.now()-started<1500);}));
test('wrong URLs produce terminal failed tasks and can be removed at zero bytes',()=>fixture(s=>server((req,res)=>{res.writeHead(404);res.end('Missing');},async url=>{
 const d=await s.action('add',{url:url+'/not-found.mp4'});await until(()=>s.store.find(d.id).status==='error');assert.match(s.store.find(d.id).error,/404/);assert.equal(s.store.find(d.id).downloaded,0);await s.action('remove',{id:d.id});assert.equal(s.snapshot().downloads.length,0);assert.equal(s.snapshot().library.trash.length,1);
})));
test('remove during a hanging HTTP probe aborts promptly and never reappears',()=>fixture(s=>server(()=>{},async url=>{
 const d=await s.action('add',{url:url+'/hang.mp4'});await until(()=>s.engine.active.has(d.id));const start=Date.now();await s.action('remove',{id:d.id});assert.ok(Date.now()-start<1000);await wait(100);assert.equal(s.store.find(d.id),undefined);assert.equal(s.snapshot().library.trash.length,1);assert.equal(s.engine.active.size,0);
})));
test('cancel aborts a zero-byte transfer and removes temporary parts without deleting completed files',()=>fixture(s=>server(()=>{},async url=>{const d=await s.action('add',{url:url+'/cancel.mp4'});await until(()=>s.engine.active.has(d.id));await s.action('cancel',{id:d.id});assert.equal(s.store.find(d.id),undefined);assert.equal(s.engine.active.has(d.id),false);assert.equal(s.snapshot().library.trash.some(t=>t.id===d.id),false);await s.action('cancel',{id:d.id});})));
test('remove during site extraction kills extraction instead of waiting ninety seconds',()=>fixture(async s=>{
 let stopped=0;s.engine.video.command=()=>child();s.engine.video.stop=async p=>{stopped++;p.emit('close',1);};
 const d=await s.action('add',{url:'https://www.youtube.com/watch?v=BaW_jenozKc'});await until(()=>s.engine.active.has(d.id));const start=Date.now();await s.action('remove',{id:d.id});assert.ok(Date.now()-start<1000);assert.equal(stopped,1);assert.equal(s.engine.active.size,0);assert.equal(s.store.find(d.id),undefined);assert.equal(s.snapshot().library.trash.length,1);
}));
test('playlist URLs never run as one phantom playlist.mp4 download',()=>fixture(async s=>{
 assert.equal(isPlaylist('https://www.youtube.com/playlist?list=course'),true);assert.equal(isPlaylist('https://www.youtube.com/watch?v=BaW_jenozKc&list=course'),false);assert.equal(isPlaylist('https://youtube.com.evil.test/playlist?list=course'),false);
 const d=await s.action('add',{url:'https://www.youtube.com/playlist?list=course'});await until(()=>s.store.find(d.id).status==='error');assert.match(s.store.find(d.id).error,/قوائم الفيديو/);await s.action('remove',{id:d.id});assert.equal(s.snapshot().downloads.length,0);
}));
test('full playlist has no old 100/200 cutoff, preserves numbering and skips existing tasks',()=>fixture(async s=>{
 const entries=Array.from({length:250},(_,i)=>({id:String(i).padStart(11,'0'),title:'Lesson '+i,duration:1}));let args;
 s.engine.video.command=(_url,_headers,extra)=>{args=extra;const p=child();setImmediate(()=>{p.stdout.emit('data',JSON.stringify({title:'Course',entries}));p.emit('close',0);});return p;};
 const info=await s.action('collectionInfo',{url:'https://www.youtube.com/playlist?list=course'});assert.equal(info.items.length,250);assert.equal(info.truncated,false);assert.equal(args[args.indexOf('--playlist-end')+1],'10001');
 const result=await s.action('collectionAdd',{items:info.items,numbered:true,makeFolder:true,title:info.title,quality:'max720'});assert.equal(result.count,250);assert.equal(s.store.list().length,250);assert.ok(s.store.list().every(d=>d.status==='queued'&&JSON.parse(d.meta).quality==='max720'));assert.ok(s.store.list().find(d=>d.name==='250 - Lesson 249.mp4'));
 const duplicate=await s.action('collectionAdd',{items:info.items});assert.deepEqual(duplicate,{count:0,skipped:250});
}));
test('playlist cap is explicit, malformed entries are skipped and cancellation is prompt',()=>fixture(async s=>{
 s.engine.video.command=()=>{const p=child();setImmediate(()=>{p.stdout.emit('data',JSON.stringify({entries:[null,{id:'00000000001',title:'One'},{id:'00000000002',title:'Two'},{id:'00000000003',title:'Three'}]}));p.emit('close',0);});return p;};
 const info=await s.action('collectionInfo',{url:'https://www.youtube.com/playlist?list=course',limit:2});assert.equal(info.truncated,true);assert.equal(info.skipped,1);assert.equal(info.items[0].index,2);
 s.engine.video.command=()=>child();s.engine.video.stop=async p=>p.emit('close',1);const pending=s.action('collectionInfo',{url:'https://www.youtube.com/playlist?list=course'});const rejected=assert.rejects(pending,/إلغاء/);await s.action('collectionCancel');await rejected;assert.equal(s.power.collectionController,null);
}));
after(()=>require('realm').shutdown());
