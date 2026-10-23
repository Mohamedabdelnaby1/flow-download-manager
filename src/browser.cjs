const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const crypto=require('node:crypto');
const HOST='local.flow.companion';
const manifest=require('../extension/manifest.json');
const extensionId=[...crypto.createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest().subarray(0,16)].map(b=>'abcdefghijklmnop'[b>>4]+'abcdefghijklmnop'[b&15]).join('');
function run(exe,args,input){return new Promise((resolve,reject)=>{const p=spawn(exe,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let error='';p.stderr.on('data',b=>error+=b);p.on('error',reject);p.on('close',code=>code?reject(Error(error||'Browser bridge setup failed')):resolve(true));p.stdin.end(input||'');});}
class BrowserBridge{
  constructor(app,service,origin){this.app=app;this.service=service;this.origin=origin;this.root=path.join(app.getPath('userData'),'BrowserIntegration');this.extensionPath=path.join(this.root,'Flow-Companion');this.manifestPath=path.join(this.root,HOST+'.json');}
  info(){return {registered:fs.existsSync(this.manifestPath),extensionPath:this.extensionPath,extensionId};}
  async install(){
    if(process.platform!=='win32')throw Error('The packaged native bridge supports Windows.');
    fs.mkdirSync(this.root,{recursive:true});
    fs.cpSync(path.join(__dirname,'../extension'),this.extensionPath,{recursive:true});
    const host=path.join(this.root,'FlowNativeHost.exe'),source=this.app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked/native/FlowNativeHost.exe'):path.join(__dirname,'../native/FlowNativeHost.exe');
    if(!fs.existsSync(host)||!fs.readFileSync(source).equals(fs.readFileSync(host)))fs.copyFileSync(source,host);
    await this.configure(host);
    fs.writeFileSync(this.manifestPath,JSON.stringify({name:HOST,description:'Flow desktop download manager',path:host,type:'stdio',allowed_origins:[`chrome-extension://${extensionId}/`]},null,2));
    for(const browser of ['Google\\Chrome','Microsoft\\Edge','BraveSoftware\\Brave-Browser','Chromium'])await run('reg.exe',['ADD',`HKCU\\Software\\${browser}\\NativeMessagingHosts\\${HOST}`,'/ve','/t','REG_SZ','/d',this.manifestPath,'/f']);
    this.service.store.saveSettings({integration:true});return this.info();
  }
  async configure(host=path.join(this.root,'FlowNativeHost.exe')){
    if(!fs.existsSync(host))return;
    const executable=process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;
    const args=this.app.isPackaged?'--background':`"${this.app.getAppPath()}" --background`;
    await run(host,['--configure'],JSON.stringify({address:this.origin,extensionId,token:this.service.extensionToken,executable,arguments:args}));
  }
  async ensure(){if(!fs.existsSync(this.manifestPath))return;await this.install();}
}
module.exports={BrowserBridge,extensionId,HOST};
