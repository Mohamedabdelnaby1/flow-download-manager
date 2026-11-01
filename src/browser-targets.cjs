const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const FIREFOX_ID='flow-companion@mohamedabdelnaby1.github.io';
const TARGETS=[
 {id:'chrome',name:'Chrome',family:'chromium',page:'chrome://extensions',windows:['Google/Chrome/Application/chrome.exe'],linux:['google-chrome','google-chrome-stable']},
 {id:'edge',name:'Edge',family:'chromium',page:'edge://extensions',windows:['Microsoft/Edge/Application/msedge.exe'],linux:['microsoft-edge','microsoft-edge-stable']},
 {id:'firefox',name:'Firefox',family:'firefox',page:'about:debugging#/runtime/this-firefox',windows:['Mozilla Firefox/firefox.exe'],linux:['firefox','firefox-esr']},
 {id:'opera',name:'Opera',family:'chromium',page:'opera://extensions',windows:['Opera/opera.exe','Programs/Opera/opera.exe','Opera/launcher.exe','Programs/Opera/launcher.exe'],linux:['opera','opera-stable']},
 {id:'opera-gx',name:'Opera GX',family:'chromium',page:'opera://extensions',windows:['Opera GX/opera.exe','Programs/Opera GX/opera.exe','Opera GX/launcher.exe','Programs/Opera GX/launcher.exe'],linux:[]},
 {id:'brave',name:'Brave',family:'chromium',page:'brave://extensions',windows:['BraveSoftware/Brave-Browser/Application/brave.exe'],linux:['brave-browser','brave-browser-stable']},
 {id:'vivaldi',name:'Vivaldi',family:'chromium',page:'vivaldi://extensions',windows:['Vivaldi/Application/vivaldi.exe'],linux:['vivaldi','vivaldi-stable']},
 {id:'chromium',name:'Chromium',family:'chromium',page:'chrome://extensions',windows:['Chromium/Application/chrome.exe'],linux:['chromium','chromium-browser']}
];
function target(id='chrome'){const value=TARGETS.find(t=>t.id===id);if(!value)throw Error('Choose a supported browser from the list.');return value;}
function executable(id,{platform=process.platform,env=process.env,exists=fs.existsSync}={}){
 const t=target(id);if(platform==='win32'){for(const base of [env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter(Boolean))for(const name of t.windows){const file=path.join(base,name);if(exists(file))return file;}}
 if(platform==='linux')for(const base of (env.PATH||'').split(path.delimiter).filter(Boolean))for(const name of t.linux){const file=path.join(base,name);if(exists(file))return file;}
 return null;
}
let inventoryCache;function inventory(options){if(!options&&inventoryCache&&Date.now()-inventoryCache.at<10000)return inventoryCache.value;const value=TARGETS.map(({id,name,family,page})=>({id,name,family,page,installed:!!executable(id,options)}));if(!options)inventoryCache={at:Date.now(),value};return value;}
async function openExtensions(id='chrome',options={}){const t=target(id),file=executable(id,options);if(!file)throw Error(t.name+' was not found. Open '+t.page+' in that browser.');const child=(options.spawn||spawn)(file,[t.page],{detached:true,stdio:'ignore',windowsHide:true});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();return true;}
module.exports={TARGETS,FIREFOX_ID,target,executable,inventory,openExtensions};
