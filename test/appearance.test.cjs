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
 for(const theme of ['system','light','dark'])assert.equal(validateSettings({theme}).theme,theme);
});
test('open windows follow OS changes in system mode and retain explicit light/dark overrides',()=>{
 const classes=new Set(),events={},media={matches:false,addEventListener:(name,fn)=>events[name]=fn},style={},dataset={};
 const window={matchMedia:()=>media},document={body:{classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)}},documentElement:{style,dataset}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/appearance.js'),'utf8'),{window,document});
 assert.equal(classes.has('dark'),false);media.matches=true;events.change();assert.equal(classes.has('dark'),true);assert.equal(style.colorScheme,'dark');
 window.applyAppearance('light');events.change();assert.equal(classes.has('dark'),false);
 media.matches=false;window.applyAppearance('dark');events.change();assert.equal(classes.has('dark'),true);
 window.applyAppearance('system');assert.equal(classes.has('dark'),false);assert.equal(dataset.theme,'system');
});
test('English service messages retain error codes and keep server text intact',()=>{
 assert.equal(englishMessage('HTTP 403 — الرابط مرفوض أو منتهي الصلاحية'),'HTTP 403 — URL refused or expired');
 assert.equal(englishMessage('قيمة رقمية غير صالحة'),'Invalid numeric value');
 assert.equal(englishMessage('ECONNRESET: server disconnected'),'ECONNRESET: server disconnected');
});
after(()=>require('realm').shutdown());
