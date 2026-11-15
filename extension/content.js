var flowBrowser=typeof browser==='object'&&browser.runtime?browser:chrome;
(()=>{
const previous=globalThis.__flowCompanionCleanup;
if(typeof previous==='function')previous();
for(const old of document.querySelectorAll('.flow-companion-panel,.flow-companion-menu,.flow-panel-host'))old.remove();
const lifecycle=new AbortController(),timers=[],observers=[];
const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:lifecycle.signal});
globalThis.__flowCompanionCleanup=()=>{lifecycle.abort();for(const timer of timers)clearInterval(timer);for(const observer of observers)observer.disconnect();panel?.remove();document.querySelector('.flow-link-picker')?.remove();for(const toast of document.querySelectorAll('.flow-companion-toast'))toast.remove();};
let settings={autoCapture:false,videoPanel:true,panelMode:'full',panelPositions:{},panelDisabledSites:[]};
let panel,shadow,manualPosition=null,panelHidden=false,minimized=false,lastMedia=[],menuRequest=0;
const siteKey=location.hostname;
let navigationURL=location.href;const encryptedVideos=new WeakSet();listen(document,'encrypted',e=>{encryptedVideos.add(e.target);closeMediaMenu();},{capture:true});
let mediaRoots=[document],rootsScannedAt=0,rootsDirty=true;
function mediaElements(selector='video'){
 if(Date.now()-rootsScannedAt>5000||rootsDirty&&Date.now()-rootsScannedAt>1000){mediaRoots=[document];rootsScannedAt=Date.now();rootsDirty=false;let scanned=0;for(let n=0;n<mediaRoots.length&&n<60&&scanned<6000;n++){const walker=document.createTreeWalker(mediaRoots[n],NodeFilter.SHOW_ELEMENT);let el;while((el=walker.nextNode())&&++scanned<=6000)if(el.shadowRoot&&el!==panel)mediaRoots.push(el.shadowRoot);}}
 return mediaRoots.flatMap(root=>[...root.querySelectorAll(selector)]);
}
function visibleVideo(){return mediaElements().filter(v=>{
 const b=v.getBoundingClientRect(),css=getComputedStyle(v);
 if(b.width<160||b.height<90||b.right<=0||b.bottom<=0||b.left>=innerWidth||b.top>=innerHeight||css.visibility!=='visible'||css.display==='none'||Number(css.opacity)===0)return false;
 for(let el=v.parentElement;el;el=el.parentElement){const c=getComputedStyle(el);if(c.display==='none'||c.visibility==='hidden'||Number(c.opacity)===0)return false;}
 return !!(v.currentSrc||v.src||v.querySelector('source[src]')||v.readyState||v.videoWidth);
}).sort((a,b)=>Number(a.paused)-Number(b.paused)||b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0]||null;}

