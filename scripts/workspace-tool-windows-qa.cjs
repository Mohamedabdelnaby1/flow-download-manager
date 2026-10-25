const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({app,win,service,toolsWindows})=>{
 const checks=[],errors=[],root=process.env.FLOW_SMOKE_DIR,wait=ms=>new Promise(r=>setTimeout(r,ms)),js=(w,s)=>w.webContents.executeJavaScript(s);
 async function until(fn){for(let i=0;i<200;i++){try{if(await fn())return;}catch{}await wait(50);}throw Error('Tool window did not become ready');}
 try{await until(()=>js(win,'initialized&&!!window.desktopAPI'));await service.action('settings',{sounds:false,monitorClipboard:false,showProgress:false,completionDialog:false});await toolsWindows.open('tools');const hub=toolsWindows.windows.get('tools');await until(()=>js(hub,'initialized&&!!window.desktopAPI'));
 for(const language of ['en','ar']){await service.action('settings',{language});await js(hub,'refresh()');const catalog=await js(hub,'toolCatalog().map(t=>({id:t[0],kind:t[5],tab:t[6]}))');assert.equal(catalog.length,21);
 for(const tool of catalog){await js(hub,'openTools("home")');await js(hub,`handleAction('toolsLaunch',document.querySelector('.tools-card[data-tool-id="${tool.id}"]'))`);await until(()=>toolsWindows.windows.has(tool.kind));const w=toolsWindows.windows.get(tool.kind),variable={tools:'toolsTab',power:'powerTab',smart:'smartTab',library:'libraryTab'}[tool.kind];await until(()=>js(w,`initialized&&${variable}===${JSON.stringify(tool.tab)}&&document.querySelector('#dialog-content').textContent.trim().length>10`));checks.push(language+': actual '+tool.id+' card opens its correct tool tab');}
 }
 }catch(error){errors.push(error.stack);}finally{fs.writeFileSync(path.join(root,'workspace-tool-windows-qa.json'),JSON.stringify({version:app.getVersion(),packaged:app.isPackaged,passed:checks.length,checks,errors},null,2));}if(errors.length)throw Error(errors.join('\n'));
};
