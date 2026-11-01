const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Service}=require('../src/service.cjs');
test('phone page serves every linked script, stylesheet and local font without exposing application data',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-remote-assets-')),service=new Service(root);service.remote.listenHost='127.0.0.1';
 try{await service.remote.start();const origin='http://127.0.0.1:'+service.remote.server.address().port,queue=['/'],seen=new Set();
  while(queue.length){const resource=queue.shift();if(seen.has(resource))continue;seen.add(resource);const response=await fetch(origin+resource);assert.equal(response.status,200,resource);if(/\.ttf$/.test(resource)){assert.match(response.headers.get('content-type'),/font\//);assert.ok((await response.arrayBuffer()).byteLength>10000);continue;}const text=await response.text();for(const m of text.matchAll(/(?:src|href)="([^"#]+)"|url\(['"]?([^'"\)]+)['"]?\)/g)){const href=m[1]||m[2];if(!/^(?:https?:|data:|#)/.test(href))queue.push(new URL(href,origin+resource).pathname);}}
  assert.ok(seen.has('/design-system.css'));assert.ok(seen.has('/appearance.js'));assert.equal((await fetch(origin+'/state')).status,401);assert.notEqual((await fetch(origin+'/../src/service.cjs')).status,200);assert.notEqual((await fetch(origin+'/fonts/../host-config.json')).status,200);
 }finally{await service.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('opening a companion folder without an explicit browser retains the saved Firefox selection',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-browser-folder-')),service=new Service(root),opened=[];for(const name of ['chrome','firefox'])fs.mkdirSync(path.join(root,name));service.store.set('browserPreferred','firefox');service.browserBridge={folder:(browser='chrome')=>path.join(root,browser)};service.desktop={open:async file=>opened.push(file)};
 try{await service.action('browserFolder');assert.equal(opened[0],path.join(root,'firefox'));await service.action('browserFolder',{browser:'chrome'});assert.equal(opened[1],path.join(root,'chrome'));}finally{await service.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('the bundled Tajawal font can be saved and survives a service restart',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-font-preference-'));let service=new Service(root);
 try{await service.action('toolsPreferences',{font:'Tajawal'});assert.equal(service.snapshot().downloadTools.preferences.font,'Tajawal');await service.close();service=new Service(root);assert.equal(service.snapshot().downloadTools.preferences.font,'Tajawal');}finally{await service.close();fs.rmSync(root,{recursive:true,force:true});}
});

after(()=>require('realm').shutdown());
