// Launch with Electron as a separate entry. Simulate a native loader refusal,
// without changing Windows policies, installed files or the real user profile.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{app,dialog}=require('electron');
const output=path.resolve(process.argv[2]),load=Module._load;let failures=0;
app.setPath('userData',output+'.profile');
Module._load=function(request,parent,...args){if(request==='./service.cjs'&&parent?.filename.endsWith(path.join('src','electron.cjs'))){failures++;throw Error('An Application Control policy has blocked this file. realm.node');}return load.call(this,request,parent,...args);};
dialog.showErrorBox=(title,message)=>{fs.writeFileSync(output,JSON.stringify({errors:['Uncaught Electron error dialog: '+title+' '+message]}));app.exit(1);};
dialog.showMessageBox=async options=>{const errors=[];if(failures!==1)errors.push('The native loader failure was not exercised exactly once');if(options.message!=='Windows blocked a required Flow component')errors.push('The policy explanation was not shown');if(options.buttons.some(v=>/restart/i.test(v)))errors.push('A policy failure must not offer a restart loop');if(options.detail.includes('realm.node'))errors.push('Technical paths must stay out of the main guidance');fs.writeFileSync(output,JSON.stringify({passed:errors.length?0:4,checks:['native loader refusal exercised','friendly Flow dialog replaces uncaught JavaScript dialog','no restart loop for policy blocks','technical path omitted from main guidance'],errors},null,2));return {response:options.cancelId};};
require('../src/electron.cjs');
