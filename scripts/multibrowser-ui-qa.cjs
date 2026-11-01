const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({app,win,service,toolsWindows})=>{
 const root=process.env.FLOW_SMOKE_DIR,checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms)),js=(w,s)=>w.webContents.executeJavaScript(s),check=(name,value)=>{assert.ok(value,name);checks.push(name);};
 async function until(fn){for(let n=0;n<200;n++){if(await fn())return;await wait(50);}throw Error('Browser UI condition timed out');}
 try{service.desktop.startup=async enabled=>({enabled,supported:true});await service.action('settings',{theme:'light',language:'en',sounds:false,monitorClipboard:false});const selected=[],opened=[];service.desktop.browserExtensions=async browser=>{selected.push(browser);return true;};service.desktop.open=async file=>{opened.push(file);return true;};const bridge=service.browserBridge;fs.mkdirSync(bridge.extensionPath,{recursive:true});require('../src/extension-package.cjs').prepareFirefox(path.join(__dirname,'../extension'),bridge.firefoxExtensionPath);
  await toolsWindows.open('integration');const w=toolsWindows.windows.get('integration');await until(()=>js(w,'initialized&&!!document.querySelector("#integration-browser")'));
  check('browser picker contains all eight supported targets',await js(w,'document.querySelector("#integration-browser").options.length===8'));
  check('connection screen displays the running version rather than a hard-coded legacy version',await js(w,'document.querySelector(".browser-metrics").textContent.includes(state.runtime.version)&&!document.querySelector(".browser-metrics").textContent.includes("2.5.4")'));
  for(const browser of ['firefox','opera','opera-gx','edge','brave','vivaldi','chromium','chrome']){
   await js(w,`(()=>{const e=document.querySelector('#integration-browser');e.value=${JSON.stringify(browser)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await js(w,'handleAction("browserExtensions",document.querySelector("[data-action=browserExtensions]"))');check(browser+' uses the selected browser launch action',selected.at(-1)===browser);
  }
  await js(w,'integrationBrowser="firefox";renderIntegration();handleAction("browserFolder",document.querySelector("[data-action=browserFolder]"))');check('Firefox opens its own generated companion folder',opened.at(-1)===bridge.firefoxExtensionPath);
  check('Firefox signing boundary is clearly visible',await js(w,'document.body.innerText.includes("pending signing")'));
  await service.action('settings',{theme:'amoled',language:'ar'});await js(w,'refresh()');check('browser setup switches to Arabic RTL and AMOLED',await js(w,'document.documentElement.dir==="rtl"&&document.body.classList.contains("amoled")'));
  check('browser setup fits without document-level horizontal overflow',await js(w,'document.documentElement.scrollWidth<=innerWidth+1'));
  w.show();await wait(250);fs.writeFileSync(path.join(root,'firefox-setup-ar-amoled.png'),(await w.webContents.capturePage()).toPNG());
  await service.action('settings',{theme:'light',language:'en'});await js(w,'refresh();integrationBrowser="opera";renderIntegration()');await wait(250);fs.writeFileSync(path.join(root,'opera-setup-light.png'),(await w.webContents.capturePage()).toPNG());
 }catch(error){errors.push(error.stack);}finally{fs.writeFileSync(path.join(root,'multibrowser-ui-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,errors,launchesStubbed:true},null,2));}
 if(errors.length)throw Error(errors.join('\n'));
};
