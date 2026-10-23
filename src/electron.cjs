// Desktop launches can outlive the shell that created their stdio pipes.
// Never turn a detached logging pipe into an uncaught main-process exception.
for(const stream of [process.stdout,process.stderr])stream?.on('error',error=>{if(error.code!=='EPIPE')writeLog(error);});
const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage,clipboard,Notification,Menu,Tray,nativeImage,screen,powerSaveBlocker}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {Service}=require('./service.cjs');
const {BrowserBridge}=require('./browser.cjs');
const {ToolWindows}=require('./windows.cjs');
const {createServer}=require('./server.cjs');
const {validateURL}=require('./network.cjs');
function writeLog(error){try{const folder=process.env.FLOW_SMOKE_DIR||app.getPath('userData');fs.mkdirSync(folder,{recursive:true});fs.appendFileSync(path.join(folder,'desktop.log'),new Date().toISOString()+' '+(error?.stack||String(error))+'\n');}catch{}}
console.error=(...args)=>writeLog(args.map(v=>v?.stack||String(v)).join(' '));
console.log=(...args)=>{if(process.env.FLOW_SMOKE_TEST)writeLog(args.join(' '));};
let win,service,web,quitting=false,clipTimer,drop,tray,toolsWindows,wakeTimer,wakeId;
const tr=(ar,en)=>service?.store.settings.language==='ar'?ar:en;
function syncNativeLanguage(){
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Flow',submenu:[{label:tr('سلة التحميل','Drop basket'),click:createDrop},{label:tr('إعادة تحميل الواجهة','Reload interface'),role:'reload'},{type:'separator'},{label:tr('خروج','Exit'),role:'quit'}]},{label:tr('تحرير','Edit'),submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}]));
 const show=()=>{if(win.isMinimized())win.restore();win.show();win.focus();};
 tray?.setContextMenu(Menu.buildFromTemplate([{label:tr('فتح Flow','Open Flow'),click:show},{label:tr('إيقاف الكل','Pause all'),click:()=>service.action('pauseAll')},{type:'separator'},{label:tr('خروج','Exit'),click:()=>app.quit()}]));
}
function syncWake(){const needed=!!service?.store.settings.preventSleep&&!!service?.engine.active.size;if(needed&&(wakeId===undefined||!powerSaveBlocker.isStarted(wakeId)))wakeId=powerSaveBlocker.start('prevent-app-suspension');if(!needed&&wakeId!==undefined){powerSaveBlocker.stop(wakeId);wakeId=undefined;}return wakeId!==undefined&&powerSaveBlocker.isStarted(wakeId);}
if(process.env.FLOW_SMOKE_DIR)app.setPath('userData',process.env.FLOW_SMOKE_DIR);
function smokeReport(data){if(process.env.FLOW_SMOKE_REPORT){fs.mkdirSync(path.dirname(process.env.FLOW_SMOKE_REPORT),{recursive:true});fs.writeFileSync(process.env.FLOW_SMOKE_REPORT,JSON.stringify(data,null,2));}}
smokeReport({stage:'starting',electron:process.versions.electron});
function parseCLI(args){const result={};for(let i=0;i<args.length;i++){const key=args[i].toLowerCase();if(['/d','/p','/f'].includes(key))result[key]=args[++i];else if(['/n','/a','/q','/s','/h'].includes(key))result[key]=true;}return result;}
async function cli(args){const a=parseCLI(args);if(a['/d']){
  const d=await service.action('add',{url:a['/d'],directory:a['/p'],name:a['/f'],later:!!a['/a']});
  if(a['/q'])service.engine.on('complete',item=>{if(service.store.settings.completionDialog&&toolsWindows)toolsWindows.open('complete',{id:item.id}).catch(writeLog);if(item.id===d.id)app.quit();});
  if(a['/h'])service.store.log('notice','/h غير متاح: لا يتم قطع اتصال النظام تلقائياً');
}if(a['/s'])await service.action('queue',{id:'main',running:true});}
function runFile(exe,args){return new Promise((resolve,reject)=>execFile(exe,args,{windowsHide:true,timeout:30000},(err,out,stderr)=>err?reject(Error(stderr||err.message)):resolve(out)));}
async function createWindow(){
  win=new BrowserWindow({width:Math.min(1280,screen.getPrimaryDisplay().workAreaSize.width),height:Math.min(800,screen.getPrimaryDisplay().workAreaSize.height),minWidth:640,minHeight:440,show:false,backgroundColor:'#f3f5f7',title:'Flow — Download Manager',icon:path.join(__dirname,'../ui/logo.png'),autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==web.origin)event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  win.on('blur',()=>win.webContents.executeJavaScript('typeof closeDesktopMenus===\"function\"&&closeDesktopMenus()').catch(()=>{}));
  win.on('close',event=>{if(!quitting&&!process.env.FLOW_SMOKE_TEST){event.preventDefault();win.hide();}});
  await win.loadURL(web.origin);win.webContents.setZoomFactor(Math.max(.8,Math.min(1.5,service.store.settings.textScale/100)));if(!process.argv.includes('--background'))win.show();
}
async function createDrop(){
  if(drop&&!drop.isDestroyed()){drop.close();drop=null;return;}
  drop=new BrowserWindow({width:220,height:125,frame:false,alwaysOnTop:true,resizable:false,skipTaskbar:true,backgroundColor:'#f2f8f5',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  drop.webContents.setWindowOpenHandler(()=>({action:'deny'}));drop.webContents.on('will-navigate',e=>e.preventDefault());await drop.loadURL(web.origin+'/drop.html');
}
if(!app.requestSingleInstanceLock({version:app.getVersion()})){
 app.whenReady().then(async()=>{let residentVersion;try{const response=await fetch('http://127.0.0.1:'+(Number(process.env.FLOW_PORT)||17863)+'/health',{signal:AbortSignal.timeout(2000)});residentVersion=(await response.json()).version;}catch{}if(!process.argv.includes('--background')&&residentVersion!==app.getVersion())dialog.showMessageBoxSync({type:'info',title:'Flow is already running',message:'Another Flow instance is already running.',detail:'Exit Flow using Tasks → Exit or the tray menu before opening this edition. An older running copy cannot apply a newer update. Your library is kept.',buttons:['OK']});app.quit();});
}else{
  app.on('second-instance',(_event,args)=>{cli(args).catch(e=>dialog.showErrorBox('Flow',e.message));if(win&&!args.includes('--background')){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(async()=>{
    const protectedStorage=safeStorage.isEncryptionAvailable()?{encrypt:v=>safeStorage.encryptString(v),decrypt:v=>safeStorage.decryptString(v)}:undefined;
    if(!protectedStorage)throw Error('تعذر الوصول إلى مخزن مفاتيح النظام الآمن');
    const desktop={
      downloadInfo:async (id,status='pending')=>{for(let n=0;n<200&&!toolsWindows;n++)await new Promise(r=>setTimeout(r,50));if(!toolsWindows)throw Error('نافذة التطبيق لم تجهز بعد');return toolsWindows.open(status==='pending'?'download-info':'details',{id});},
      scale:value=>{win?.webContents.setZoomFactor(value);toolsWindows?.scale(value);},
      browserFallback:async url=>{validateURL(url,['http:','https:']);await shell.openExternal(url);return true;},
      wakeStatus:()=>syncWake(),
      authorProfile:async()=>{await shell.openExternal('https://www.facebook.com/mohamedabdelnaby190');return true;},
      quit:()=>{app.quit();return true;},
      browserExtensions:async()=>{let chrome;for(const base of [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean)){const file=path.join(base,'Google/Chrome/Application/chrome.exe');if(fs.existsSync(file)){chrome=file;break;}}if(!chrome)throw Error('افتح chrome://extensions في كروم');const {spawn}=require('node:child_process');const child=spawn(chrome,['chrome://extensions'],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>{});child.unref();return true;},
      open:async file=>{const result=await shell.openPath(file);if(result)throw Error(result);return true;},
      folder:file=>{shell.showItemInFolder(file);return true;},
      chooseDirectory:async()=>{const r=await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()||win,{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];},
      chooseSound:async()=>{const r=await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()||win,{filters:[{name:'WAV',extensions:['wav']}],properties:['openFile']});return r.canceled?null:r.filePaths[0];},
      playSound:async file=>{if(!file.toLowerCase().endsWith('.wav')||!fs.existsSync(file))throw Error('اختر ملف WAV موجوداً');return shell.openPath(file);},
      startup:enabled=>app.setLoginItemSettings({openAtLogin:enabled}),
      vpnConnect:async name=>{if(process.platform!=='win32'||!name)throw Error('اختر اسم اتصال VPN مسجل في ويندوز');await runFile('rasdial.exe',[name]);return true;},
      vpnDisconnect:async name=>{if(process.platform!=='win32'||!name)throw Error('اختر اسم اتصال VPN مسجل في ويندوز');await runFile('rasdial.exe',[name,'/disconnect']);return true;}
    };
    service=new Service(path.join(app.getPath('userData'),'FlowData'),{protection:protectedStorage,desktop});
    // Use the user's Downloads folder for the first desktop launch.
    if(!service.store.get('desktopInitialized')){service.store.saveSettings({downloadDir:path.join(app.getPath('downloads'),'Flow')});service.store.set('desktopInitialized',true);}
    web=await createServer(service,Number(process.env.FLOW_PORT)||17863);
    service.browserBridge=new BrowserBridge(app,service,web.origin);try{await service.browserBridge.ensure();}catch(error){writeLog(error);service.store.log('browser',error.message);}
    if(process.env.FLOW_SMOKE_BROWSER_INSTALL)await service.browserBridge.install();
    const trusted=event=>{try{return (!!win&&!win.isDestroyed()&&win.webContents===event.sender||!!drop&&!drop.isDestroyed()&&drop.webContents===event.sender||toolsWindows?.owns(event.sender))&&!!event.senderFrame&&new URL(event.senderFrame.url).origin===web.origin;}catch{return false;}};
    ipcMain.handle('flow:action',async(event,type,data)=>{
      if(quitting)return false;
      if(!trusted(event))throw Error('مصدر غير موثوق');
      if(drop&&!drop.isDestroyed()&&event.sender===drop.webContents&&!['add','dropClose'].includes(type))throw Error('أمر غير مسموح');
      if(type==='add'&&drop&&!drop.isDestroyed()&&event.sender===drop.webContents)return service.browserAdd(data);
      if(type==='window')return toolsWindows.open(data.kind,data);
      if(type==='windowMinimize'){BrowserWindow.fromWebContents(event.sender)?.minimize();return true;}
      if(type==='windowClose'){const target=BrowserWindow.fromWebContents(event.sender);if(target&&target!==win)target.close();return true;}
      if(type==='drop'){await createDrop();return true;}if(type==='dropClose'){drop?.close();drop=null;return true;}
      const result=await service.action(type,data);if(type==='settings'&&data.language)syncNativeLanguage();return result;
    });
    ipcMain.handle('flow:state',event=>{if(quitting)return {error:'البرنامج يغلق'};if(!trusted(event))throw Error('مصدر غير موثوق');return service.snapshot();});
    service.engine.on('complete',item=>{if(service.store.settings.completionDialog&&toolsWindows)toolsWindows.open('complete',{id:item.id}).catch(writeLog);win?.webContents.send('flow:complete',{id:item.id,name:item.name});if(service.store.settings.sounds){if(service.store.settings.soundComplete)desktop.playSound(service.store.settings.soundComplete).catch(()=>{});else shell.beep();}if(Notification.isSupported())new Notification({title:tr('اكتمل التحميل','Download complete'),body:item.name}).show();});
    service.engine.on('failure',()=>{if(service.store.settings.sounds&&service.store.settings.soundError)desktop.playSound(service.store.settings.soundError).catch(()=>{});});
    service.engine.on('queueComplete',()=>{if(service.store.settings.sounds&&service.store.settings.soundQueue)desktop.playSound(service.store.settings.soundQueue).catch(()=>{});});
    service.engine.on('quitRequested',()=>app.quit());
    await createWindow();toolsWindows=new ToolWindows({BrowserWindow,service,origin:web.origin,main:win,screen});
    service.engine.on('started',d=>{if(service.store.settings.showProgress)toolsWindows.open('details',{id:d.id}).catch(writeLog);});
    for(const d of service.store.list().filter(d=>d.status==='pending'))toolsWindows.open('download-info',{id:d.id}).catch(writeLog);
    wakeTimer=setInterval(syncWake,500);
    await cli(process.argv);
    tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../ui/logo.png')).resize({width:20,height:20}));tray.setToolTip('Flow Download Manager');tray.on('double-click',()=>{if(win.isMinimized())win.restore();win.show();win.focus();});syncNativeLanguage();
    let lastClip='';clipTimer=setInterval(()=>{if(!service.store.settings.monitorClipboard)return;const text=clipboard.readText().trim();if(text===lastClip)return;lastClip=text;
      try{const u=validateURL(text);const ext=u.pathname.split('.').pop().toUpperCase();if(service.store.settings.fileTypes.split(/[ ,]+/).includes(ext))win?.webContents.send('flow:clipboard',text);}catch{}
    },1500);
    if(process.env.FLOW_QA_SCRIPT){try{await require(path.resolve(process.env.FLOW_QA_SCRIPT))({app,win,service,web,toolsWindows});app.quit();}catch(error){writeLog(error);smokeReport({stage:'error',error:error.stack});app.quit();}return;}
    if(process.env.FLOW_SMOKE_TEST){setTimeout(async()=>{
      try{if(process.env.FLOW_SMOKE_VIEW)await win.webContents.executeJavaScript(process.env.FLOW_SMOKE_VIEW);await new Promise(r=>setTimeout(r,500));const state=await win.webContents.executeJavaScript('({title:document.title,bridge:!!window.desktopAPI,connection:document.querySelector("#connection-state")?.textContent,bodyWidth:document.body.scrollWidth,viewport:innerWidth})');const report={stage:'complete',...state,database:service.store.realm.path,electron:process.versions.electron,sandbox:win.webContents.getLastWebPreferences().sandbox};console.log('ELECTRON_SMOKE_OK',JSON.stringify(report));smokeReport(report);if(process.env.FLOW_SMOKE_IMAGE){const capture=await win.webContents.capturePage();fs.writeFileSync(process.env.FLOW_SMOKE_IMAGE,capture.toPNG());}app.quit();}catch(e){console.error(e);smokeReport({stage:'error',error:e.message});app.quit();}
    },Number(process.env.FLOW_SMOKE_DELAY)||2500);}
  }).catch(e=>{console.error(e);smokeReport({stage:'error',error:e.message});if(!process.env.FLOW_SMOKE_TEST)dialog.showErrorBox('Flow',e.message);app.quit();});
  app.on('before-quit',event=>{if(quitting)return;event.preventDefault();quitting=true;toolsWindows?.closeAll();clearInterval(clipTimer);clearInterval(wakeTimer);if(wakeId!==undefined)powerSaveBlocker.stop(wakeId);Promise.resolve().then(async()=>{if(service)await service.close();if(web)await web.close();app.exit(0);}).catch(()=>app.exit(1));});
  app.on('window-all-closed',()=>app.quit());
}
module.exports={parseCLI};
