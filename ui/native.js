// All scripts are loaded before initialization; tool windows share the same service.
let windowClosing=false;
const windowContext=new URL(location.href).searchParams.get('window');
const windowArgs=new URL(location.href).searchParams;
function nativeTool(kind,data={}){if(!window.desktopAPI||windowContext)return false;api('window',{kind,...data}).catch(e=>toast(e.message,true));return true;}
const regularModal=modal,regularClose=closeModal;
modal=function(title,body,foot='',wide=false){
  if(!windowContext)return regularModal(title,body,foot,wide);
  if(document.body.classList.contains('native-page'))document.body.classList.add('native-form-open');detailId=null;document.title=title+' — Flow';const dlg=$('#dialog');dlg.className=wide?'wide':'';
  $('#dialog-content').innerHTML=`<div class="modal-head"><h2>${h(title)}</h2>${ib('windowMinimize',t('تصغير','Minimize'),'down')}${ib('close',t('إغلاق','Close'),'x')}</div>${body}<div class="modal-foot">${foot||button('close',t('إغلاق','Close'),null)}</div>`;
  if(!dlg.open)dlg.show();
};
closeModal=function(){if(windowContext&&document.body.classList.contains('native-form-open')){$('#dialog').close();document.body.classList.remove('native-form-open');detailId=null;settingsDraft=null;return;}if(windowContext==='scheduler'&&!$('#queue-form')){renderQueues();return;}if(windowContext){windowClosing=true;clearInterval(refreshTimer);api('windowClose').catch(e=>toast(e.message,true));return;}regularClose();};
function renderNativeWindow(){
  if(!windowContext)return false;
  document.body.classList.add('native-window');
  const id=windowArgs.get('id');
  switch(windowContext){
    case'settings':openSettings(windowArgs.get('tab')||'general');break;
    case'library':openLibrary(windowArgs.get('tab')||'folders');break;
    case'power':openPower(windowArgs.get('tab')||'links',windowArgs.get('url')||'');break;
    case'shutdown':renderShutdown();break;
    case'tools':openTools(windowArgs.get('tab')||'home');break;
    case'smart':openSmart(windowArgs.get('tab')||'health',id||'');break;
    case'add':case'download-info':openAdd(windowArgs.get('url')||state.downloads.find(d=>d.id===id)?.url||'');if(isSiteVideo($('#f-url')?.value)||isPlaylistURL($('#f-url')?.value))queueMicrotask(()=>handleAction('probeAdd',$('[data-action=probeAdd]')));break;
    case'details':openDetail(id);break;case'complete':showComplete(id);break;
    case'scheduler':renderQueues();break;case'batch':openBatch();break;
    case'grabber':view='grabber';renderGrabber();document.title=t('ساحب المواقع','Site grabber')+' — Flow';document.body.classList.add('native-page');break;
    case'integration':view='integration';renderIntegration();document.title=t('تكامل المتصفح','Browser integration')+' — Flow';document.body.classList.add('native-page');break;
    case'logs':view='logs';renderLogs();document.title=t('سجل النشاط','Activity log')+' — Flow';document.body.classList.add('native-page');break;
    case'updates':renderUpdates();break;
    case'about':handleAction('about',{dataset:{}});break;
  }return true;
}
function repaintNativeLanguage(){
 const fields=[...document.querySelectorAll('input[name],textarea[name],select[name]')].map(el=>({name:el.name,value:el.value,checked:el.checked}));
 const focus=document.activeElement?.name;
 if(windowContext==='settings'){captureSettings();showSettings();}
 else if(windowContext==='library')renderLibrary();
 else if(windowContext==='power')renderPower();
 else if(windowContext==='tools')renderTools();
  else if(windowContext==='smart')renderSmart();
 else renderNativeWindow();
 for(const saved of fields){const el=[...document.querySelectorAll('[name]')].find(el=>el.name===saved.name);if(el){el.value=saved.value;if(el.type==='checkbox')el.checked=saved.checked;}}
 [...document.querySelectorAll('[name]')].find(el=>el.name===focus)?.focus();
}
const nativeHandleAction=handleAction;
handleAction=async(name,el)=>{
  if(name==='authorProfile'){if(window.desktopAPI)await api('authorProfile');else window.open('https://www.facebook.com/mohamedabdelnaby190','_blank','noopener');return;}
  if(name==='windowHide')return api('windowHide');
  if(name==='windowMinimize')return api('windowMinimize');
  if(name==='nativeClose')return api('windowClose');
  if(name==='browserFallback'){await api('browserFallback',{id:el.dataset.id});return;}
  if(name==='copyURL'){const d=state.downloads.find(d=>d.id===(el.dataset.id||[...selected][0]));if(d){await navigator.clipboard.writeText(d.url);toast(t('تم نسخ الرابط','URL copied'));}return;}
  return nativeHandleAction(name,el);
};
function isSiteVideo(url){try{return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|dailymotion\.com|instagram\.com|facebook\.com|fb\.watch)$/i.test(new URL(url).hostname);}catch{return false;}}
function showVideoQualities(info){
  const values={best:t('أفضل جودة متاحة — دمج الصوت تلقائيًا','Best available — audio merged automatically'),audio:t('صوت فقط MP3','Audio only MP3')};
  for(const f of info.formats||[])values[f.id]=`${f.height||'?'}p${f.fps>30?' · '+f.fps+'fps':''} · ${f.ext} · ${f.codec.split('.')[0]}${f.size?' · ~'+size(f.size):''}${f.hasAudio?' · A/V':''}`;
  $('#video-qualities').innerHTML=select('quality',t('جودة الفيديو','Video quality'),values,'best');
  const name=$('#add-form [name=name]'),pending=state.downloads.find(d=>d.id===windowArgs.get('id'));if(name&&(!name.value||pending&&JSON.parse(pending.meta).autoName&&name.value===pending.name))name.value=info.title+'.mp4';
  $('#add-form [name=category]').value='video';$('#add-form [name=mode]').value='site';
  $('#probe-result').innerHTML=`<div class="info-box"><strong>${h(info.title)}</strong><br>${duration(info.duration)} · ${info.formats.length} ${t('صيغة متاحة','available formats')} · ${h(info.extractor)}</div>`;
}
init();
