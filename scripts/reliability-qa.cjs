const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
module.exports=async({app,win,service,toolsWindows})=>{
 const root=process.env.FLOW_SMOKE_DIR,checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
 const js=(w,s)=>w.webContents.executeJavaScript(s),until=async fn=>{for(let i=0;i<200;i++){try{if(await fn())return;}catch{}await wait(50);}throw Error('Reliability UI condition timed out');};
 const check=(name,v)=>{assert.ok(v,name);checks.push(name);};
 const click=async(w,selector)=>{await js(w,`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const p=await js(w,`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);w.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...p});w.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...p});await wait(100);};
 const ready=async w=>{await until(()=>js(w,'initialized&&!!state'));await js(w,'refresh()');};
 let server;
 try{
 clearInterval(service.engine.tick);await ready(win);await service.action('settings',{language:'en',sounds:false,completionDialog:false});
 const malformed=[null,{}, {download:{id:'broken',meta:'null'}}];service.store.set('trash',malformed);await js(win,'refresh()');
 check('legacy corrupt recovery records do not disconnect the main window',await js(win,'initialized&&!document.querySelector("#connection-state.offline")'));
 for(const kind of ['settings','smart','library','power','logs','scheduler','integration','batch']){await toolsWindows.open(kind);const w=toolsWindows.windows.get(kind);await ready(w);check(kind+' native tool opens without the meta error',await js(w,'!document.body.textContent.includes("Cannot read properties")&&!!state'));w.destroy();}
 await toolsWindows.open('library',{tab:'trash'});let w=toolsWindows.windows.get('library');await ready(w);check('recovery view explains unavailable historical records',await js(w,'document.body.textContent.includes("3 incomplete recovery records")'));check('recovery inspection preserves original raw records',JSON.stringify(service.store.get('trash'))===JSON.stringify(malformed));w.destroy();
 server=http.createServer((req,res)=>{if(req.url==='/hang')return;res.writeHead(404);res.end('Missing');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const failed=await service.action('add',{url:origin+'/missing.mp4'});await until(()=>service.store.find(failed.id).status==='error');await js(win,'refresh()');check('404 task visibly reports Failed at zero bytes',await js(win,`document.querySelector('[data-id="${failed.id}"]').textContent.includes('Failed')`));
 await service.action('remove',{id:failed.id});await js(win,'refresh()');check('zero-byte failed task disappears after deletion',await js(win,`!document.querySelector('.download-row[data-id="${failed.id}"]')`));
 const hanging=await service.action('add',{url:origin+'/hang'});await js(win,'refresh()');check('probing task shows Connecting rather than an unexplained 0%',await js(win,`document.querySelector('.download-row[data-id="${hanging.id}"]').textContent.includes('Connecting')`));
 await service.action('remove',{id:hanging.id});await js(win,'refresh()');check('remove during connection finishes and removes the row',!service.engine.active.has(hanging.id)&&!service.store.find(hanging.id));
 await toolsWindows.open('add',{url:'https://www.youtube.com/playlist?list=flow-qa'});const add=toolsWindows.windows.get('add');await ready(add);await until(()=>toolsWindows.windows.has('power'));w=toolsWindows.windows.get('power');await ready(w);
 check('playlist pasted in Add Download opens the native playlist importer',await js(w,'document.querySelector("[name=playlistURL]").value.includes("flow-qa")'));
 check('playlist redirect does not create playlist.mp4 task',service.store.list().length===0);add.destroy();
 const entries=Array.from({length:250},(_,i)=>({id:String(i).padStart(11,'0'),url:'https://www.youtube.com/watch?v='+String(i).padStart(11,'0'),title:'Course lesson '+(i+1),duration:60,index:i+1}));
 let cancelSignal;service.engine.video.collection=async(_u,_l,options)=>{cancelSignal=options.signal;return{title:'Playlist import preview',items:entries,scanned:250,skipped:0,truncated:false};};
 await click(w,'[data-action=powerCollectionInspect]');await until(()=>js(w,'document.querySelectorAll("[data-power-video]").length===250'));
 check('cancel control is hidden after inspection',await js(w,'getComputedStyle(document.querySelector("[data-action=powerCollectionCancel]")).display==="none"'));
 check('all 250 entries are selected by default without the old 100 cutoff',await js(w,'document.querySelectorAll("[data-power-video]:checked").length===250'));
 await click(w,'[data-action=powerCollectionNone]');check('clear playlist selection works',await js(w,'!document.querySelectorAll("[data-power-video]:checked").length'));
 await click(w,'[data-action=powerCollectionAll]');check('select whole playlist works',await js(w,'document.querySelectorAll("[data-power-video]:checked").length===250'));
 await js(w,'document.querySelector("#f-collectionQuality").value="max720"');await click(w,'[data-action=powerCollectionCommit]');await until(()=>service.store.list().length===250);
 check('queue whole playlist creates independent paused-until-start tasks',service.store.list().every(d=>d.status==='queued'&&JSON.parse(d.meta).quality==='max720'));
 check('full playlist uses numbered filenames and one titled folder',service.store.list().some(d=>d.name==='250 - Course lesson 250.mp4')&&service.store.list().every(d=>path.basename(d.directory)==='Playlist import preview'));
 check('queue action does not start downloads or the queue',service.engine.active.size===0&&!service.store.queues()[0].running);
 await click(w,'[data-action=powerCollectionInspect]');await until(()=>js(w,'document.querySelectorAll("[data-power-video]").length===250'));await click(w,'[data-action=powerCollectionCommit]');check('reimport skips existing videos instead of making duplicate tasks',service.store.list().length===250);
 const next={...entries[0],id:'abcdefghijk',url:'https://www.youtube.com/watch?v=abcdefghijk',title:'New lesson',index:251};service.engine.video.collection=async()=>({title:'Playlist import preview',items:[next],scanned:1,skipped:0,truncated:false});await click(w,'[data-action=powerCollectionInspect]');await until(()=>js(w,'document.querySelectorAll("[data-power-video]").length===1'));await click(w,'[data-action=powerCollectionStart]');check('download now starts the selected queue after importing',service.store.list().length===251&&service.store.queues()[0].running);await service.action('queueStop',{id:'main'});
 service.engine.video.collection=async(_u,_l,{signal})=>new Promise((_resolve,reject)=>{cancelSignal=signal;signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
 await click(w,'[data-action=powerCollectionInspect]');await until(()=>js(w,'!document.querySelector("[data-action=powerCollectionCancel]").hidden'));await click(w,'[data-action=powerCollectionCancel]');await until(()=>js(w,'!powerBusy'));check('playlist cancel remains clickable while inspection is busy',cancelSignal.aborted);check('cancel error is readable in English',await js(w,'document.querySelector("#power-error").textContent.includes("cancelled")'));
 await js(w,"powerCollection={title:'Playlist import preview',items:Array.from({length:25},(_,i)=>({id:String(i).padStart(11,'0'),title:'Course lesson '+(i+1),duration:60})),skipped:0,truncated:false};renderPower();document.querySelector('#power-error').textContent='';document.querySelector('#toasts').replaceChildren()");await wait(200);fs.writeFileSync(path.join(root,'playlist-import-en.png'),(await w.webContents.capturePage()).toPNG());
 await service.action('settings',{language:'ar',theme:'dark'});await js(w,'refresh();renderPower()');check('playlist importer supports Arabic RTL',await js(w,'document.documentElement.dir==="rtl"'));
 w.setSize(650,640);w.webContents.setZoomFactor(1.5);await wait(100);check('playlist importer stays inside a compact window at 150% text scale',await js(w,'document.documentElement.scrollWidth<=innerWidth+1'));
 fs.writeFileSync(path.join(root,'playlist-import-ar.png'),(await w.webContents.capturePage()).toPNG());
 }catch(e){errors.push(e.stack);}finally{server?.closeAllConnections();server?.close();fs.writeFileSync(path.join(root,'reliability-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,errors},null,2));}
 if(errors.length)throw Error(errors.join('\n'));
};
