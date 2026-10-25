// Windows pilot: the existing Node/Realm services run outside the WebView UI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Service}=require('./service.cjs'),{createServer}=require('./server.cjs'),{protection,dpapi}=require('./native-protection.cjs');
const args=Object.fromEntries(process.argv.slice(2).reduce((out,v,i,a)=>v.startsWith('--')?[...out,[v.slice(2),a[i+1]]]:out,[])),profile=path.resolve(args.profile||''),executable=path.resolve(args.shell||'');
let service,web,releaseProfile,power,quitTimer,shellLauncher,closing=false,events=[],nativeStatus={connected:false},lastPoll=0,serial=0,wakeKeeper,wakeState=false;const requests=new Map(),version=require('../package.json').version;
function syncWake(){const needed=!!service?.store.settings.preventSleep&&service.engine.active.size+service.peers.activeCount()>0;if(!wakeKeeper&&needed){wakeKeeper=require('node:child_process').spawn(executable,['--keep-awake'],{windowsHide:true,stdio:['pipe','ignore','ignore']});wakeKeeper.on('error',()=>{wakeKeeper=null;wakeState=false;});wakeKeeper.on('exit',()=>{wakeKeeper=null;wakeState=false;});wakeKeeper.stdin.on('error',()=>{});}if(wakeKeeper&&needed!==wakeState){wakeKeeper.stdin.write(needed?'1\n':'0\n');wakeState=needed;}return wakeState;}
function event(type,data){events.push({type,data});if(events.length>300)events=events.slice(-300);}
function host(type,data={},wait=true){shellLauncher?.ensure(nativeStatus,lastPoll);if(!wait){event(type,data);return Promise.resolve(true);}const id=String(++serial);event(type,{...data,requestId:id});return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{requests.delete(id);reject(Error('The desktop window did not respond. Reopen Flow and try again.'));},120000);timer.unref();requests.set(id,{resolve,reject,timer});});}
async function close(){if(closing)return;closing=true;clearInterval(timer);clearTimeout(quitTimer);power?.close();wakeKeeper?.stdin.end('0\n');for(const request of requests.values()){clearTimeout(request.timer);request.reject(Error('Flow is closing.'));}requests.clear();await service?.close();await web?.close();try{fs.unlinkSync(path.join(profile,'native-session.protected'));}catch{}releaseProfile?.();require('realm').shutdown();setTimeout(()=>process.exit(0),20);}
const timer=setInterval(()=>{if(service&&!closing){syncWake();if(events.some(e=>e.type==='window'))shellLauncher?.ensure(nativeStatus,lastPoll);/* Scheduled queues keep the independent service alive until Exit Flow. */}},1000);timer.unref();
for(const stream of [process.stdout,process.stderr])stream.on('error',()=>{});
process.on('uncaughtException',error=>{try{fs.appendFileSync(path.join(profile,'native-backend.log'),require('../ui/error-model.js').redact(error.stack)+'\n');}catch{}close().catch(()=>process.exit(1));});
process.on('unhandledRejection',error=>{event('error',require('../ui/error-model.js').encode(error,'background'));});
async function main(){
 if(!path.isAbsolute(args.profile||'')||!fs.existsSync(executable))throw Error('Invalid desktop launch paths.');
 releaseProfile=require('./native-profile.cjs').acquireProfile(profile);
 require('./native-profile.cjs').backupBeforeNative(profile);
 const desktop={
  runtimeStatus:()=>({version,platform:process.platform,keyProtection:'system-keyring',engine:{independent:true,connected:true},interface:{connected:Date.now()-lastPoll<5000,pid:nativeStatus.uiPid||null},trayResident:!!nativeStatus.trayResident,softwareRendering:false,startup:{supported:true,enabled:!!nativeStatus.startupEnabled,launchInTray:true},shell:'webview2-pilot'}),
  downloadInfo:(id,status='pending')=>host('window',{kind:status==='pending'?'download-info':'details',id}),
  peerInfo:()=>host('window',{kind:'tools',tab:'torrent'}),scale:value=>host('scale',{value},false),
  browserFallback:url=>host('external',{url}),browserExtensions:()=>host('chromeExtensions'),open:file=>host('open',{file}),folder:file=>host('folder',{file}),
  chooseDirectory:()=>host('chooseDirectory'),chooseSound:()=>host('chooseSound'),playSound:(file,event)=>require('./sounds.cjs').playSound(file,event),
  startup:enabled=>host('startup',{enabled}),wakeStatus:()=>syncWake(),
  updateAvailable:()=>host('window',{kind:'updates'}),openUpdateRelease:url=>host('external',{url}),authorProfile:()=>host('external',{url:'https://www.facebook.com/mohamedabdelnaby190'}),
  quit:()=>{if(!quitTimer){event('quit',{});quitTimer=setTimeout(()=>close(),750);}return true;},
  vpnConnect:()=>host('vpn',{command:'connect',name:service.store.settings.vpnName}),vpnDisconnect:()=>host('vpn',{command:'disconnect',name:service.store.settings.vpnName})
 };
 service=new Service(path.join(profile,'FlowData'),{protection:protection(profile,executable),desktop});
 if(!service.store.get('desktopInitialized')){service.store.saveSettings({downloadDir:path.join(require('node:os').homedir(),'Downloads','Flow')});service.store.set('desktopInitialized',true);}
 power=new (require('./completion-power.cjs').CompletionPower)(service,{onPrompt:()=>host('window',{kind:'shutdown'})});desktop.runtimeStatus=(()=>{const original=desktop.runtimeStatus;return()=>({...original(),shutdown:power.snapshot()});})();desktop.cancelShutdown=()=>power.cancel();
 const action=service.action.bind(service);service.action=async(type,data={})=>{
  if(type==='nativePoll'){lastPoll=Date.now();nativeStatus={...data,connected:true,awake:syncWake()};const result=events;events=[];return result;}
  if(type==='nativeReply'){const request=requests.get(data.id);if(request){clearTimeout(request.timer);requests.delete(data.id);data.error?request.reject(Error(String(data.error))):request.resolve(data.value);}return true;}
  if(type==='nativeWindow')return host('window',data);
  if(type==='nativeError'){const model=require('../ui/error-model.js'),packet=model.encode(data.message,'desktop');return {packet,...model.describe(packet,service.store.settings.language)};}
  if(type==='nativeDropAdd')return service.browserAdd(data);
  if(type==='nativeCLI'){
   const flags={};for(let i=0;i<(data.args||[]).length;i++){const key=String(data.args[i]).toLowerCase();if(['/d','/p','/f'].includes(key))flags[key]=data.args[++i];else if(['/a','/q','/s','/h'].includes(key))flags[key]=true;}
   let item;if(flags['/d']){item=await action('add',{url:flags['/d'],directory:flags['/p'],name:flags['/f'],later:!!flags['/a']});if(flags['/q'])service.engine.on('complete',d=>{if(d.id===item.id)desktop.quit();});if(flags['/h'])service.store.log('notice','/h is unavailable: Flow does not disconnect the system connection.');}
   if(flags['/s'])await action('queue',{id:'main',running:true});return item||true;
  }
  if(type==='nativeWindowClosed'){if(data.kind==='download-info'&&service.store.find(data.id)?.status==='pending')await action('remove',{id:data.id});if(data.kind==='shutdown')power.cancel();return true;}
  if(type==='shutdownCancel')return power.cancel();
  return action(type,data);
 };
 web=await createServer(service,Number(args.port)||17865);
 shellLauncher=new (require('./native-launch.cjs').NativeShellLauncher)(executable,['--background','--profile',profile,'--port',new URL(web.origin).port]);
 const app={isPackaged:false,flowExecutable:process.env.PORTABLE_EXECUTABLE_FILE||executable,flowArguments:'--background --profile '+require('./windows-arguments.cjs').quoteWindowsArgument(profile)+' --port '+new URL(web.origin).port,getPath:name=>name==='userData'?profile:require('node:os').homedir(),getAppPath:()=>path.resolve(__dirname,'..')};
 service.browserBridge=new (require('./browser.cjs').BrowserBridge)(app,service,web.origin);await service.browserBridge.ensure();
 service.engine.on('started',d=>{if(service.store.settings.showProgress)host('window',{kind:'details',id:d.id},false);});
 service.engine.on('complete',d=>{if(service.store.settings.completionDialog)host('window',{kind:'complete',id:d.id},false);event('complete',{id:d.id,name:d.name});if(service.store.settings.sounds)require('./sounds.cjs').playSound(service.store.settings.soundComplete,'complete').catch(()=>{});});
 service.engine.on('failure',d=>{event('error',d.error);if(service.store.settings.sounds)require('./sounds.cjs').playSound(service.store.settings.soundError,'error').catch(()=>{});});
 service.engine.on('queueComplete',()=>{if(service.store.settings.sounds)require('./sounds.cjs').playSound(service.store.settings.soundQueue,'queue').catch(()=>{});});
 service.engine.on('shutdownRequested',q=>power.request(q));service.engine.on('quitRequested',()=>desktop.quit());
 const session={origin:web.origin,token:web.token,pid:process.pid,version};const temporary=path.join(profile,'native-session.protected.tmp');fs.writeFileSync(temporary,dpapi(executable,'protect',Buffer.from(JSON.stringify(session))),{mode:0o600});fs.renameSync(temporary,path.join(profile,'native-session.protected'));
 process.stdout.write(JSON.stringify({ready:session})+'\n');lastPoll=Date.now();if(!process.env.FLOW_NATIVE_QA)service.updates.start();
}
main().catch(error=>{process.stderr.write(require('../ui/error-model.js').encode(error,'native-start')+'\n');process.exit(1);});
