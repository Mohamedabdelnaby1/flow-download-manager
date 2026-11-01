const {test,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {Service,validateSettings}=require('../src/service.cjs');
const {englishMessage}=require('../ui/messages.js');
test('English and system appearance are defaults; preferences survive reopening Realm',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'flow-appearance-'));let service=new Service(dir);
 try{assert.equal(service.store.settings.language,'en');assert.equal(service.store.settings.theme,'system');assert.equal(service.store.queues()[0].name,'Main queue');
 await service.action('settings',{language:'ar',theme:'dark'});await service.close();service=new Service(dir);
 assert.equal(service.store.settings.language,'ar');assert.equal(service.store.settings.theme,'dark');
 await service.action('settings',{language:'en',theme:'system'});
 assert.equal(service.store.settings.theme,'system');
 }finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('invalid appearance is rejected before settings or configuration import can mutate it',()=>{
 for(const value of ['sepia','',null])assert.throws(()=>validateSettings({theme:value}));
 for(const theme of ['system','light','dark','amoled'])assert.equal(validateSettings({theme}).theme,theme);
});
test('AMOLED is persisted as a distinct preference and calls the desktop appearance hook',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'flow-amoled-'));let service=new Service(dir),updates=0;
 try{service.desktop={appearance:()=>updates++};await service.action('settings',{theme:'amoled'});assert.equal(updates,1);await service.close();service=new Service(dir);assert.equal(service.store.settings.theme,'amoled');}
 finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('all accent families retain readable primary buttons in light and dark palettes',()=>{
 const values={},body={dataset:{},style:{setProperty:(key,value)=>values[key]=value},classList:{contains:()=>dark}},context={document:{body},matchMedia:()=>({addEventListener(){}})};let dark=false;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/workspace-appearance.js'),'utf8'),context);
 const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 for(dark of [false,true])for(const accent of Object.keys(context.FlowWorkspaceAppearance.tones)){context.FlowWorkspaceAppearance.apply({accent});const a=luminance(values['--primary']),b=luminance(values['--on-primary']);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,accent+' '+dark);}
});
test('companion appearance follows only the named desktop modes and live storage changes',async()=>{
 const dataset={},listeners=[],context={document:{documentElement:{dataset}},chrome:{storage:{local:{get:async()=>({theme:'amoled'})},onChanged:{addListener:fn=>listeners.push(fn)}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/appearance.js'),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(dataset.theme,'amoled');listeners[0]({theme:{newValue:'light'}},'local');assert.equal(dataset.theme,'light');listeners[0]({theme:{newValue:'unexpected'}},'local');assert.equal(dataset.theme,'system');
});
test('open windows follow OS changes in system mode and retain explicit light/dark overrides',()=>{
 const classes=new Set(),events={},media={matches:false,addEventListener:(name,fn)=>events[name]=fn},style={},dataset={};
 const window={matchMedia:()=>media},document={body:{classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)}},documentElement:{style,dataset}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/appearance.js'),'utf8'),{window,document});
 assert.equal(classes.has('dark'),false);media.matches=true;events.change();assert.equal(classes.has('dark'),true);assert.equal(style.colorScheme,'dark');
 window.applyAppearance('light');events.change();assert.equal(classes.has('dark'),false);
 media.matches=false;window.applyAppearance('dark');events.change();assert.equal(classes.has('dark'),true);
 window.applyAppearance('amoled');assert.equal(classes.has('dark'),true);assert.equal(classes.has('amoled'),true);assert.equal(dataset.resolvedTheme,'amoled');media.matches=true;events.change();assert.equal(classes.has('amoled'),true);media.matches=false;window.applyAppearance('system');assert.equal(classes.has('amoled'),false);assert.equal(classes.has('dark'),false);assert.equal(dataset.theme,'system');
});
test('English service messages retain error codes and keep server text intact',()=>{
 assert.equal(englishMessage('HTTP 403 — الرابط مرفوض أو منتهي الصلاحية'),'HTTP 403 — URL refused or expired');
 assert.equal(englishMessage('قيمة رقمية غير صالحة'),'Invalid numeric value');
 assert.equal(englishMessage('ECONNRESET: server disconnected'),'ECONNRESET: server disconnected');
});
after(()=>require('realm').shutdown());
