let settings={autoCapture:false,videoPanel:true,panelMode:'full',panelPositions:{},panelDisabledSites:[]};
let panel,shadow,manualPosition=null,panelHidden=false,minimized=false,lastMedia=[];
const siteKey=location.hostname;
chrome.storage.local.get(null).then(c=>{settings={...settings,...c};manualPosition=settings.panelPositions?.[siteKey]||null;minimized=!!manualPosition?.minimized;updatePanel();});
chrome.storage.onChanged.addListener(changes=>{for(const [k,v]of Object.entries(changes))settings[k]=v.newValue;if(changes.panelPositions){manualPosition=settings.panelPositions?.[siteKey]||null;minimized=!!manualPosition?.minimized;}updatePanel();});
document.addEventListener('click',async e=>{
 const a=e.target.closest('a[href]');if(!a||!/^https?:/.test(a.href))return;
 if(e.altKey){chrome.runtime.sendMessage({type:'bypass',url:a.href}).catch(()=>{});return;}
 const force=e.ctrlKey&&e.shiftKey;if((!force&&(!settings.autoCapture||Date.now()<Number(settings.capturePausedUntil||0)||(settings.captureDisabledSites||[]).includes(location.hostname)||(settings.captureDisabledSites||[]).includes(new URL(a.href).hostname)))||(e.ctrlKey&&!force)||e.button!==0)return;
 const ext=new URL(a.href).pathname.split('.').pop().toUpperCase();if(!force&&!(settings.fileTypes||'').split(/[ ,]+/).includes(ext))return;
 if((settings.excludedSites||'').split(/[\n, ]+/).includes(new URL(a.href).hostname))return;
 e.preventDefault();e.stopImmediatePropagation();
 try{const r=await chrome.runtime.sendMessage({type:'capture',url:a.href,force});if(r.error)throw Error(r.error);if(r.result?.skip)location.href=a.href;else notify('Sent to Flow. Check the download confirmation window.');}
 catch(error){notify('Flow could not accept the file. The browser will continue downloading.');await chrome.runtime.sendMessage({type:'bypass',url:a.href}).catch(()=>{});location.href=a.href;}
},true);
function notify(text){const el=document.createElement('div');el.className='flow-companion-toast';el.textContent=text;document.documentElement.append(el);setTimeout(()=>el.remove(),7000);}
function savePosition(){const r=panel.getBoundingClientRect();manualPosition={...FlowPanelModel.normalize(r.left,r.top,innerWidth,innerHeight,r.width,r.height),minimized};const positions={...settings.panelPositions,[siteKey]:manualPosition};settings.panelPositions=positions;chrome.storage.local.set({panelPositions:positions}).catch(()=>{});}
function placePanel(){if(!panel)return;const r=panel.getBoundingClientRect();let x,y;
 if(manualPosition){const p=FlowPanelModel.position(manualPosition,innerWidth,innerHeight,r.width,r.height);x=p.x;y=p.y;}
 else{const videos=[...document.querySelectorAll('video')],v=videos.find(v=>{const b=v.getBoundingClientRect();return b.width>150&&b.height>80&&b.bottom>0&&b.top<innerHeight;});const b=v?.getBoundingClientRect();x=b?b.right-r.width-8:innerWidth-r.width-18;y=b?b.top+8:80;}
 panel.style.left=FlowPanelModel.clamp(x,0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(y,0,Math.max(0,innerHeight-r.height))+'px';
}
function buildPanel(){
 panel=document.createElement('div');panel.className='flow-panel-host';panel.style.cssText='all:initial;position:fixed;z-index:2147483646;left:0;top:0;max-width:calc(100vw - 8px);';shadow=panel.attachShadow({mode:'open'});
 const style=document.createElement('style');style.textContent=':host{color-scheme:light}*{box-sizing:border-box}button{font:12px Segoe UI,Tahoma,sans-serif;cursor:pointer;border:0;background:transparent;color:inherit;padding:7px 8px}button:focus-visible{outline:2px solid #9ac9ff;outline-offset:-2px}.bar{font:12px Segoe UI,Tahoma,sans-serif;display:flex;align-items:center;background:#1975ca;color:white;border:1px solid #b8d8f9;border-radius:5px;box-shadow:0 3px 14px #142e4850;white-space:nowrap}.grip{cursor:grab;touch-action:none;border-inline-end:1px solid #ffffff40;padding-inline:6px;font-size:16px}.grip:active{cursor:grabbing}.main{font-weight:600}.control{font-size:17px;padding:5px 8px;color:#e7f3ff}.menu{position:absolute;top:calc(100% + 5px);right:0;width:335px;max-width:calc(100vw - 12px);max-height:300px;overflow:auto;background:white;color:#263544;border:1px solid #c5d6e8;border-radius:4px;box-shadow:0 5px 20px #142e4850;direction:ltr}.menu button{width:100%;display:block;text-align:start;border-bottom:1px solid #e8eef6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.menu .menu-close{position:sticky;top:0;background:#eef5ff;font-weight:700;z-index:1}.menu button:hover{background:#eaf3ff}.menu small{display:block;color:#7c8d9f;font-size:10px}.note{padding:10px;font:11px/1.8 Segoe UI,Tahoma,sans-serif}.menu[hidden]{display:none}';shadow.append(style);
 const bar=document.createElement('div');bar.className='bar';bar.dir='ltr';shadow.append(bar);
 const make=(label,title,cls,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.className=cls;if(fn)b.onclick=fn;bar.append(b);return b;};
 const grip=make('⠿ Move','Drag to move the video panel','grip');
 const main=make('↓ Download video','Show discovered video sources','main',showMediaMenu);
 make('−','Minimize or expand panel','control',()=>{minimized=!minimized;main.textContent=minimized?'↓ Flow':'↓ Download video';savePosition();placePanel();});
 make('×','Hide panel on this page','control',()=>{shadow.querySelector('.menu').hidden=true;panelHidden=true;panel.hidden=true;panel.style.setProperty('display','none','important');notify('Restore the panel from the Flow extension using Reset video panel.');});
 let drag;
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?25:10;panel.style.left=FlowPanelModel.clamp(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),0,Math.max(0,innerHeight-r.height))+'px';savePosition();};
 grip.onpointerdown=e=>{if(e.button!==0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};grip.setPointerCapture(e.pointerId);e.preventDefault();};
 grip.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const r=panel.getBoundingClientRect();panel.style.left=FlowPanelModel.clamp(drag.left+e.clientX-drag.x,0,Math.max(0,innerWidth-r.width))+'px';panel.style.top=FlowPanelModel.clamp(drag.top+e.clientY-drag.y,0,Math.max(0,innerHeight-r.height))+'px';};
 grip.onpointerup=e=>{if(!drag)return;drag=null;try{grip.releasePointerCapture(e.pointerId);}catch{}savePosition();};grip.onpointercancel=()=>{drag=null;savePosition();};
 const menu=document.createElement('div');menu.className='menu';menu.hidden=true;shadow.append(menu);document.documentElement.append(panel);
}
function updatePanel(){
 if(!settings.videoPanel||panelHidden||(settings.panelDisabledSites||[]).includes(siteKey)){if(panel){panel.hidden=true;panel.style.setProperty('display','none','important');}return;}
 if(!document.querySelector('video')&&!lastMedia.length){if(panel){panel.hidden=true;panel.style.setProperty('display','none','important');}return;}
 if(!panel)buildPanel();panel.hidden=false;panel.style.setProperty('display','block','important');shadow.querySelector('.main').textContent=minimized||settings.panelMode==='mini'?'↓ Flow':'↓ Download video';placePanel();
}
function closeMediaMenu(){if(shadow)shadow.querySelector('.menu').hidden=true;}
function currentVideoPage(){
 if(FlowMediaModel.sitePage(location.href))return location.href;
 const videos=[...document.querySelectorAll('video')],video=videos.find(v=>{const r=v.getBoundingClientRect();return !v.paused&&r.width>100&&r.bottom>0&&r.top<innerHeight;})||videos.find(v=>{const r=v.getBoundingClientRect();return r.width>100&&r.bottom>0&&r.top<innerHeight;});
 const article=video?.closest('[role=article],article');const links=[...(article||video?.parentElement||document.createElement('div')).querySelectorAll('a[href]')];return links.find(a=>FlowMediaModel.sitePage(a.href))?.href||'';
}
async function disableSitePanel(){settings.panelDisabledSites=[...new Set([...(settings.panelDisabledSites||[]),siteKey])];await chrome.storage.local.set({panelDisabledSites:settings.panelDisabledSites});closeMediaMenu();updatePanel();notify('Panel hidden for this site. Enable it again from the Flow toolbar icon.');}
async function showMediaMenu(){
 const menu=shadow.querySelector('.menu');if(!menu.hidden){closeMediaMenu();return;}menu.replaceChildren();menu.hidden=false;menu.style.top='calc(100% + 5px)';menu.style.bottom='auto';
 const append=(label,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=async()=>{try{await fn(b);}catch(e){b.disabled=false;notify(e.message);}};menu.append(b);return b;};
 append('× Close menu',closeMediaMenu,'menu-close');
 try{const r=await chrome.runtime.sendMessage({type:'media'});if(r.error)throw Error(r.error);lastMedia=r.result.media||[];
 const page=currentVideoPage(),direct=[...document.querySelectorAll('video,audio')].map(v=>v.currentSrc).filter(u=>/^https?:/.test(u)).map(url=>({url,type:'media',name:''}));
 const sources=FlowMediaModel.select([...lastMedia,...direct]);
 if(page){append('↓ This video — choose quality and merge audio',async b=>{b.disabled=true;const result=await chrome.runtime.sendMessage({type:'download',url:page,mode:'site',name:document.title});if(result.error)throw Error(result.error);notify('Open Flow to choose quality and start downloading.');closeMediaMenu();});}
 else for(const item of sources){const b=append(item.label,async b=>{b.disabled=true;const result=await chrome.runtime.sendMessage({type:'download',url:item.url,name:item.fileName,mode:item.mode});if(result.error)throw Error(result.error);notify('Check the download confirmation window in Flow.');closeMediaMenu();});b.title=item.kind==='stream'?'Full stream — Flow assembles segments automatically':item.kind==='audio'?'Direct audio source':'Direct video source — audio may be separate';const small=document.createElement('small');small.textContent=b.title;b.append(small);}
 if(!sources.length&&!page){const note=document.createElement('div');note.className='note';note.textContent='No complete file source found. Partial segments and blob URLs are filtered out. Open the video on its own page, play it, and try again.';menu.append(note);}
 append('Always hide the panel on this site',disableSitePanel);
 append('Clear links and pause discovery for this tab',async()=>{const result=await chrome.runtime.sendMessage({type:'clearMedia'});if(result.error)throw Error(result.error);lastMedia=[];closeMediaMenu();notify('Sources cleared and discovery paused. Resume discovery from the Flow toolbar icon.');});
 append('↺ Reset panel position',resetPanel);
 const rbar=panel.getBoundingClientRect(),width=menu.getBoundingClientRect().width;menu.style.right='auto';menu.style.left=(FlowPanelModel.clamp(rbar.right-width,4,Math.max(4,innerWidth-width-4))-rbar.left)+'px';const below=innerHeight-rbar.bottom-10,above=rbar.top-10;
 if(below<160&&above>below){menu.style.top='auto';menu.style.bottom='calc(100% + 5px)';menu.style.maxHeight=Math.max(60,Math.min(300,above))+'px';}else menu.style.maxHeight=Math.max(60,Math.min(300,below))+'px';
 }catch(error){notify(error.message);closeMediaMenu();}
}
document.addEventListener('pointerdown',e=>{if(panel&&!e.composedPath().includes(panel))closeMediaMenu();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMediaMenu();document.querySelector('.flow-link-picker')?.remove();}});
async function resetPanel(){manualPosition=null;panelHidden=false;minimized=false;const positions={...settings.panelPositions};delete positions[siteKey];settings.panelPositions=positions;settings.panelDisabledSites=(settings.panelDisabledSites||[]).filter(h=>h!==siteKey);await chrome.storage.local.set({panelPositions:positions,videoPanel:true,preferenceOverrides:{...(settings.preferenceOverrides||{}),videoPanel:true},panelDisabledSites:settings.panelDisabledSites});settings.videoPanel=true;updatePanel();if(shadow)shadow.querySelector('.menu').hidden=true;}
let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;updatePanel();});}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('fullscreenchange',()=>{if(panel){const target=document.fullscreenElement;if(target&&target.tagName!=='VIDEO')target.append(panel);else document.documentElement.append(panel);placePanel();}});
window.addEventListener('resize',placePanel,{passive:true});window.visualViewport?.addEventListener('resize',placePanel,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updatePanel();});if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>placePanel()).observe(document.documentElement);window.addEventListener('scroll',()=>{if(!manualPosition)placePanel();},{passive:true});
setInterval(async()=>{if(document.visibilityState!=='visible'||!settings.videoPanel)return;try{const r=await chrome.runtime.sendMessage({type:'media'});if(!r.error){lastMedia=r.result.media||[];updatePanel();}}catch{}},4000);
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{if(message.type==='showPanel'){panelHidden=false;updatePanel();}if(message.type==='showLinkPicker')showLinkPicker();if(message.type==='resetPanel'){resetPanel().then(()=>reply({ok:true}));return true;}if(message.type==='flowError')notify(message.message);});
function showLinkPicker(){
  document.querySelector('.flow-link-picker')?.remove();
  const overlay=document.createElement('div');overlay.className='flow-link-picker';
  const box=document.createElement('div');box.className='flow-picker-box';box.dir='rtl';overlay.append(box);
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
  const download=document.createElement('button');download.textContent='Add selected to Flow';download.onclick=async()=>{const urls=[...list.querySelectorAll('input:checked')].map(c=>c.value);if(!urls.length||urls.length>100){status.textContent='Select between 1 and 100 links';return;}download.disabled=true;const r=await chrome.runtime.sendMessage({type:'batch',urls});status.textContent=r.error||'Added '+r.result.count+' downloads to the queue';download.disabled=false;};buttons.append(download);
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>overlay.remove();buttons.append(close);overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};document.documentElement.append(overlay);search.focus();
}
