const {spawn}=require('node:child_process');
class NativeShellLauncher{
 constructor(executable,args,{launch=spawn,alive=pid=>{try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}},now=Date.now}={}){Object.assign(this,{executable,args,launch,alive,now});this.lastLaunch=-Infinity;}
 ensure(status,lastPoll){
  if(Number.isInteger(status?.uiPid)&&status.uiPid>0){if(this.alive(status.uiPid))return false;}
  else if(this.now()-lastPoll<8000)return false; // Allow the original shell to finish its first WebView initialization.
  if(this.now()-this.lastLaunch<10000)return false;
  this.lastLaunch=this.now();
  try{const child=this.launch(this.executable,this.args,{detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{this.lastLaunch=-Infinity;});child.unref();return true;}catch{this.lastLaunch=-Infinity;return false;}
 }
}
module.exports={NativeShellLauncher};
