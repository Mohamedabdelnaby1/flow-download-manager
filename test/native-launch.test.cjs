const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {NativeShellLauncher}=require('../src/native-launch.cjs');
test('browser and completion windows reopen a dead UI without restarting a live engine',()=>{
 let now=10000,live=true;const calls=[],children=[];
 const launcher=new NativeShellLauncher('C:\\Flow\\Flow.exe',['--background','--profile','C:\\Flow data'],{now:()=>now,alive:()=>live,launch:(...args)=>{calls.push(args);const child=new EventEmitter();child.unref=()=>{};children.push(child);return child;}});
 assert.equal(launcher.ensure({uiPid:123},0),false);
 live=false;assert.equal(launcher.ensure({uiPid:123},now),true);assert.equal(calls.length,1);
 assert.deepEqual(calls[0][1],['--background','--profile','C:\\Flow data']);assert.equal(calls[0][2].stdio,'ignore');
 assert.equal(launcher.ensure({uiPid:123},0),false);now+=10001;assert.equal(launcher.ensure({uiPid:123},0),true);
 children.at(-1).emit('error',Error('launch failed'));assert.equal(launcher.ensure({uiPid:123},0),true);
});
test('initial UI startup is allowed before a bounded background relaunch',()=>{
 let now=5000,launches=0;const launcher=new NativeShellLauncher('Flow.exe',[],{now:()=>now,launch:()=>{launches++;return Object.assign(new EventEmitter(),{unref(){}});}});
 assert.equal(launcher.ensure({},0),false);now=8000;assert.equal(launcher.ensure({},0),true);assert.equal(launches,1);
});
