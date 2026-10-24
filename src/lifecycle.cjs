const fs=require('node:fs'),path=require('node:path');
const STARTUP_NAME='electron.app.Flow';
function startupTarget({executable,portable,packaged=true,appPath}){
 const target=portable||executable;if(!path.isAbsolute(target))throw Error('Startup executable must have an absolute path');
 return {name:STARTUP_NAME,path:target,args:[...(!packaged&&!portable?[appPath]:[]),'--background']};
}
class StartupManager{
 constructor(app,options={}){this.app=app;this.target=startupTarget({executable:options.executable||process.execPath,portable:options.portable,packaged:app.isPackaged,appPath:app.getAppPath()});}
 status(force=false){if(!force&&this.cached&&Date.now()-this.cachedAt<10000)return this.cached;try{const value=this.app.getLoginItemSettings(this.target);this.cached={supported:process.platform==='win32',enabled:!!value.openAtLogin&&value.executableWillLaunchAtLogin!==false,launchInTray:true,portable:!!this.target.path&&this.target.path!==process.execPath};this.cachedAt=Date.now();return this.cached;}catch{return {supported:false,enabled:false,launchInTray:true};}}
 reconcile(){const current=this.app.getLoginItemSettings(this.target);if(current.launchItems?.some(i=>i.name===STARTUP_NAME&&i.enabled===false))return this.status(true);return this.apply(true);}
 apply(enabled){if(enabled&&!fs.existsSync(this.target.path))throw Error('The startup launcher is missing. Open Flow from a permanent location and try again.');this.app.setLoginItemSettings({...this.target,openAtLogin:!!enabled});const status=this.status(true);if(enabled&&!status.enabled)throw Error('Windows did not enable Flow startup. Check Startup apps in Windows Settings.');return status;}
}
function rotatingLog(file,value,{limit=2*1024*1024,keep=2}={}){try{fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&fs.statSync(file).size>=limit){for(let i=keep;i>1;i--)if(fs.existsSync(file+'.'+(i-1)))fs.renameSync(file+'.'+(i-1),file+'.'+i);fs.renameSync(file,file+'.1');}fs.appendFileSync(file,new Date().toISOString()+' '+String(value).slice(0,16000)+'\n');}catch{}}
function safeSend(window,channel,payload){if(!window||window.isDestroyed()||window.webContents.isDestroyed()||window.webContents.isCrashed())return false;try{window.webContents.send(channel,payload);return true;}catch{return false;}}
class WindowRecovery{
 constructor(window,{url,fallback,stopping=()=>false,log=()=>{},delay=300,hangDelay=8000,max=3,period=300000,now=Date.now}={}){
  Object.assign(this,{window,url,fallback,stopping,log,delay,hangDelay,max,period,now});this.attempts=[];this.recovering=false;this.disposed=false;this.recovered=0;this.fallbackShown=false;
  window.webContents.on('render-process-gone',(_event,details)=>{this.log({event:'renderer-gone',reason:details.reason,exitCode:details.exitCode});if(details.reason!=='clean-exit')this.schedule('renderer-gone');});
  window.on('unresponsive',()=>{this.log({event:'unresponsive'});clearTimeout(this.hangTimer);this.hangTimer=setTimeout(()=>this.recover('unresponsive',true),this.hangDelay);this.hangTimer.unref();});
  window.on('responsive',()=>clearTimeout(this.hangTimer));
  window.webContents.on('did-finish-load',()=>{this.recovering=false;clearTimeout(this.hangTimer);});
  window.on('closed',()=>this.dispose());
 }
 available(){return !this.disposed&&!this.stopping()&&!this.window.isDestroyed()&&!this.window.webContents.isDestroyed();}
 schedule(reason){if(!this.available()||this.recovering||this.retryTimer)return;this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.recover(reason);},this.delay);this.retryTimer.unref();}
 async recover(reason,force=false){
  if(!this.available()||this.recovering)return false;this.recovering=true;clearTimeout(this.hangTimer);this.attempts=this.attempts.filter(t=>this.now()-t<this.period);
  try{
   if(this.attempts.length>=this.max){if(!this.fallbackShown){this.fallbackShown=true;this.log({event:'recovery-paused',reason});await this.window.loadURL(this.fallback);}return false;}
   this.attempts.push(this.now());this.recovered++;this.log({event:'renderer-reload',reason,attempt:this.attempts.length});
   if(force)await new Promise(resolve=>{const contents=this.window.webContents;const finish=()=>{clearTimeout(timer);contents.removeListener('render-process-gone',finish);resolve();};const timer=setTimeout(finish,700);contents.once('render-process-gone',finish);contents.forcefullyCrashRenderer();});
   await this.window.loadURL(this.url);this.fallbackShown=false;return true;
  }catch(error){this.log({event:'recovery-load-failed',message:error.message});return false;}finally{this.recovering=false;}
 }
 retry(){this.attempts=[];this.fallbackShown=false;return this.recover('manual-retry',true);}
 dispose(){this.disposed=true;clearTimeout(this.retryTimer);clearTimeout(this.hangTimer);}
}
module.exports={StartupManager,startupTarget,WindowRecovery,rotatingLog,safeSend,STARTUP_NAME};
