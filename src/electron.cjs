// Desktop launches can outlive the shell that created their stdio pipes.
// Never turn a detached logging pipe into an uncaught main-process exception.
for(const stream of [process.stdout,process.stderr])stream?.on('error',error=>{if(error.code!=='EPIPE')writeLog(error);});
const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage,clipboard,Notification,Menu,Tray,nativeImage,screen,powerSaveBlocker}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {Service}=require('./service.cjs');
const {StartupManager,WindowRecovery,rotatingLog,safeSend}=require('./lifecycle.cjs');
// Flow uses a 2D interface. Prefer software rendering for idle/driver compatibility.
if(!process.argv.includes('--flow-hardware-acceleration'))app.disableHardwareAcceleration();
const {BrowserBridge}=require('./browser.cjs');
const {ToolWindows}=require('./windows.cjs');
const {createServer}=require('./server.cjs');
const {validateURL}=require('./network.cjs');
function writeLog(error){try{const folder=process.env.FLOW_SMOKE_DIR||app.getPath('userData');rotatingLog(path.join(folder,'desktop.log'),require('../ui/error-model.js').redact(error?.stack||String(error)));}catch{}}
console.error=(...args)=>writeLog(args.map(v=>v?.stack||String(v)).join(' '));
console.log=(...args)=>{if(process.env.FLOW_SMOKE_TEST)writeLog(args.join(' '));};
let win,service,web,quitting=false,clipTimer,drop,tray,toolsWindows,wakeTimer,wakeId,mainPromise,startup,trayTimer,completionPower;
const pendingCLI=[];let trayTarget=null;
function rememberTrayWindow(window){if(!window||window.isDestroyed())return;trayTarget=window.flowDownloadId?{kind:window.flowKind,id:window.flowDownloadId}:null;}
async function restoreTrayWindow(){if(quitting)return;if(trayTarget&&toolsWindows&&service.store.find(trayTarget.id)){await toolsWindows.open(trayTarget.kind,{id:trayTarget.id});return;}trayTarget=null;await showMain();}
function runtimeEvent(event){const folder=process.env.FLOW_SMOKE_DIR||app.getPath('userData');rotatingLog(path.join(folder,'desktop-events.jsonl'),JSON.stringify(event));}
let fatalErrorPending=false;
async function showFatalError(error){if(fatalErrorPending)return;fatalErrorPending=true;writeLog(error);const model=require('../ui/error-model.js'),language=service?.store?.settings?.language||'en',packet=model.encode(error,'application'),info=model.describe(packet,language);try{await app.whenReady();const choice=await dialog.showMessageBox({type:'error',title:'Flow Download Manager',message:info.message,detail:language==='ar'?'أعد تشغيل Flow للمتابعة بأمان. قد تتوقف التحميلات لحين فتحه مجددًا.':'Restart Flow to continue safely. Downloads may pause until it reopens.',buttons:language==='ar'?['إعادة تشغيل Flow','نسخ التقرير وإغلاق','إغلاق']:['Restart Flow','Copy report and close','Close'],defaultId:0,cancelId:2});if(choice.response===1)clipboard.writeText(model.report(packet,language));if(choice.response===0)app.relaunch();app.quit();}catch{app.exit(1);}}
process.on('uncaughtException',error=>{showFatalError(error).catch(()=>app.exit(1));});
process.on('unhandledRejection',error=>{writeLog(error);const packet=service?.describeError(error,'background')?.message||require('../ui/error-model.js').encode(error,'background');safeSend(win,'flow:error',packet);});
app.on('child-process-gone',(_event,details)=>runtimeEvent({event:'child-process-gone',type:details.type,reason:details.reason,exitCode:details.exitCode}));
function guardWindow(window,url,kind){const fallback=new URL('/recovery.html',web.origin);fallback.searchParams.set('lang',service.store.settings.language);window.flowRecovery=new WindowRecovery(window,{url,fallback:fallback.href,stopping:()=>quitting,log:event=>runtimeEvent({window:kind,...event})});window.on('minimize',()=>rememberTrayWindow(window));const visibility=()=>safeSend(window,'flow:visibility',{visible:window.isVisible()&&!window.isMinimized()});for(const name of ['show','hide','minimize','restore'])window.on(name,visibility);window.webContents.on('did-finish-load',visibility);}
async function showMain(){if(quitting)return;if(!win||win.isDestroyed())await ensureMain(true);if(win.webContents.isCrashed())await win.flowRecovery?.retry();if(win.isMinimized())win.restore();win.show();win.focus();}
function ensureMain(background=process.argv.includes('--background')){if(win&&!win.isDestroyed())return Promise.resolve(win);if(mainPromise)return mainPromise;mainPromise=createWindow(background).finally(()=>mainPromise=null);return mainPromise;}
const tr=(ar,en)=>service?.store.settings.language==='ar'?ar:en;
function syncNativeLanguage(){
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Flow',submenu:[{label:tr('سلة التحميل','Drop basket'),click:createDrop},{label:tr('إعادة تحميل الواجهة','Reload interface'),role:'reload'},{type:'separator'},{label:tr('خروج','Exit'),role:'quit'}]},{label:tr('تحرير','Edit'),submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}]));
 const show=()=>showMain().catch(writeLog);
 const records=service?trayDownloads():[];tray?.setContextMenu(Menu.buildFromTemplate([{label:tr('فتح Flow','Open Flow'),click:show},...records.map(d=>({label:d.name.slice(0,45)+' · '+(d.size?Math.min(100,d.downloaded/d.size*100).toFixed(0)+'% · ':'')+humanSize(d.downloaded)+' / '+humanSize(d.size),click:()=>toolsWindows.open('details',{id:d.id}).catch(writeLog)})),{label:tr('إيقاف الكل','Pause all'),click:()=>service.action('pauseAll').catch(writeLog)},{type:'separator'},{label:tr('خروج','Exit'),click:()=>app.quit()}]));
}
function playEventSound(event){if(!service?.store.settings.sounds)return;const key={complete:'soundComplete',error:'soundError',queue:'soundQueue'}[event],file=service.store.settings[key];require('./sounds.cjs').playSound(file,event).catch(error=>{writeLog(error);if(file)require('./sounds.cjs').playSound('',event).catch(writeLog);});}
function humanSize(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':(n/1024).toFixed(0)+' KB';}
function trayDownloads(){const rows=service.store.realm.objects('Download'),active=rows.filtered('status IN $0',['probing','downloading','processing']);return (active.length?active:rows.sorted('updatedAt',true)).slice(0,5).map(d=>({id:d.id,name:d.name,size:d.size,downloaded:d.downloaded,speed:d.speed,status:d.status}));}
function updateTray(){if(quitting||!tray||tray.isDestroyed()||!service||service.closed)return;const records=trayDownloads(),active=records.filter(d=>['probing','downloading','processing'].includes(d.status)),bytes=records.reduce((n,d)=>n+d.downloaded,0),total=records.reduce((n,d)=>n+d.size,0),rate=active.reduce((n,d)=>n+d.speed,0);tray.setToolTip(('Flow · '+active.length+' '+tr('نشط','active')+'\n'+humanSize(bytes)+' / '+humanSize(total)+' · '+humanSize(rate)+'/s').slice(0,120));if(win&&!win.isDestroyed())win.setProgressBar(active.length?(total?Math.min(1,bytes/total):2):-1);for(const w of toolsWindows?.windows.values()||[])if(!w.isDestroyed()&&w.flowDownloadId){const d=service.store.find(w.flowDownloadId);w.setProgressBar(d&&['probing','downloading','processing'].includes(d.status)?d.size?Math.min(1,d.downloaded/d.size):2:-1);}}
function syncWake(){const needed=!!service?.store.settings.preventSleep&&(!!service?.engine.active.size||service?.peers.records.some(d=>['active','waiting'].includes(d.state)));if(needed&&(wakeId===undefined||!powerSaveBlocker.isStarted(wakeId)))wakeId=powerSaveBlocker.start('prevent-app-suspension');if(!needed&&wakeId!==undefined){powerSaveBlocker.stop(wakeId);wakeId=undefined;}return wakeId!==undefined&&powerSaveBlocker.isStarted(wakeId);}
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
async function createWindow(background=process.argv.includes('--background')){
  win=new BrowserWindow({width:Math.min(1280,screen.getPrimaryDisplay().workAreaSize.width),height:Math.min(800,screen.getPrimaryDisplay().workAreaSize.height),minWidth:640,minHeight:440,show:false,backgroundColor:'#f3f5f7',title:'Flow — Download Manager',icon:path.join(__dirname,'../ui/logo.png'),autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  const mainWindow=win;guardWindow(win,web.origin,'main');if(toolsWindows)toolsWindows.main=win;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==web.origin)event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  win.on('blur',()=>{if(!mainWindow.isDestroyed()&&!mainWindow.webContents.isDestroyed())mainWindow.webContents.executeJavaScript('typeof closeDesktopMenus===\"function\"&&closeDesktopMenus()').catch(()=>{});});
  win.on('close',event=>{if(!quitting&&tray&&!tray.isDestroyed()&&service.store.settings.closeToTray){event.preventDefault();mainWindow.hide();}});
  win.on('minimize',()=>{if(!quitting&&tray&&!tray.isDestroyed()&&service.store.settings.minimizeToTray)mainWindow.hide();});
  win.on('closed',()=>{if(win===mainWindow){win=null;if(toolsWindows)toolsWindows.main=null;}runtimeEvent({event:'main-window-closed',quitting});});
  await win.loadURL(web.origin);win.webContents.setZoomFactor(Math.max(.8,Math.min(1.5,service.store.settings.textScale/100)));if(!background)win.show();return win;
}
async function createDrop(){
  if(drop&&!drop.isDestroyed()){drop.close();drop=null;return;}
  drop=new BrowserWindow({width:220,height:125,frame:false,alwaysOnTop:true,resizable:false,skipTaskbar:true,backgroundColor:'#f2f8f5',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  drop.webContents.setWindowOpenHandler(()=>({action:'deny'}));drop.webContents.on('will-navigate',e=>e.preventDefault());await drop.loadURL(web.origin+'/drop.html');
}
if(!app.requestSingleInstanceLock({version:app.getVersion()})){
 app.whenReady().then(async()=>{let residentVersion;try{const response=await fetch('http://127.0.0.1:'+(Number(process.env.FLOW_PORT)||17863)+'/health',{signal:AbortSignal.timeout(2000)});residentVersion=(await response.json()).version;}catch{}if(!process.argv.includes('--background')&&residentVersion!==app.getVersion())dialog.showMessageBoxSync({type:'info',title:'Flow is already running',message:'Another Flow instance is already running.',detail:'Exit Flow using Tasks → Exit or the tray menu before opening this edition. An older running copy cannot apply a newer update. Your library is kept.',buttons:['OK']});app.quit();});
}else{
  app.on('second-instance',(_event,args)=>{if(!service||!toolsWindows){pendingCLI.push(args);return;}cli(args).catch(writeLog);if(!args.includes('--background'))showMain().catch(writeLog);});
  app.whenReady().then(async()=>{
    const protectedStorage=safeStorage.isEncryptionAvailable()&&!(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text')?{encrypt:v=>safeStorage.encryptString(v),decrypt:v=>safeStorage.decryptString(v)}:undefined;
    if(!protectedStorage&&process.platform!=='linux')throw Error('تعذر الوصول إلى مخزن مفاتيح النظام الآمن');
    startup=new StartupManager(app,{portable:process.env.PORTABLE_EXECUTABLE_FILE||process.env.APPIMAGE});
    const desktop={
      runtimeStatus:()=>({version:app.getVersion(),shutdown:completionPower?.snapshot()||null,platform:process.platform,keyProtection:protectedStorage?'system-keyring':'local-private-key',startup:startup.status(),trayResident:!!tray&&!tray.isDestroyed(),softwareRendering:!process.argv.includes('--flow-hardware-acceleration'),rendererRecoveries:win?.flowRecovery?.recovered||0}),
      downloadInfo:async (id,status='pending')=>{for(let n=0;n<200&&!toolsWindows;n++)await new Promise(r=>setTimeout(r,50));if(!toolsWindows)throw Error('نافذة التطبيق لم تجهز بعد');return toolsWindows.open(status==='pending'?'download-info':'details',{id});},
      peerInfo:()=>toolsWindows?.open('tools',{tab:'torrent'}),
      scale:value=>{if(win&&!win.isDestroyed())win.webContents.setZoomFactor(value);toolsWindows?.scale(value);},
      browserFallback:async url=>{validateURL(url,['http:','https:']);await shell.openExternal(url);return true;},
      wakeStatus:()=>syncWake(),
      updateAvailable:async()=>{if(!quitting&&toolsWindows)await toolsWindows.open('updates');},
      openUpdateRelease:async url=>{await shell.openExternal(url);return true;},
      authorProfile:async()=>{await shell.openExternal('https://www.facebook.com/mohamedabdelnaby190');return true;},
      quit:()=>{app.quit();return true;},
      browserExtensions:async()=>{if(process.platform==='linux'){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser','brave-browser','microsoft-edge']){const exe=(process.env.PATH||'').split(path.delimiter).map(dir=>path.join(dir,name)).find(file=>fs.existsSync(file));if(exe){const child=require('node:child_process').spawn(exe,['chrome://extensions'],{detached:true,stdio:'ignore'});child.on('error',writeLog);child.unref();return true;}}throw Error('Open your browser extensions page and load the Flow Companion folder.');}let chrome;for(const base of [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean)){const file=path.join(base,'Google/Chrome/Application/chrome.exe');if(fs.existsSync(file)){chrome=file;break;}}if(!chrome)throw Error('افتح chrome://extensions في كروم');const {spawn}=require('node:child_process');const child=spawn(chrome,['chrome://extensions'],{detached:true,stdio:'ignore',windowsHide:true});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();return true;},
      open:async file=>{const result=await shell.openPath(file);if(result)throw Error(result);return true;},
      folder:file=>{shell.showItemInFolder(file);return true;},
      chooseDirectory:async()=>{const r=await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()||win,{properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];},
      chooseSound:async()=>{const r=await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()||win,{filters:[{name:'WAV',extensions:['wav']}],properties:['openFile']});return r.canceled?null:r.filePaths[0];},
      playSound:(file,event)=>require('./sounds.cjs').playSound(file,event),
      startup:enabled=>startup.apply(enabled),cancelShutdown:()=>completionPower?.cancel(),
      vpnConnect:async name=>{if(process.platform!=='win32'||!name)throw Error('اختر اسم اتصال VPN مسجل في ويندوز');await runFile('rasdial.exe',[name]);return true;},
      vpnDisconnect:async name=>{if(process.platform!=='win32'||!name)throw Error('اختر اسم اتصال VPN مسجل في ويندوز');await runFile('rasdial.exe',[name,'/disconnect']);return true;}
    };
    service=new Service(path.join(app.getPath('userData'),'FlowData'),{protection:protectedStorage,desktop});
    // Use the user's Downloads folder for the first desktop launch.
    if(!service.store.get('desktopInitialized')){service.store.saveSettings({downloadDir:path.join(app.getPath('downloads'),'Flow')});service.store.set('desktopInitialized',true);}
    web=await createServer(service,Number(process.env.FLOW_PORT)||17863);
    if(service.store.settings.startAtLogin&&!process.env.FLOW_SMOKE_TEST&&!process.env.FLOW_QA_SCRIPT)try{startup.reconcile();}catch(error){writeLog(error);}
    runtimeEvent({event:'started',version:app.getVersion(),background:process.argv.includes('--background'),softwareRendering:!process.argv.includes('--flow-hardware-acceleration')});
    service.browserBridge=new BrowserBridge(app,service,web.origin);try{await service.browserBridge.ensure();}catch(error){writeLog(error);service.store.log('browser',error.message);}
    if(process.env.FLOW_SMOKE_BROWSER_INSTALL)await service.browserBridge.install();
    const trusted=event=>{try{return (!!win&&!win.isDestroyed()&&win.webContents===event.sender||!!drop&&!drop.isDestroyed()&&drop.webContents===event.sender||toolsWindows?.owns(event.sender))&&!!event.senderFrame&&new URL(event.senderFrame.url).origin===web.origin;}catch{return false;}};
    ipcMain.handle('flow:action',async(event,type,data)=>{
      if(quitting)return false;
      if(!trusted(event))throw Error('مصدر غير موثوق');
      if(drop&&!drop.isDestroyed()&&event.sender===drop.webContents&&!['add','dropClose'].includes(type))throw Error('أمر غير مسموح');
      if(type==='add'&&drop&&!drop.isDestroyed()&&event.sender===drop.webContents)return service.browserAdd(data);
      if(type==='shutdownCancel')return completionPower?.cancel();
      if(type==='windowHide'){const target=BrowserWindow.fromWebContents(event.sender);rememberTrayWindow(target);target?.hide();return true;}
      if(type==='windowReload')return BrowserWindow.fromWebContents(event.sender)?.flowRecovery?.retry()||false;
      if(type==='window')return toolsWindows.open(data.kind,data);
      if(type==='windowMinimize'){BrowserWindow.fromWebContents(event.sender)?.minimize();return true;}
      if(type==='windowClose'){const target=BrowserWindow.fromWebContents(event.sender);if(target&&target!==win)target.close();return true;}
      if(type==='drop'){await createDrop();return true;}if(type==='dropClose'){drop?.close();drop=null;return true;}
      const result=await service.action(type,data);if(type==='settings'&&data.language)syncNativeLanguage();return result;
    });
    ipcMain.handle('flow:state',event=>{if(quitting)return {error:'البرنامج يغلق'};if(!trusted(event))throw Error('مصدر غير موثوق');const owner=BrowserWindow.fromWebContents(event.sender);return {...service.snapshot(),windowVisible:!!owner&&owner.isVisible()&&!owner.isMinimized()};});
    service.engine.on('complete',item=>{if(service.store.settings.completionDialog&&toolsWindows)toolsWindows.open('complete',{id:item.id}).catch(writeLog);safeSend(win,'flow:complete',{id:item.id,name:item.name});playEventSound('complete');try{if(Notification.isSupported())new Notification({title:tr('اكتمل التحميل','Download complete'),body:item.name}).show();}catch(error){writeLog(error);}});
    service.engine.on('failure',()=>{playEventSound('error');});
    service.engine.on('queueComplete',()=>{playEventSound('queue');});
    service.engine.on('quitRequested',()=>app.quit());
    completionPower=new (require('./completion-power.cjs').CompletionPower)(service,{onPrompt:()=>toolsWindows.open('shutdown')});service.engine.on('shutdownRequested',queue=>completionPower.request(queue).catch(writeLog));
    await ensureMain();toolsWindows=new ToolWindows({BrowserWindow,service,origin:web.origin,main:win,screen,guardWindow});
    service.engine.on('started',d=>{if(service.store.settings.showProgress)toolsWindows.open('details',{id:d.id}).catch(writeLog);});
    for(const d of service.store.list().filter(d=>d.status==='pending'))toolsWindows.open('download-info',{id:d.id}).catch(writeLog);
    wakeTimer=setInterval(syncWake,500);
    await cli(process.argv);
    tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../ui/logo.png')).resize({width:20,height:20}));tray.setToolTip('Flow Download Manager');tray.on('double-click',()=>restoreTrayWindow().catch(writeLog));tray.on('click',()=>restoreTrayWindow().catch(writeLog));syncNativeLanguage();tray.on('right-click',syncNativeLanguage);trayTimer=setInterval(()=>{try{updateTray();}catch(error){writeLog(error);}},1000);updateTray();
    for(const args of pendingCLI.splice(0)){await cli(args);if(!args.includes('--background'))await showMain();}
    let lastClip='';clipTimer=setInterval(()=>{if(!service.store.settings.monitorClipboard)return;const text=clipboard.readText().trim();if(text===lastClip)return;lastClip=text;
      try{const u=validateURL(text);const ext=u.pathname.split('.').pop().toUpperCase();if(service.store.settings.fileTypes.split(/[ ,]+/).includes(ext))safeSend(win,'flow:clipboard',text);}catch{}
    },1500);
    if(!process.env.FLOW_SMOKE_TEST&&!process.env.FLOW_QA_SCRIPT)service.updates.start();
    if(process.env.FLOW_QA_SCRIPT){try{await require(path.resolve(process.env.FLOW_QA_SCRIPT))({app,win,service,web,toolsWindows,tray,startup,showMain});app.quit();}catch(error){writeLog(error);smokeReport({stage:'error',error:error.stack});app.quit();}return;}
    if(process.env.FLOW_SMOKE_TEST){setTimeout(async()=>{
      try{if(process.env.FLOW_SMOKE_VIEW)await win.webContents.executeJavaScript(process.env.FLOW_SMOKE_VIEW);await new Promise(r=>setTimeout(r,500));const state=await win.webContents.executeJavaScript('({title:document.title,bridge:!!window.desktopAPI,connection:document.querySelector("#connection-state")?.textContent,bodyWidth:document.body.scrollWidth,viewport:innerWidth})');const report={stage:'complete',...state,database:service.store.realm.path,electron:process.versions.electron,sandbox:win.webContents.getLastWebPreferences().sandbox};console.log('ELECTRON_SMOKE_OK',JSON.stringify(report));smokeReport(report);if(process.env.FLOW_SMOKE_IMAGE){const capture=await win.webContents.capturePage();fs.writeFileSync(process.env.FLOW_SMOKE_IMAGE,capture.toPNG());}app.quit();}catch(e){console.error(e);smokeReport({stage:'error',error:e.message});app.quit();}
    },Number(process.env.FLOW_SMOKE_DELAY)||2500);}
  }).catch(e=>{console.error(e);smokeReport({stage:'error',error:e.message});if(!process.env.FLOW_SMOKE_TEST){showFatalError(e).catch(()=>app.exit(1));return;}app.quit();});
  app.on('before-quit',event=>{if(quitting)return;event.preventDefault();quitting=true;completionPower?.close();toolsWindows?.closeAll();clearInterval(clipTimer);clearInterval(wakeTimer);clearInterval(trayTimer);if(wakeId!==undefined)powerSaveBlocker.stop(wakeId);win?.flowRecovery?.dispose();Promise.resolve().then(async()=>{if(service)await service.close();if(web)await web.close();app.exit(0);}).catch(()=>app.exit(1));});
  app.on('window-all-closed',()=>{if(!quitting&&(!tray||tray.isDestroyed()))app.quit();});
}
module.exports={parseCLI};