flowBrowser.storage.local.get(null).then(c=>{settings={...settings,...c};manualPosition=settings.panelPositions?.[siteKey]||null;minimized=!!manualPosition?.minimized;updatePanel();});
const onSettings=changes=>{for(const [k,v]of Object.entries(changes))settings[k]=v.newValue;if(changes.panelPositions){manualPosition=settings.panelPositions?.[siteKey]||null;minimized=!!manualPosition?.minimized;}updatePanel();};flowBrowser.storage.onChanged.addListener(onSettings);lifecycle.signal.addEventListener('abort',()=>flowBrowser.storage.onChanged.removeListener(onSettings));
listen(document,'click',async e=>{
 const a=e.target.closest('a[href]');if(!a||!/^https?:/.test(a.href))return;
 if(e.altKey){flowBrowser.runtime.sendMessage({type:'bypass',url:a.href}).catch(()=>{});return;}
 const force=e.ctrlKey&&e.shiftKey;if(!force||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();
 try{const r=await flowBrowser.runtime.sendMessage({type:'capture',url:a.href,force});if(r.error)throw Error(r.error);if(r.result?.skip)location.href=a.href;else notify('Sent to Flow. Check the download confirmation window.');}
 catch(error){notify('Flow could not accept the file. The browser will continue downloading.');await flowBrowser.runtime.sendMessage({type:'bypass',url:a.href}).catch(()=>{});location.href=a.href;}
},{capture:true});
function notify(text){const el=document.createElement('div');el.className='flow-companion-toast';el.textContent=text;document.documentElement.append(el);setTimeout(()=>el.remove(),7000);}
function savePosition(){const r=panel.getBoundingClientRect();manualPosition={...FlowPanelModel.normalize(r.left,r.top,innerWidth,innerHeight,r.width,r.height),minimized};const positions={...settings.panelPositions,[siteKey]:manualPosition};settings.panelPositions=positions;flowBrowser.storage.local.set({panelPositions:positions}).catch(()=>{});}
function placePanel(){if(!panel)return;const r=panel.getBoundingClientRect();let x,y;
 if(manualPosition){const p=FlowPanelModel.position(manualPosition,innerWidth,innerHeight,r.width,r.height);x=p.x;y=p.y;}
 else{const v=visibleVideo();const b=v?.getBoundingClientRect();x=b?b.right-r.width-8:innerWidth-r.width-18;y=b?b.top+8:80;}
 panel.style.left=FlowPanelModel.clamp(x,0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(y,0,Math.max(0,innerHeight-r.height))+'px';
}
function buildPanel(){
 panel=document.createElement('div');panel.className='flow-panel-host';panel.style.cssText='all:initial;position:fixed;z-index:2147483646;left:0;top:0;max-width:calc(100vw - 8px);';panel.dataset.flowVersion=flowBrowser.runtime.getManifest().version;panel.dataset.theme=settings.theme||'system';shadow=panel.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent=":host{--surface:#fff;--ink:#273b32;--soft:#e8f2ec;--line:#d7e5db;--accent:#276b4f;color-scheme:light}:host([data-theme=dark]),:host([data-theme=amoled]){--surface:#202733;--ink:#f0f4fa;--soft:#2b3c43;--line:#536176;--accent:#75d8b7;color-scheme:dark}:host([data-theme=amoled]){--surface:#000;--soft:#14281b;--line:#304336}@media(prefers-color-scheme:dark){:host(:not([data-theme=light]):not([data-theme=dark]):not([data-theme=amoled])){--surface:#202733;--ink:#f0f4fa;--soft:#2b3c43;--line:#536176;--accent:#75d8b7}}*{box-sizing:border-box}button{font:12px/1.4 'Segoe UI',Tahoma,sans-serif;cursor:pointer;border:0;color:inherit;background:transparent}button:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}button:disabled{opacity:.5}.bar{display:flex;align-items:center;gap:0;padding:3px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--ink);box-shadow:0 4px 18px #0002;white-space:nowrap}.bar .main{display:flex;align-items:center;gap:7px;min-height:30px;padding:5px 8px;border-radius:9px;touch-action:none;cursor:pointer;font-size:11px;font-weight:650;color:var(--accent)}.main:active{cursor:grabbing}.main svg{width:16px;height:16px}.bar .options{font-size:18px;line-height:1;min-width:24px;min-height:28px;padding:0;border-radius:8px;color:var(--ink)}.bar button:hover{background:var(--soft)}.menu{position:absolute;top:calc(100% + 8px);right:0;width:288px;max-width:calc(100vw - 16px);max-height:340px;overflow:auto;padding:7px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 36px #0003;direction:ltr}.menu button{display:block;width:100%;padding:10px 11px;border-radius:10px;text-align:start;white-space:normal;overflow-wrap:anywhere;line-height:1.5}.menu button:hover{background:var(--soft)}.menu .menu-close{font-size:11px;font-weight:650;color:var(--accent);border-bottom:1px solid var(--line);border-radius:10px 10px 0 0;margin-bottom:5px;position:sticky;top:-7px;background:var(--surface);z-index:1}.menu .quality-option{background:var(--soft);color:var(--accent);margin-block:4px;font-weight:600;padding:12px}.menu .menu-setting{font-size:10px;color:var(--ink);border-top:1px solid var(--line);margin-top:5px;border-radius:0 0 10px 10px}.menu small{display:block;color:var(--ink);opacity:.65;font-size:10px;font-weight:400;margin-top:3px}.note{padding:12px;font:11px/1.7 'Segoe UI',Tahoma,sans-serif;color:var(--ink);opacity:.75}.menu[hidden]{display:none}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--line);border-radius:9px}";shadow.append(style);
 const bar=document.createElement('div');bar.className='bar';bar.dir='ltr';shadow.append(bar);
 const make=(label,title,cls,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.className=cls;if(fn)b.onclick=fn;bar.append(b);return b;};
 const main=make('','Download video · drag to move','main grip',e=>{if(main.dataset.dragged==='1'){delete main.dataset.dragged;return;}showMediaMenu(e);});
 main.setAttribute('aria-haspopup','dialog');main.setAttribute('aria-expanded','false');main.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="label">Download</span>';
 const grip=main;
 make('⋯','Video button options','control options',showPanelOptions);
 main.oncontextmenu=e=>{e.preventDefault();showPanelOptions();};
 let drag;
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?25:10;panel.style.left=FlowPanelModel.clamp(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),0,Math.max(0,innerHeight-r.height))+'px';savePosition();};
 grip.onpointerdown=e=>{if(e.button!==0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};grip.setPointerCapture(e.pointerId);e.preventDefault();};
 const moveDrag=e=>{if(!drag||e.pointerId!==drag.id)return;const r=panel.getBoundingClientRect();panel.style.left=FlowPanelModel.clamp(drag.left+e.clientX-drag.x,0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(drag.top+e.clientY-drag.y,0,Math.max(0,innerHeight-r.height))+'px';};
 grip.onpointerup=e=>{if(!drag)return;drag=null;try{grip.releasePointerCapture(e.pointerId);}catch{}savePosition();};grip.onpointercancel=()=>{drag=null;savePosition();};
 main.onpointerdown=e=>{if(e.button!==0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};main.setPointerCapture(e.pointerId);};
 main.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;main.dataset.dragged='1';closeMediaMenu();moveDrag(e);};
 main.onpointerup=e=>{if(!drag)return;drag=null;try{main.releasePointerCapture(e.pointerId);}catch{}if(main.dataset.dragged==='1')savePosition();};main.onpointercancel=()=>{drag=null;delete main.dataset.dragged;};
 const menu=document.createElement('div');menu.className='menu';menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Video download options');menu.hidden=true;shadow.append(menu);document.documentElement.append(panel);
}
function updatePanel(){if(panel)panel.dataset.theme=settings.theme||'system';
 for(const old of document.querySelectorAll('.flow-companion-panel,.flow-companion-menu'))old.remove();
 if(navigationURL!==location.href){navigationURL=location.href;lastMedia=[];rootsScannedAt=0;closeMediaMenu();}
 if(!settings.videoPanel||panelHidden||(settings.panelDisabledSites||[]).includes(siteKey)){if(panel){panel.hidden=true;panel.style.setProperty('display','none','important');}return;}
 if(!visibleVideo()){closeMediaMenu();if(panel){panel.hidden=true;panel.style.setProperty('display','none','important');}return;}
 if(!panel)buildPanel();panel.hidden=false;panel.style.setProperty('display','block','important');shadow.querySelector('.label').textContent=(manualPosition?minimized:settings.panelMode==='mini')?'Flow':'Download';placePanel();
}
function hidePagePanel(){closeMediaMenu();panelHidden=true;panel.hidden=true;panel.style.setProperty('display','none','important');notify('Panel hidden. Restore it from the Flow extension using Reset video panel.');}
function showPanelOptions(){
 const menu=shadow.querySelector('.menu');if(!menu.hidden&&menu.dataset.kind==='options'){closeMediaMenu();return;}closeMediaMenu();menu.replaceChildren();menu.dataset.kind='options';menu.hidden=false;shadow.querySelector('.main').setAttribute('aria-expanded','true');
 const add=(label,action,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=action;menu.append(b);};
 add('Video button options · Close',closeMediaMenu,'menu-close');
 add('Move button — drag it or use arrow keys',()=>{closeMediaMenu();shadow.querySelector('.main').focus();});
 add((manualPosition?minimized:settings.panelMode==='mini')?'Show Download label':'Use compact Flow label',()=>{minimized=!(manualPosition?minimized:settings.panelMode==='mini');savePosition();closeMediaMenu();updatePanel();});
 add('Hide on this page',hidePagePanel,'hide-page');add('Always hide on this site',disableSitePanel);add('Reset button position',resetPanel);positionMenu(menu);
}
function positionMenu(menu){const rbar=panel.getBoundingClientRect(),width=menu.getBoundingClientRect().width;menu.style.right='auto';menu.style.left=(FlowPanelModel.clamp(rbar.right-width,4,Math.max(4,innerWidth-width-4))-rbar.left)+'px';const below=innerHeight-rbar.bottom-10,above=rbar.top-10;if(below<160&&above>below){menu.style.top='auto';menu.style.bottom='calc(100% + 5px)';menu.style.maxHeight=Math.max(60,Math.min(300,above))+'px';}else{menu.style.top='calc(100% + 5px)';menu.style.bottom='auto';menu.style.maxHeight=Math.max(60,Math.min(300,below))+'px';}}
function closeMediaMenu(){menuRequest++;if(shadow){shadow.querySelector('.menu').hidden=true;shadow.querySelector('.main').setAttribute('aria-expanded','false');}}
function currentVideoPage(){
 if(FlowMediaModel.sitePage(location.href))return location.href;
 const video=visibleVideo();
 const article=video?.closest('[role=article],article');const links=[...(article||video?.parentElement||document.createElement('div')).querySelectorAll('a[href]')];return links.find(a=>FlowMediaModel.sitePage(a.href))?.href||'';
}
async function disableSitePanel(){settings.panelDisabledSites=[...new Set([...(settings.panelDisabledSites||[]),siteKey])];await flowBrowser.storage.local.set({panelDisabledSites:settings.panelDisabledSites});closeMediaMenu();updatePanel();notify('Panel hidden for this site. Enable it again from the Flow toolbar icon.');}
async function showMediaMenu(){
 const menu=shadow.querySelector('.menu');if(!menu.hidden&&menu.dataset.kind==='media'){closeMediaMenu();return;}closeMediaMenu();const request=++menuRequest;menu.replaceChildren();menu.dataset.kind='media';menu.hidden=false;shadow.querySelector('.main').setAttribute('aria-expanded','true');menu.style.top='calc(100% + 5px)';menu.style.bottom='auto';
 const append=(label,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=async()=>{try{await fn(b);}catch(e){b.disabled=false;notify(e.message);}};menu.append(b);return b;};
 append('Save this video · × Close',closeMediaMenu,'menu-close');
 try{const r=await flowBrowser.runtime.sendMessage({type:'media'});if(request!==menuRequest||lifecycle.signal.aborted)return;if(r.error)throw Error(r.error);lastMedia=r.result.media||[];
 const protectedPlayer=encryptedVideos.has(visibleVideo()),page=protectedPlayer?'':currentVideoPage(),direct=[visibleVideo()].filter(Boolean).map(v=>v.currentSrc).filter(u=>/^https?:/.test(u)).map(url=>({url,type:'media',name:''}));
 const sources=FlowMediaModel.select([...lastMedia,...direct]);
 if(page){for(const [quality,label] of [['best','Best video'],['max1080','Video up to 1080p'],['audio','Audio only · MP3']])append(label,async b=>{b.disabled=true;const result=await flowBrowser.runtime.sendMessage({type:'download',url:page,mode:'site',quality,name:document.title});if(result.error)throw Error(result.error);notify('Confirm your download in Flow.');closeMediaMenu();},'quality-option');}
 else if(!protectedPlayer)for(const item of sources){const b=append(item.label,async b=>{b.disabled=true;const result=await flowBrowser.runtime.sendMessage({type:'download',url:item.url,name:item.fileName,mode:item.mode});if(result.error)throw Error(result.error);notify('Check the download confirmation window in Flow.');closeMediaMenu();});b.title=item.kind==='stream'?'Full stream — Flow assembles segments automatically':item.kind==='audio'?'Direct audio source':'Direct video source — audio may be separate';const small=document.createElement('small');small.textContent=b.title;b.append(small);}
 if(!sources.length&&!page&&visibleVideo()&&!encryptedVideos.has(visibleVideo()))append('Try extracting this video page',async b=>{b.disabled=true;const result=await flowBrowser.runtime.sendMessage({type:'download',url:location.href,name:document.title||'Video',mode:'site'});if(result.error)throw Error(result.error);closeMediaMenu();});
 if(encryptedVideos.has(visibleVideo())){const note=document.createElement('div');note.className='note';note.textContent='This player uses protected media. Flow cannot download protected streams.';menu.append(note);}
 if(!sources.length&&!page){const note=document.createElement('div');note.className='note';note.textContent='No complete file source found. Partial segments and blob URLs are filtered out. Open the video on its own page, play it, and try again.';menu.append(note);}
 append('Video button settings',showPanelOptions,'menu-setting');
 append('Hide on this page',hidePagePanel,'menu-setting');
 const rbar=panel.getBoundingClientRect(),width=menu.getBoundingClientRect().width;menu.style.right='auto';menu.style.left=(FlowPanelModel.clamp(rbar.right-width,4,Math.max(4,innerWidth-width-4))-rbar.left)+'px';const below=innerHeight-rbar.bottom-10,above=rbar.top-10;
 if(below<160&&above>below){menu.style.top='auto';menu.style.bottom='calc(100% + 5px)';menu.style.maxHeight=Math.max(60,Math.min(300,above))+'px';}else menu.style.maxHeight=Math.max(60,Math.min(300,below))+'px';
 }catch(error){notify(error.message);closeMediaMenu();}
}
listen(document,'pointerdown',e=>{if(panel&&!e.composedPath().includes(panel))closeMediaMenu();},{capture:true});
listen(document,'keydown',e=>{if(e.key==='Escape'){closeMediaMenu();document.querySelector('.flow-link-picker')?.remove();}});
async function resetPanel(){manualPosition=null;panelHidden=false;minimized=false;const positions={...settings.panelPositions};delete positions[siteKey];settings.panelPositions=positions;settings.panelDisabledSites=(settings.panelDisabledSites||[]).filter(h=>h!==siteKey);await flowBrowser.storage.local.set({panelPositions:positions,videoPanel:true,preferenceOverrides:{...(settings.preferenceOverrides||{}),videoPanel:true},panelDisabledSites:settings.panelDisabledSites});settings.videoPanel=true;updatePanel();if(shadow)shadow.querySelector('.menu').hidden=true;}
let scheduled=false;observers.push(new MutationObserver(records=>{if(lifecycle.signal.aborted||scheduled||records.every(record=>panel?.contains(record.target)))return;rootsDirty=true;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(!lifecycle.signal.aborted)updatePanel();});}));observers.at(-1).observe(document.documentElement,{childList:true,subtree:true});
listen(document,'fullscreenchange',()=>{if(panel){const target=document.fullscreenElement;if(target&&target.tagName!=='VIDEO')target.append(panel);else document.documentElement.append(panel);placePanel();}});
listen(window,'resize',placePanel,{passive:true});if(window.visualViewport)listen(window.visualViewport,'resize',placePanel,{passive:true});listen(document,'visibilitychange',()=>{if(document.visibilityState==='visible')updatePanel();});if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>placePanel());observer.observe(document.documentElement);observers.push(observer);}listen(window,'scroll',()=>{if(!manualPosition)placePanel();},{passive:true});
listen(window,'blur',closeMediaMenu);listen(document,'yt-navigate-start',()=>{lastMedia=[];closeMediaMenu();});listen(document,'visibilitychange',()=>{if(document.visibilityState!=='visible')closeMediaMenu();});
timers.push(setInterval(()=>{if(document.visibilityState==='visible')updatePanel();},1000));
timers.push(setInterval(async()=>{if(document.visibilityState!=='visible'||!settings.videoPanel||!visibleVideo())return;try{const page=location.href,r=await flowBrowser.runtime.sendMessage({type:'media'});if(!r.error&&page===location.href&&!lifecycle.signal.aborted){lastMedia=r.result.media||[];updatePanel();}}catch{}},4000));
const onRuntimeMessage=(message,_sender,reply)=>{if(message.type==='showPanel'){panelHidden=false;updatePanel();}if(message.type==='showLinkPicker')showLinkPicker();if(message.type==='resetPanel'){resetPanel().then(()=>reply({ok:true}));return true;}if(message.type==='flowError')notify(message.message);};flowBrowser.runtime.onMessage.addListener(onRuntimeMessage);lifecycle.signal.addEventListener('abort',()=>flowBrowser.runtime.onMessage.removeListener(onRuntimeMessage));
function showLinkPicker(){
  document.querySelector('.flow-link-picker')?.remove();
  const overlay=document.createElement('div');overlay.className='flow-link-picker';overlay.dataset.theme=settings.theme||'system';
  const box=document.createElement('div');box.className='flow-picker-box';box.dir='ltr';overlay.append(box);
  const title=document.createElement('strong');title.textContent='Download page links with Flow';box.append(title);
  const hint=document.createElement('p');hint.textContent='Select links to add to the main queue for later (up to 100 links).';box.append(hint);
  const search=document.createElement('input');search.type='search';search.placeholder='Search name or extension';box.append(search);
  const list=document.createElement('div');list.className='flow-picker-list';box.append(list);
  const links=[...new Map([...document.querySelectorAll('a[href]')].filter(a=>/^https?:/.test(a.href)).map(a=>[a.href,{url:a.href,name:a.textContent.trim()||a.href}])).values()].slice(0,1000);
  for(const link of links){const row=document.createElement('label'),check=document.createElement('input'),name=document.createElement('span');check.type='checkbox';check.value=link.url;name.textContent=link.name;name.title=link.url;row.append(check,name);row.dataset.search=(link.name+' '+link.url).toLowerCase();list.append(row);}
  search.oninput=()=>{for(const row of list.children)row.hidden=!row.dataset.search.includes(search.value.toLowerCase());};
  const status=document.createElement('p');status.textContent=links.length+' links';box.append(status);
  const buttons=document.createElement('div');buttons.className='flow-picker-buttons';box.append(buttons);
  const all=document.createElement('button');all.textContent='Select visible';all.onclick=()=>{for(const row of list.children)if(!row.hidden)row.querySelector('input').checked=true;};buttons.append(all);
  const download=document.createElement('button');download.textContent='Add selected to Flow';download.onclick=async()=>{const urls=[...list.querySelectorAll('input:checked')].map(c=>c.value);if(!urls.length||urls.length>100){status.textContent='Select between 1 and 100 links';return;}download.disabled=true;const r=await flowBrowser.runtime.sendMessage({type:'batch',urls});status.textContent=r.error||'Added '+r.result.count+' downloads to the queue';download.disabled=false;};buttons.append(download);
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>overlay.remove();buttons.append(close);overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};document.documentElement.append(overlay);search.focus();
}

})();
