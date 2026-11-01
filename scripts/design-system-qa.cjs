const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({app,win,service,toolsWindows})=>{
 const root=process.env.FLOW_SMOKE_DIR,checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),js=(w,s)=>w.webContents.executeJavaScript(s);
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 async function until(fn){for(let n=0;n<180;n++){if(await fn())return;await wait(50);}throw Error('Design check timed out');}
 async function ready(w){await until(()=>js(w,'initialized&&!!state'));await wait(120);}
 async function capture(w,name){w.show();w.webContents.invalidate();await wait(250);await js(w,'document.fonts.ready');fs.writeFileSync(path.join(root,name+'.png'),(await w.webContents.capturePage()).toPNG());}
 const windows=[];
 try{
  service.desktop.startup=async enabled=>({enabled,supported:true});
  await service.action('settings',{theme:'light',language:'en',sounds:false,monitorClipboard:false,showProgress:false,completionDialog:true,downloadDir:path.join(root,'Downloads')});
  fs.mkdirSync(path.join(root,'Downloads'),{recursive:true});const file=path.join(root,'Downloads/Creative brief.pdf');fs.writeFileSync(file,'A controlled completed-file example.');
  const completed=service.store.add({url:'https://example.com/brief.pdf',name:'Creative brief.pdf',category:'documents',status:'complete',size:fs.statSync(file).size,downloaded:fs.statSync(file).size,directory:path.dirname(file),queueId:'main',meta:JSON.stringify({filePath:file,mode:'file',headers:{}})});
  const paused=service.store.add({url:'https://example.com/lesson.mp4',name:'Design systems — Lesson 04.mp4',category:'video',status:'paused',size:128000000,downloaded:48000000,resumable:true,directory:path.dirname(file),queueId:'main',meta:JSON.stringify({mode:'file',headers:{}})});
  for(const [name,category]of [['Brand assets.zip','compressed'],['Sound collection.flac','music'],['Interface kit.svg','other']])service.store.add({url:'https://example.com/'+encodeURIComponent(name),name,category,status:'queued',size:32000000,directory:path.dirname(file),queueId:'main'});
  await ready(win);await js(win,'refresh();renderShell();renderMain()');
  check('overview has four semantic color roles',await js(win,'new Set([...document.querySelectorAll(".overview-card")].map(e=>getComputedStyle(e).backgroundColor)).size===4'));
  await capture(win,'workspace-light');
  const tools=await toolsWindows.open('tools',{tab:'preferences'}),preferences=toolsWindows.windows.get(tools.key);await ready(preferences);
  check('four visual appearance choices are available',await js(preferences,'document.querySelectorAll("[data-theme-choice]").length===4'));
  check('six named accent palettes are available',await js(preferences,'document.querySelectorAll("[data-accent-choice]").length===6'));
  await js(preferences,'document.querySelector("[data-theme-choice=amoled]").click();document.querySelector("[data-accent-choice=violet]").click()');
  await wait(1200);await js(preferences,'refresh()');
  check('unsaved theme and accent preview survive routine state refresh',await js(preferences,'document.body.classList.contains("amoled")&&getComputedStyle(document.body).getPropertyValue("--primary").trim()==="#cdbce7"'));
  check('preview does not change saved theme or accent',service.store.settings.theme==='light'&&service.downloadTools.config().accent==='sage');
  await js(preferences,'openTools("home")');check('leaving preview restores saved appearance',await js(preferences,'!document.body.classList.contains("dark")&&document.body.dataset.density==="comfortable"'));
  await capture(preferences,'tools-light');
  const kinds=['settings','batch','scheduler','integration','grabber','logs','smart','power','library','about','updates','shutdown','add','details','complete'];
  for(const kind of kinds){const opened=await toolsWindows.open(kind,{...(['details'].includes(kind)?{id:paused.id}:kind==='complete'?{id:completed.id}:{} )});const w=toolsWindows.windows.get(opened.key);await ready(w);windows.push(w);check(kind+' uses the shared design layer',await js(w,'!![...document.styleSheets].find(s=>s.href?.endsWith("/design-system.css"))'));check(kind+' has no document-level horizontal overflow',await js(w,'document.documentElement.scrollWidth<=innerWidth+1'));}
  await service.action('settings',{theme:'amoled'});
  for(const w of [win,preferences,...windows]){await js(w,'refresh()');check('true black base in '+(w.flowKind||'main'),await js(w,'document.body.classList.contains("amoled")&&getComputedStyle(document.body).backgroundColor==="rgb(0, 0, 0)"'));}
  await capture(win,'workspace-amoled');await js(preferences,'openTools("preferences")');await capture(preferences,'appearance-amoled');
  const complete=windows.find(w=>w.flowKind==='complete');await capture(complete,'complete-amoled');
  await service.action('settings',{language:'ar'});for(const w of [win,preferences,complete])await js(w,'refresh()');
  check('Arabic workspace uses bundled Tajawal',await js(win,'document.documentElement.dir==="rtl"&&getComputedStyle(document.body).fontFamily.includes("Tajawal")'));
  await capture(win,'workspace-ar-amoled');await capture(complete,'complete-ar-amoled');
  await service.action('settings',{theme:'dark',language:'en'});await js(win,'refresh()');
  check('ordinary Dark remains distinct from AMOLED',await js(win,'document.body.classList.contains("dark")&&!document.body.classList.contains("amoled")&&getComputedStyle(document.body).backgroundColor!=="rgb(0, 0, 0)"'));
  await capture(win,'workspace-dark');
  win.setSize(640,440);await service.action('settings',{textScale:150});await js(win,'refresh()');await wait(200);
  check('compact zoomed layout keeps the transfer list usable',await js(win,'document.querySelector(".desktop-list").getBoundingClientRect().height>=45&&document.documentElement.scrollWidth<=innerWidth+1'));
  await capture(win,'compact-150');
 }catch(e){errors.push(e.stack);}finally{fs.writeFileSync(path.join(root,'design-system-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,errors,fixtures:'Isolated demonstration records; no internet-speed or real-download claim for these screenshots.'},null,2));}
 if(errors.length)throw Error(errors.join('\n'));
};
