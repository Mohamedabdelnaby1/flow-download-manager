const form=document.querySelector('#config'),message=document.querySelector('#message');
async function loadSettings(){const c=await chrome.storage.local.get({address:'http://127.0.0.1:17863',token:'',autoCapture:false,videoPanel:true,fileTypes:'ZIP PDF MP3 MP4 EXE MSI',excludedSites:''});for(const[k,v]of Object.entries(c)){const f=form.elements[k];if(f)f.type==='checkbox'?f.checked=v:f.value=v;}}
loadSettings().catch(e=>message.textContent=e.message);
form.onsubmit=async e=>{e.preventDefault();const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{
 const u=new URL(form.elements.address.value||'http://127.0.0.1:17863');if(u.protocol!=='http:'||!['localhost','127.0.0.1'].includes(u.hostname))throw Error('Use a loopback address only');
 const data={};for(const f of form.querySelectorAll('[name]'))data[f.name]=f.type==='checkbox'?f.checked:f.value;
 data.preferenceOverrides={videoPanel:data.videoPanel,fileTypes:data.fileTypes,excludedSites:data.excludedSites};await chrome.storage.local.set(data);
 const result=await chrome.runtime.sendMessage({type:'ping'});message.textContent=result.error?'Settings saved locally; connection unavailable: '+result.error:'Saved and connected ✓';
 }catch(err){message.textContent=err.message;}finally{buttons.forEach(b=>b.disabled=false);}};
document.querySelector('#desktop-defaults').onclick=async e=>{e.target.disabled=true;try{await chrome.storage.local.remove('preferenceOverrides');const result=await chrome.runtime.sendMessage({type:'ping'});if(result.error)throw Error('Overrides removed. Open Flow and test the connection to refresh settings.');await loadSettings();message.textContent='Restored Flow defaults ✓';}catch(err){message.textContent=err.message;}finally{e.target.disabled=false;}};
