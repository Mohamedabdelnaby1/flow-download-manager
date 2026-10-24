const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events');
const {StartupManager,startupTarget,WindowRecovery,rotatingLog,safeSend}=require('../src/lifecycle.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fakeWindow(){const w=new EventEmitter();w.webContents=new EventEmitter();w.destroyed=false;w.loads=[];w.isDestroyed=()=>w.destroyed;w.webContents.isDestroyed=()=>w.destroyed;w.webContents.isCrashed=()=>false;w.webContents.forcefullyCrashRenderer=()=>w.webContents.emit('render-process-gone',{}, {reason:'killed',exitCode:1});w.loadURL=async u=>{w.loads.push(u);w.webContents.emit('did-finish-load');};return w;}
test('startup uses the permanent portable launcher and explicit background argument',()=>{
 const target=startupTarget({executable:path.resolve('temp/Flow.exe'),portable:path.resolve('outputs/Flow-2.5.4-Portable.exe')});assert.equal(target.path,path.resolve('outputs/Flow-2.5.4-Portable.exe'));assert.deepEqual(target.args,['--background']);assert.equal(target.name,'electron.app.Flow');
});
test('installed startup overwrites the legacy key and verifies registration before success',()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'flow-startup-')),'Flow.exe');fs.writeFileSync(file,'fixture');let value=false,calls=[];const app={isPackaged:true,getAppPath:()=>path.dirname(file),setLoginItemSettings:o=>{calls.push(o);value=o.openAtLogin;},getLoginItemSettings:()=>({openAtLogin:value,executableWillLaunchAtLogin:value})};
 const manager=new StartupManager(app,{executable:file});assert.equal(manager.apply(true).enabled,true);assert.deepEqual(calls[0],{name:'electron.app.Flow',path:file,args:['--background'],openAtLogin:true});assert.equal(manager.apply(false).enabled,false);
 app.setLoginItemSettings=()=>{};assert.throws(()=>manager.apply(true),/Windows did not/);
});
test('startup reconciliation respects Windows Startup apps being explicitly disabled',()=>{
 let called=false;const app={isPackaged:true,getAppPath:()=>path.resolve('.'),setLoginItemSettings:()=>called=true,getLoginItemSettings:()=>({openAtLogin:false,launchItems:[{name:'electron.app.Flow',enabled:false}]})};const manager=new StartupManager(app);assert.equal(manager.reconcile().enabled,false);assert.equal(called,false);
});
test('crashed renderer reloads only its own trusted URL and never closes the service',async()=>{
 const w=fakeWindow(),events=[],guard=new WindowRecovery(w,{url:'http://127.0.0.1:17863/?window=details&id=test',fallback:'http://127.0.0.1:17863/recovery.html',delay:5,log:e=>events.push(e)});w.webContents.emit('render-process-gone',{}, {reason:'crashed',exitCode:1});await wait(20);assert.equal(w.loads.length,1);assert.match(w.loads[0],/window=details/);assert.equal(guard.recovered,1);assert.equal(events[0].event,'renderer-gone');guard.dispose();
});
test('unresponsive recovery is delayed, cancelled on responsiveness and forces a fresh renderer',async()=>{
 const w=fakeWindow(),guard=new WindowRecovery(w,{url:'original',fallback:'fallback',hangDelay:10});w.emit('unresponsive');w.emit('responsive');await wait(20);assert.equal(w.loads.length,0);w.emit('unresponsive');await wait(30);assert.deepEqual(w.loads,['original']);guard.dispose();
});
test('recovery budget displays a fallback instead of an infinite reload loop; manual retry works',async()=>{
 const w=fakeWindow(),guard=new WindowRecovery(w,{url:'original',fallback:'fallback',max:2});await guard.recover('test');await guard.recover('test');await guard.recover('test');assert.deepEqual(w.loads,['original','original','fallback']);assert.equal(guard.fallbackShown,true);await guard.retry();assert.equal(w.loads.at(-1),'original');assert.equal(guard.fallbackShown,false);guard.dispose();
});
test('renderer recovery does not resurrect closed windows or interfere with explicit quit',async()=>{
 const w=fakeWindow();let quitting=false;const guard=new WindowRecovery(w,{url:'original',fallback:'fallback',delay:5,stopping:()=>quitting});w.webContents.emit('render-process-gone',{}, {reason:'crashed'});quitting=true;await wait(20);assert.equal(w.loads.length,0);guard.dispose();
});
test('native sends tolerate destroyed or crashed renderer processes',()=>{
 const w=fakeWindow();let sent=0;w.webContents.send=()=>sent++;assert.equal(safeSend(w,'test',{}),true);w.webContents.isCrashed=()=>true;assert.equal(safeSend(w,'test',{}),false);w.destroyed=true;assert.equal(safeSend(w,'test',{}),false);assert.equal(safeSend(null,'test',{}),false);assert.equal(sent,1);
});
test('idle diagnostic logs rotate at a bounded size rather than growing without limit',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-logs-')),file=path.join(root,'desktop.log');for(let i=0;i<25;i++)rotatingLog(file,'x'.repeat(120),{limit:300,keep:2});assert.ok(fs.statSync(file).size<500);assert.ok(fs.existsSync(file+'.1')&&fs.existsSync(file+'.2'));assert.equal(fs.readdirSync(root).length,3);
});
