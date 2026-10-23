importScripts('media-model.js','messages.js');
const localMessage=value=>typeof englishMessage==='function'?englishMessage(value):value;
/* Manifest V3: native handoff and authenticated HTTP fallback. */
const HOST='local.flow.companion',media=new Map(),requests=new Map(),inFlight=new Set(),pausedDiscovery=new Set();
chrome.storage.session.get(null).then(cache=>{for(const key of Object.keys(cache))if(key.startsWith('mediaPaused:')&&cache[key])pausedDiscovery.add(Number(key.slice(12)));});
chrome.storage.session.get(null).then(cache=>{const keys=Object.keys(cache).filter(k=>k.startsWith('request:'));for(const k of keys.slice(-150))if(!requests.has(k.slice(8)))requests.set(k.slice(8),cache[k]);if(keys.length>150)chrome.storage.session.remove(keys.slice(0,-150)).catch(()=>{});});
const defaults={address:'http://127.0.0.1:17863',token:'',autoCapture:false,fileTypes:'ZIP RAR 7Z PDF DOCX XLSX MP3 MP4 MKV EXE MSI ISO',excludedSites:'',videoPanel:true,panelMode:'full',capturePausedUntil:0,captureDisabledSites:[]};
const client=/Edg\//.test(navigator.userAgent)?'Edge':/Chrome\//.test(navigator.userAgent)?'Chrome':'Chromium';
async function config(){return chrome.storage.local.get(defaults);}
function excluded(url,c){const host=new URL(url).hostname.toLowerCase();return c.excludedSites.toLowerCase().split(/[\s,;]+/).filter(Boolean).some(h=>host===h.replace(/^\*\./,'')||h.startsWith('*.')&&host.endsWith(h.slice(1)));}
function capturePaused(c,url,sourcePage){if(Date.now()<Number(c.capturePausedUntil||0))return true;const hosts=(c.captureDisabledSites||[]).map(v=>v.toLowerCase());return [url,sourcePage].filter(Boolean).some(value=>{try{return hosts.includes(new URL(value).hostname.toLowerCase());}catch{return false;}});}
function fileMatch(url,name,c){let value=name;try{value||=decodeURIComponent(new URL(url).pathname);}catch{return false;}return c.fileTypes.toUpperCase().split(/[\s,;]+/).includes(value.split(/[\\/]/).pop().split('.').pop().toUpperCase());}
async function fail(error){await chrome.storage.session.set({lastError:error.message});await chrome.action.setBadgeText({text:'!'});await chrome.action.setBadgeBackgroundColor({color:'#ba4349'});}
async function transport(message){
  let nativeError;
  try{const out=await chrome.runtime.sendNativeMessage(HOST,{...message,client,extensionVersion:chrome.runtime.getManifest().version});if(out?.error)throw Error(localMessage(out.error));if(!out||message.type==='ping'&&out.app!=='Flow')throw Error('Invalid native response');await chrome.storage.session.set({transport:'Native Messaging',lastConnected:Date.now(),...(message.type==='download'?{lastError:''}:{})});return out;}
  catch(e){nativeError=e;}
  const c=await config();if(!c.token)throw Error('Open Flow → Browser integration → Set up, then reload this extension. '+nativeError.message);
  const u=new URL(c.address);if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw Error('Use a local Flow address.');
  const r=await fetch(u.origin+(message.type==='ping'?'/extension/ping':'/extension/add'),{method:'POST',headers:{'content-type':'application/json','x-flow-token':c.token},body:JSON.stringify({...message,client,extensionVersion:chrome.runtime.getManifest().version}),signal:AbortSignal.timeout(8000)});const out=await r.json();if(!r.ok)throw Error(out.error||'Flow connection failed');await chrome.storage.session.set({transport:'Local HTTP',lastConnected:Date.now(),...(message.type==='download'?{lastError:''}:{})});return out;
}
async function requestInfo(url){return requests.get(url)||(await chrome.storage.session.get('request:'+url))['request:'+url]||{method:'GET',headers:{}};}
async function downloadHeaders(url,sourcePage){
  const info=await requestInfo(url),headers={...info.headers};if(sourcePage&&!headers.referer)headers.referer=sourcePage;
  if(!headers.cookie){try{const cookies=await chrome.cookies.getAll({url});if(cookies.length)headers.cookie=cookies.map(c=>c.name+'='+c.value).join('; ');}catch{}}
  headers['user-agent']||=navigator.userAgent;return {headers,method:info.method};
}
async function sendDownload(data){
  const desktop=await transport({type:'ping'});requireCurrentDesktop(desktop);
  const url=new URL(data.url);if(!['http:','https:'].includes(url.protocol))throw Error('Only direct HTTP/HTTPS files can be transferred.');
  const {headers,method}=await downloadHeaders(url.href,data.sourcePage);if(method&&method!=='GET')throw Error('POST downloads must stay in the browser.');
  const out=await transport({type:'download',requestId:data.requestId||crypto.randomUUID(),...data,headers,mode:data.mode||(/\.(m3u8|mpd)(\?|$)/i.test(url.href)?'media':'file')});
  if(!out.result?.id)throw Error('Flow did not confirm this download.');await chrome.action.setBadgeText({text:'✓'});await chrome.action.setBadgeBackgroundColor({color:'#298b64'});return out.result;
}
async function refreshContentScripts(){
 const tabs=await chrome.tabs.query({});
 for(const tab of tabs){if(!/^https?:/.test(tab.url||''))continue;try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['panel-model.js','media-model.js','content.js']});}catch{}}
}
chrome.runtime.onInstalled.addListener(async()=>{
  await refreshContentScripts();await chrome.contextMenus.removeAll();chrome.contextMenus.create({id:'flow-link',title:'Download with Flow',contexts:['link','video','audio']});chrome.contextMenus.create({id:'flow-selection',title:'Download selected links with Flow',contexts:['selection']});chrome.contextMenus.create({id:'flow-page',title:'Download links on this page with Flow…',contexts:['page']});await chrome.alarms.create('flow-status',{periodInMinutes:1});
});
chrome.alarms.onAlarm.addListener(async alarm=>{if(alarm.name!=='flow-status')return;const s=await chrome.storage.session.get('lastConnected');if(!s.lastConnected||Date.now()-s.lastConnected>120000)return;try{await ping();}catch{}});
function requireCurrentDesktop(out){const version=String(out.version||'0.0.0').split('.').map(Number);if(version[0]<2||version[0]===2&&(version[1]<5||version[1]===5&&version[2]<2))throw Error('Flow '+(out.version||'legacy')+' is still running. Exit it from the tray menu, then open Flow 2.5.2 or newer. This download stays in Chrome.');}
async function ping(){const out=await transport({type:'ping'});requireCurrentDesktop(out);if(out.settings){const {preferenceOverrides={}}=await chrome.storage.local.get({preferenceOverrides:{}}),patch={...out.settings};for(const key of Object.keys(preferenceOverrides))if(['videoPanel','fileTypes','excludedSites','panelMode'].includes(key))patch[key]=preferenceOverrides[key];await chrome.storage.local.set(patch);}return out;}
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{try{
  if(info.menuItemId==='flow-page'){await chrome.tabs.sendMessage(tab.id,{type:'showLinkPicker'});return;}
  const urls=info.menuItemId==='flow-selection'?(info.selectionText.match(/https?:\/\/[^\s<>"']+/g)||[]):[info.linkUrl||info.srcUrl];for(const url of [...new Set(urls)].slice(0,100).filter(Boolean))await sendDownload({url,sourcePage:tab.url,later:urls.length>1});
}catch(e){await fail(e);if(tab?.id!==undefined)chrome.tabs.sendMessage(tab.id,{type:'flowError',message:e.message}).catch(()=>{});}});
chrome.webRequest.onBeforeSendHeaders.addListener(details=>{
  if(details.url.startsWith('http://127.0.0.1:17863/'))return;
  const headers={};for(const h of details.requestHeaders||[])if(['cookie','user-agent','referer','authorization','origin'].includes(h.name.toLowerCase()))headers[h.name.toLowerCase()]=h.value;
  const entry={headers,method:details.method};requests.set(details.url,entry);chrome.storage.session.set({['request:'+details.url]:entry}).catch(()=>{});
  if(requests.size>150){const key=requests.keys().next().value;requests.delete(key);chrome.storage.session.remove('request:'+key).catch(()=>{});}
},{urls:['http://*/*','https://*/*']},['requestHeaders','extraHeaders']);
chrome.webRequest.onHeadersReceived.addListener(details=>{
  if(details.tabId<0||pausedDiscovery.has(details.tabId)||details.url.startsWith('http://127.0.0.1:17863/'))return;
  const type=details.responseHeaders?.find(h=>h.name.toLowerCase()==='content-type')?.value||'';
  if(!/video\/|audio\/|mpegurl|dash\+xml/i.test(type)&&!/\.(mp4|mkv|webm|mp3|m3u8|mpd)(\?|$)/i.test(details.url))return;
  const entry=FlowMediaModel.describe({url:details.url,type,size:details.responseHeaders?.find(h=>h.name.toLowerCase()==='content-length')?.value||'',contentRange:details.responseHeaders?.find(h=>h.name.toLowerCase()==='content-range')?.value||''});
  if(!entry)return;
  const list=FlowMediaModel.select([...(media.get(details.tabId)||[]),entry],40).reverse();media.set(details.tabId,list);chrome.storage.session.set({['media:'+details.tabId]:list}).catch(()=>{});chrome.action.setBadgeText({tabId:details.tabId,text:String(list.length)}).catch(()=>{});
},{urls:['http://*/*','https://*/*']},['responseHeaders']);
// This also catches Content-Disposition attachments without a URL extension.
chrome.downloads.onDeterminingFilename.addListener((item,suggest)=>{
  (async()=>{
    const c=await config(),url=item.finalUrl||item.url;
    if(!c.autoCapture||capturePaused(c,url,item.referrer)||item.byExtensionId===chrome.runtime.id||item.incognito||!/^https?:\/\//.test(url)||excluded(url,c)||!fileMatch(url,item.filename,c))return;
    const bypass=(await chrome.storage.session.get('bypass:'+url))['bypass:'+url];if(bypass&&Date.now()-bypass<15000)return;
    if(inFlight.has(item.id))return;inFlight.add(item.id);const info=await requestInfo(url);if(info.method!=='GET'){inFlight.delete(item.id);return;}
    let paused=false;
    try{
      await chrome.downloads.pause(item.id);paused=true;
      const result=await sendDownload({url,name:item.filename.split(/[\\/]/).pop(),sourcePage:item.referrer,requestId:'chrome:'+item.id+':'+item.startTime.replace(/[^0-9]/g,'')});
      if(!result.id)throw Error('No desktop acknowledgement');await chrome.downloads.cancel(item.id);await chrome.storage.session.set({lastCapture:{name:result.name,at:Date.now(),id:result.id},lastError:''});
    }catch(e){if(paused)await chrome.downloads.resume(item.id).catch(()=>{});await fail(Error('Browser download kept: '+e.message));}finally{inFlight.delete(item.id);}
  })().catch(fail).finally(()=>suggest());return true;
});
chrome.tabs.onRemoved.addListener(id=>{media.delete(id);pausedDiscovery.delete(id);chrome.storage.session.remove(['media:'+id,'mediaPaused:'+id]).catch(()=>{});});
chrome.tabs.onUpdated.addListener((id,info)=>{if(info.status==='loading'){media.delete(id);pausedDiscovery.delete(id);chrome.storage.session.remove(['media:'+id,'mediaPaused:'+id]).catch(()=>{});}});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(!['media','clearMedia','resumeMedia','download','capture','ping','sync','bypass','batch','capturePause'].includes(message.type))return;
  (async()=>{
    if(message.type==='capturePause'){const minutes=Number(message.minutes);if(![0,15,60].includes(minutes))throw Error('Choose 0, 15 or 60 minutes');const until=minutes?Date.now()+minutes*60000:0;await chrome.storage.local.set({capturePausedUntil:until});return {until};}
    if(message.type==='bypass'){await chrome.storage.session.set({['bypass:'+message.url]:Date.now()});return {ok:true};}
    if(message.type==='clearMedia'||message.type==='resumeMedia'){const id=message.tabId??sender.tab?.id;if(!Number.isInteger(id))throw Error('No active tab');media.delete(id);await chrome.storage.session.remove('media:'+id);if(message.type==='clearMedia'){pausedDiscovery.add(id);await chrome.storage.session.set({['mediaPaused:'+id]:true});}else{pausedDiscovery.delete(id);await chrome.storage.session.remove('mediaPaused:'+id);}await chrome.action.setBadgeText({tabId:id,text:''});return {ok:true};}
    if(message.type==='media'){const id=message.tabId??sender.tab?.id;return {media:FlowMediaModel.select(media.get(id)||(await chrome.storage.session.get('media:'+id))['media:'+id]||[]),discoveryPaused:pausedDiscovery.has(id),config:await config()};}
    if(message.type==='ping'||message.type==='sync')return ping();
    const c=await config();let tab=sender.tab;if(!tab&&message.tabId!==undefined)tab=await chrome.tabs.get(message.tabId);
    if(message.type==='batch'){if(!Array.isArray(message.urls)||message.urls.length>100)throw Error('Select up to 100 URLs');for(const url of [...new Set(message.urls)])await sendDownload({url,sourcePage:tab?.url,later:true});return {count:message.urls.length};}
    if(message.type==='capture'){if(!message.force&&(!c.autoCapture||capturePaused(c,message.url,tab?.url)))return {skip:true};if(excluded(message.url,c)||!message.force&&!fileMatch(message.url,'',c))return {skip:true};}
    const tabId=message.tabId??tab?.id,list=media.get(tabId)||(await chrome.storage.session.get('media:'+tabId))['media:'+tabId]||[],entry=list.find(m=>m.url===message.url);return sendDownload({url:message.url,name:message.name||entry?.fileName,sourcePage:tab?.url,mode:message.mode||(/mpegurl|dash\+xml/i.test(entry?.type||'')?'media':undefined)});
  })().then(result=>respond({result})).catch(e=>respond({error:e.message}));return true;
});
