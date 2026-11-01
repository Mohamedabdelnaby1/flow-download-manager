const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const HOST='local.flow.companion';
const {FIREFOX_ID}=require('./browser-targets.cjs');
function quote(value){return "'"+String(value).replace(/'/g,"'\\''")+"'";}
function registerLinux(bridge,{home=os.homedir(),env=process.env,executable=process.execPath}={}){
 const root=bridge.root;fs.mkdirSync(root,{recursive:true,mode:0o700});fs.chmodSync(root,0o700);
 const source=path.join(__dirname,'../native/flow-native-host.cjs').replace(/app\.asar([\\/])/,'app.asar.unpacked$1'),host=path.join(root,'flow-native-host.cjs'),launcher=path.join(root,'flow-native-host');fs.copyFileSync(source,host);fs.chmodSync(host,0o600);
 // Use the bundled Electron runtime as Node, so no Node/Python installation is needed.
 fs.writeFileSync(launcher,'#!/bin/sh\nexec env ELECTRON_RUN_AS_NODE=1 '+quote(env.APPIMAGE||executable)+' '+quote(host)+' "$@"\n',{mode:0o700});fs.chmodSync(launcher,0o700);
 const firefoxFolder=path.join(home,'.mozilla','native-messaging-hosts'),firefoxManifestPath=path.join(firefoxFolder,HOST+'.json');
 const appExecutable=env.APPIMAGE||executable,args=bridge.app.isPackaged?['--background']:[bridge.app.getAppPath(),'--background'];
 fs.writeFileSync(path.join(root,'host-config.json'),JSON.stringify({address:bridge.origin,extensionId:bridge.info().extensionId,firefoxExtensionId:FIREFOX_ID,firefoxManifestPaths:[firefoxManifestPath],token:bridge.service.extensionToken,executable:appExecutable,args}),{mode:0o600});
 const config=env.XDG_CONFIG_HOME||path.join(home,'.config'),manifest={name:HOST,description:'Flow desktop download manager',path:launcher,type:'stdio',allowed_origins:[`chrome-extension://${bridge.info().extensionId}/`]};
 for(const browser of ['google-chrome','chromium','BraveSoftware/Brave-Browser','microsoft-edge','vivaldi','opera','opera-gx']){const folder=path.join(config,browser,'NativeMessagingHosts');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,HOST+'.json'),JSON.stringify(manifest,null,2),{mode:0o600});}
 fs.mkdirSync(firefoxFolder,{recursive:true,mode:0o700});fs.writeFileSync(firefoxManifestPath,JSON.stringify({name:HOST,description:'Flow desktop download manager',path:launcher,type:'stdio',allowed_extensions:[FIREFOX_ID]},null,2),{mode:0o600});
 fs.writeFileSync(bridge.manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});return bridge.info();
}
module.exports={registerLinux,quote};
