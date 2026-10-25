const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const HOST='local.flow.companion';
const manifest=require('../extension/manifest.json');
const extensionId=[...crypto.createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest().subarray(0,16)].map(b=>'abcdefghijklmnop'[b>>4]+'abcdefghijklmnop'[b&15]).join('');
class BrowserBridge{
  constructor(app,service,origin){this.app=app;this.service=service;this.origin=origin;this.root=path.join(app.getPath('userData'),'BrowserIntegration');this.extensionPath=path.join(this.root,'Flow-Companion');this.manifestPath=path.join(this.root,HOST+'.json');}
  info(){return {registered:fs.existsSync(this.manifestPath),extensionPath:this.extensionPath,extensionId};}
  install(){if(this.installing)return this.installing;this.installing=this.installOnce().finally(()=>this.installing=null);return this.installing;}
  async installOnce(){
    if(!['win32','linux'].includes(process.platform))throw Error('Native browser integration supports Windows and Linux.');
    fs.mkdirSync(this.root,{recursive:true});
    fs.cpSync(path.join(__dirname,'../extension'),this.extensionPath,{recursive:true});
    if(process.platform==='linux'){const result=require('./linux.cjs').registerLinux(this);this.service.store.saveSettings({integration:true});return result;}
    const host=path.join(this.root,'FlowNativeHost.exe'),source=this.app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked/native/FlowNativeHost.exe'):path.join(__dirname,'../native/FlowNativeHost.exe');
    if(!fs.existsSync(host)||!fs.readFileSync(source).equals(fs.readFileSync(host)))fs.copyFileSync(source,host);
    await this.configure(host);
    fs.writeFileSync(this.manifestPath,JSON.stringify({name:HOST,description:'Flow desktop download manager',path:host,type:'stdio',allowed_origins:[`chrome-extension://${extensionId}/`]},null,2));
    await require('./windows-bridge.cjs').register(this.manifestPath,HOST);
    this.service.store.saveSettings({integration:true});return this.info();
  }
  async configure(host=path.join(this.root,'FlowNativeHost.exe')){
    if(!fs.existsSync(host))return;
    const executable=this.app.flowExecutable||process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;
    const args=this.app.flowArguments||(this.app.isPackaged?'--background':`"${this.app.getAppPath()}" --background`);
    await require('./windows-bridge.cjs').configure({configFile:path.join(this.root,'host-config.json'),address:this.origin,extensionId,token:this.service.extensionToken,executable,arguments:args});
  }
  async ensure(){if(!fs.existsSync(this.manifestPath))return;await this.install();}
}
module.exports={BrowserBridge,extensionId,HOST};
