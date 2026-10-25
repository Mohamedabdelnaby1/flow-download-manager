const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const actions=require('../src/desktop-actions.json');
test('sandboxed Electron preload needs only its supported Electron require and exposes the same commands',async()=>{
 let exposed;const sent=[],listeners={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/preload.cjs'),'utf8'),{require:name=>{assert.equal(name,'electron','Sandboxed preloads cannot load arbitrary project files');return {contextBridge:{exposeInMainWorld:(name,api)=>{assert.equal(name,'desktopAPI');exposed=api;}},ipcRenderer:{invoke:async(...args)=>{sent.push(args);return true;},on:(n,fn)=>listeners[n]=fn,removeListener:(n)=>delete listeners[n]}};},Set,Promise,Error});
 assert.ok(exposed);
 for(const command of actions)assert.equal(await exposed.action(command),true);
 const count=sent.length;await assert.rejects(exposed.action('nativePoll'));assert.equal(sent.length,count);
});
test('both desktop shells expose the same actions and block private backend commands',async()=>{
 assert.equal(new Set(actions).size,actions.length);
 for(const name of ['appearanceReset','torrentRefresh','windowHide','cancel','browserInstall','shutdownCancel'])assert.ok(actions.includes(name),name);
 const handlers={},messages=[],window={};window.top=window;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../native/webview-bridge.js'),'utf8').replace('/*FLOW_ACTIONS*/[]',JSON.stringify(actions)),{window,chrome:{webview:{postMessage:m=>{messages.push(m);setImmediate(()=>handlers.message({data:{id:m.id,value:true}}));},addEventListener:(n,f)=>handlers[n]=f}},setTimeout,clearTimeout,Error,Map,Set,Object});
 for(const command of actions)assert.equal(await window.desktopAPI.action(command),true);
 const count=messages.length;
 for(const command of ['nativeReply','nativePoll','nativeDropAdd','__proto__'])await assert.rejects(window.desktopAPI.action(command),/not available/);
 assert.equal(messages.length,count);
 assert.ok(Object.isFrozen(window.desktopAPI));
});
