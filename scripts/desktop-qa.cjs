const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{nativeTheme,BrowserWindow}=require('electron');
module.exports=async({app,win,service,toolsWindows})=>{
 const dir=process.env.FLOW_SMOKE_DIR,shots=process.env.FLOW_QA_SCREENSHOTS||path.join(dir,'screenshots'),checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(shots,{recursive:true});
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 const js=(w,s)=>w.webContents.executeJavaScript(s),until=async fn=>{for(let i=0;i<150;i++){if(await fn())return;await wait(80);}throw Error('UI verification timeout');};
 const ready=async w=>{await until(()=>js(w,'typeof state!=="undefined"&&!!state&&initialized'));await wait(150);};
 const capture=async(w,name)=>{w.show();w.focus();w.webContents.invalidate();await wait(500);fs.writeFileSync(path.join(shots,name+'.png'),(await w.webContents.capturePage()).toPNG());};
 const tool=async(kind,data={})=>{const opened=await toolsWindows.open(kind,data);const w=toolsWindows.windows.get(opened.key);await ready(w);return w;};
 const refreshAll=async()=>{for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed()&&w!==drop)await js(w,'refresh()');await wait(200);};
 let drop;
 try{
 check('new profiles start in English',service.store.settings.language==='en');check('new profiles follow system appearance',service.store.settings.theme==='system');
 service.store.saveSettings({language:'en',theme:'system',sounds:false,showProgress:false,completionDialog:false,downloadDir:'C:\\Downloads\\Flow'});
 const samples=[['Design system.zip','compressed',128e6,'queued'],['Project brief.pdf','documents',3.2e6,'queued'],['Type and motion.mp4','video',245e6,'paused'],['Interface icons.svg','other',180e3,'queued'],['Sound library.flac','music',62e6,'queued'],['Product walkthrough.mp4','video',84e6,'error'],['Reference collection.zip','compressed',420e6,'paused']];
 const ids=[];for(const [name,category,size,status]of samples){const d=service.store.add({url:'https://example.com/'+encodeURIComponent(name),name,category,size,status,directory:'C:\\Downloads\\Flow',queueId:'main',meta:JSON.stringify({mode:'file',headers:{},tags:['project']})});ids.push(d.id);if(status==='paused')service.store.update(d.id,{downloaded:Math.floor(size*.36),resumable:true});if(status==='error')service.store.update(d.id,{error:'HTTP 403 — الرابط مرفوض أو منتهي الصلاحية'});}
 await service.action('folderSave',{name:'Projects',path:'C:\\Downloads\\Projects'});await service.action('folderSave',{name:'Learning',path:'C:\\Downloads\\Learning'});await service.action('viewSave',{name:'Project files',query:'tag:project'});
 await service.action('ruleSave',{name:'Documents',host:'example.com',extensions:'pdf',folder:'host',category:'documents',enabled:true});
 nativeTheme.themeSource='light';await ready(win);await js(win,'refresh();renderShell();renderMain()');
 check('main document uses English LTR',await js(win,'document.documentElement.lang==="en"&&document.documentElement.dir==="ltr"'));
 check('English main commands render',await js(win,'document.querySelector("[data-action=add]").textContent.includes("Add URL")'));
 check('English errors preserve HTTP status',await js(win,'state.downloads.find(d=>d.status==="error").error==="HTTP 403 — URL refused or expired"'));
 check('main fits normal window',await js(win,'document.body.scrollWidth<=innerWidth+1'));
 await capture(win,'desktop-light');
 const settings=await tool('settings'),library=await tool('library'),power=await tool('power'),smart=await tool('smart'),add=await tool('add');
 check('settings expose all three palettes',await js(settings,'[...document.querySelector("[name=theme]").options].map(o=>o.value).join(",")==="system,light,dark"'));
 check('settings display English as selected',await js(settings,'document.querySelector("[name=language]").value==="en"'));
 check('add form is English',await js(add,'document.title.includes("Add a download")&&document.body.innerText.includes("Start download")'));
 await js(add,'document.querySelector("[name=name]").value="Keep my draft.pdf";document.querySelector("[name=name]").focus()');
 await service.action('settings',{language:'ar'});await refreshAll();check('existing windows switch to Arabic RTL',await js(add,'document.documentElement.dir==="rtl"&&document.title.includes("إضافة تحميل جديد")'));
 check('language switch preserves unfinished form values',await js(add,'document.querySelector("[name=name]").value==="Keep my draft.pdf"'));
 await service.action('settings',{language:'en'});await refreshAll();check('existing windows return to English',await js(add,'document.documentElement.dir==="ltr"&&document.title.includes("Add a download")'));add.close();await wait(200);
 await service.action('settings',{theme:'system'});await refreshAll();
 for(const w of [win,settings,library,power,smart])check('system light applies to '+w.id,!await js(w,'document.body.classList.contains("dark")'));
 nativeTheme.themeSource='dark';await wait(200);
 for(const w of [win,settings,library,power,smart]){await until(()=>js(w,'document.body.classList.contains("dark")&&getComputedStyle(document.documentElement).colorScheme==="dark"'));check('system dark updates live in '+w.id,true);}
 await capture(win,'desktop-dark');
 await service.action('settings',{theme:'light'});await refreshAll();for(const w of [win,settings,library,power,smart])check('explicit light overrides dark system in '+w.id,!await js(w,'document.body.classList.contains("dark")'));
 await service.action('settings',{theme:'dark'});await refreshAll();nativeTheme.themeSource='light';await wait(200);check('explicit dark overrides light system',await js(win,'document.body.classList.contains("dark")'));
 await service.action('settings',{theme:'system'});await refreshAll();
 // Refresh the settings draft to show the saved System preference in its screenshot.
 await js(settings,'openSettings("general")');await capture(settings,'settings');
 await js(library,'openLibrary("folders")');await wait(350);await capture(library,'library');
 await js(library,'openLibrary("rename",'+JSON.stringify(ids.slice(0,3))+')');await js(library,'document.querySelector("[name=pattern]").value="Project-{n}-{name}";handleAction("libraryRenamePreview",document.querySelector("[data-action=libraryRenamePreview]"))');await wait(200);check('rename preview shows sample filenames',await js(library,'document.body.innerText.includes("Project-001-")'));await capture(library,'rename');
 await js(power,'openPower("traffic")');await capture(power,'productivity');
 await js(smart,'scanLibrary()');await wait(200);check('smart diagnoses are English',await js(smart,'!/[\\u0600-\\u06ff]/.test(document.querySelector("#dialog-content").innerText)'));await capture(smart,'smart-tools');
 const pending=service.store.add({url:'https://example.com/course.zip',name:'Course.zip',category:'compressed',status:'pending',directory:'C:\\Downloads\\Flow',queueId:'main',meta:JSON.stringify({mode:'file',headers:{}})});
 const confirm=await tool('download-info',{id:pending.id});check('browser confirmation is a native independent window',confirm!==win&&confirm.isMinimizable());confirm.minimize();await wait(150);check('download window minimizes',confirm.isMinimized());confirm.restore();confirm.close();
 const scheduler=await tool('scheduler');check('scheduler is English',await js(scheduler,'document.body.innerText.includes("Queue name")'));scheduler.close();
 const batch=await tool('batch');check('batch dialog is English',await js(batch,'document.title.includes("Batch download")'));batch.close();
 const about=await tool('about');check('About keeps creator attribution',await js(about,'document.body.innerText.includes("mohamed abdelnaby")'));about.close();
 // Open the real floating drop basket using its trusted main-window action.
 await js(win,'desktopAPI.action("drop")');drop=BrowserWindow.getAllWindows().find(w=>w!==win&&w.webContents.getURL().endsWith('/drop.html'));await until(()=>drop&&js(drop,'typeof dropLanguage!=="undefined"&&dropLanguage==="en"'));
 nativeTheme.themeSource='dark';await wait(250);check('drop basket follows system dark',await js(drop,'document.body.classList.contains("dark")'));nativeTheme.themeSource='light';await wait(200);check('drop basket follows system light',!await js(drop,'document.body.classList.contains("dark")'));drop.close();drop=null;
 for(const w of [settings,library,power,smart])w.close();
 await service.action('settings',{textScale:150});win.setSize(640,440);await wait(300);check('English UI fits compact window at 150 percent',await js(win,'document.body.scrollWidth<=innerWidth+1'));await capture(win,'compact');
 await service.action('settings',{textScale:100});win.setSize(1280,800);await service.action('settings',{theme:'system'});check('system preference stays stored rather than resolved palette',service.store.settings.theme==='system');
 }catch(e){errors.push(e.stack);}finally{nativeTheme.themeSource='system';fs.writeFileSync(path.join(dir,'english-appearance-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,errors},null,2));}
 if(errors.length)throw Error(errors.join('\n'));
};

