const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({app,win,service,toolsWindows})=>{
 const root=process.env.FLOW_SMOKE_DIR,checks=[],errors=[],surfaces=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),js=(w,s)=>w.webContents.executeJavaScript(s);
 const check=(name,value)=>{if(value)checks.push(name);else errors.push(name);};
 async function until(fn){for(let n=0;n<200;n++){if(await fn())return;await wait(50);}throw Error('Coherence condition timed out');}
 async function ready(w){await until(()=>js(w,'initialized&&!!state'));}
 async function audit(w,key){await wait(70);const issues=await js(w,`(()=>{const counts=new Map();for(const e of document.querySelectorAll('[id]'))counts.set(e.id,(counts.get(e.id)||0)+1);return {duplicates:[...counts].filter(([id,n])=>n>1),overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);surfaces.push(key);check(key+': unique DOM identifiers',!issues.duplicates.length);check(key+': no document-wide horizontal overflow',!issues.overflow);if(issues.duplicates.length)errors.push(JSON.stringify({key,duplicates:issues.duplicates}));}
 try{
  service.desktop.startup=async enabled=>({enabled,supported:true});await service.action('settings',{sounds:false,monitorClipboard:false,showProgress:false,completionDialog:false,language:'en',theme:'light'});await ready(win);await js(win,'refresh()');
  await js(win,`globalThis.coherenceSidebar=document.querySelector('#sidebar [data-view="all"]');coherenceSidebar.focus();globalThis.coherenceFooter=document.querySelector('#footer [data-action="browserIntegration"]');`);
  for(let n=0;n<3;n++)await js(win,'refresh()');
  check('idle snapshots preserve sidebar nodes and keyboard focus',await js(win,'coherenceSidebar===document.querySelector(\'#sidebar [data-view="all"]\')&&document.activeElement===coherenceSidebar'));
  await js(win,'coherenceFooter.focus()');for(let n=0;n<3;n++)await js(win,'refresh()');
  check('idle snapshots preserve footer nodes and keyboard focus',await js(win,'coherenceFooter===document.querySelector(\'#footer [data-action="browserIntegration"]\')&&document.activeElement===coherenceFooter'));
  const queued=service.engine.add({url:'https://example.test/coherence.bin',later:true});await js(win,'refresh()');
  check('sidebar still refreshes when a queued download is added',await js(win,'document.querySelector(\'#sidebar [data-view="all"] small\').textContent==="1"'));
  await service.library.trash(queued.id);await js(win,'refresh()');
  await js(win,`document.querySelector('#connection-state').classList.add('offline');document.querySelector('#connection-state').textContent='Disconnected';`);await js(win,'refresh()');
  check('footer recovers from a disconnected state',await js(win,'!document.querySelector("#connection-state").classList.contains("offline")&&document.querySelector("#connection-state").textContent.includes("Ready")'));
  const requests=[],originalOpen=toolsWindows.open.bind(toolsWindows);toolsWindows.open=async(kind,data)=>{requests.push(kind);return originalOpen(kind,data);};
  await js(win,'document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true,cancelable:true}))');await until(()=>toolsWindows.windows.has('tools'));await wait(200);
  check('Ctrl+K opens Tools exactly once and does not open Productivity',requests.filter(k=>k==='tools').length===1&&!requests.includes('power'));
  const hub=toolsWindows.windows.get('tools');await ready(hub);const catalog=await js(hub,'toolCatalog().map(t=>({id:t[0],kind:t[5],tab:t[6]}))');check('tool catalog IDs are unique',new Set(catalog.map(t=>t.id)).size===catalog.length);
  for(const language of ['en','ar']){
   await service.action('settings',{language});await js(win,'refresh()');await audit(win,language+':workspace');
   for(const item of catalog){const result=await toolsWindows.open(item.kind,{tab:item.tab}),w=toolsWindows.windows.get(result.key);await ready(w);const variable={tools:'toolsTab',power:'powerTab',smart:'smartTab',library:'libraryTab'}[item.kind];await until(()=>js(w,variable+'==='+JSON.stringify(item.tab)));await audit(w,language+':'+item.id);}
   await toolsWindows.open('settings');const settings=toolsWindows.windows.get('settings');await ready(settings);const tabs=await js(settings,'Object.keys(settingTabs())');for(const tab of tabs){await js(settings,'openSettings('+JSON.stringify(tab)+')');await audit(settings,language+':settings:'+tab);}
   for(const kind of ['scheduler','batch','integration','grabber','logs','about','updates']){const result=await toolsWindows.open(kind),w=toolsWindows.windows.get(result.key);await ready(w);await js(w,'refresh()');await audit(w,language+':'+kind);if(kind==='about')check(language+': About uses the running version',await js(w,'document.body.innerText.includes(state.runtime.version)&&!document.body.innerText.includes("Version 2.6.0")'));}
  }
  const power=toolsWindows.windows.get('power');await js(power,'document.body.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true,cancelable:true}))');await wait(200);check('Ctrl+K inside a tool window routes to the Tools window',requests.at(-1)==='tools'&&await js(power,'!document.querySelector(".tools-body")'));
  await toolsWindows.open('add');const add=toolsWindows.windows.get('add');await ready(add);
  await js(add,`globalThis.coherenceCancelCount=0;globalThis.coherenceAPI=api;api=async(type,data)=>type==='collectionCancel'?(coherenceCancelCount++,true):coherenceAPI(type,data);for(let n=0;n<3;n++)openAdd();document.querySelector('#dialog').dispatchEvent(new Event('close'));`);await wait(50);
  check('rebuilding the add form does not accumulate close handlers',await js(add,'coherenceCancelCount===1'));
  await js(add,`document.querySelector('#dialog').dispatchEvent(new Event('close'))`);await wait(50);
  check('an unrelated dialog close does not cancel another inspection',await js(add,'coherenceCancelCount===1'));
  for(const w of toolsWindows.windows.values())if(!w.isDestroyed())w.close();
 }catch(error){errors.push(error.stack);}finally{fs.writeFileSync(path.join(root,'system-coherence-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,surfaces:surfaces.length,errors},null,2));}
 if(errors.length)throw Error(errors.join('\n'));
};
