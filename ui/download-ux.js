// Small task-first confirmation windows. Technical controls remain in Advanced.
let downloadCollection=null,collectionRequest=0,inspectionTimer;
const originalOpenAdd=openAdd,originalSubmitAdd=submitAdd,originalDownloadAction=handleAction;
const originalDownloadFormError=formError;
formError=function(error){originalDownloadFormError(error);const info=FlowErrors.describe(error,state?.settings.language||'en'),url=$('#f-url')?.value;if(window.desktopAPI&&/^https?:/i.test(url||'')&&['LOGIN_REQUIRED','FORBIDDEN','VIDEO_EXTRACT'].includes(info.code)&&!$('#form-error [data-error-source]')){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=t('فتح المصدر في المتصفح','Open source in browser');button.onclick=()=>api('sourceOpen',{url}).catch(e=>toast(e,true));$('#form-error .flow-error-card')?.append(button);}};
function qualityPresets(current='best'){
 return select('quality',t('الجودة','Quality'),{best:t('أفضل جودة متاحة','Best available'),max1080:t('فيديو حتى 1080p','Video up to 1080p'),max720:t('فيديو حتى 720p','Video up to 720p'),max480:t('فيديو حتى 480p','Video up to 480p'),audio:t('صوت فقط · MP3','Audio only · MP3')},current);
}
function prepareVideoChoice(){
 const form=$('#add-form');if(!form)return;const url=$('#f-url').value,video=isSiteVideo(url),playlist=isPlaylistURL(url);form.classList.toggle('video-confirm',video);$('#dialog').classList.add('download-confirm');
 if(video){$('#add-form [name=mode]').value='site';if(!$('#f-quality'))$('#video-qualities').innerHTML=qualityPresets();}
 else $('#video-qualities').replaceChildren();
 form.dataset.inspectedUrl='';setDownloadReady(false);
 const probe=$('[data-action=probeAdd]');if(probe)probe.textContent=playlist?t('عرض القائمة','View playlist'):video?t('تحديث الجودات','Refresh qualities'):t('فحص الرابط','Inspect link');
}
openAdd=function(url=''){
 originalOpenAdd(url);if(!$('#add-form')||(!windowContext&&window.desktopAPI))return;
 downloadCollection=null;collectionRequest++;prepareVideoChoice();const form=$('#add-form');
 const qualities=$('#video-qualities');$('#probe-result').before(qualities);
 const pending=state.downloads.find(d=>d.id===windowArgs.get('id'));const quality=pending&&JSON.parse(pending.meta).quality;if(quality&&$('#f-quality'))$('#f-quality').value=quality;
 form.addEventListener('input',event=>{if(event.target.name!=='url')return;form.dataset.inspectedUrl='';setDownloadReady(false);clearTimeout(inspectionTimer);downloadCollection=null;collectionRequest++;api('collectionCancel').catch(()=>{});$('#form-error').replaceChildren();$('#probe-result').replaceChildren();$('#video-qualities').replaceChildren();prepareVideoChoice();const probe=$('[data-action=probeAdd]');if(probe)probe.disabled=false;if(/^https?:\/\//i.test(event.target.value))inspectionTimer=setTimeout(()=>inspectDownload(),400);else if(/^(magnet:|ftp:)/i.test(event.target.value))setDownloadReady(true);});
 $('#dialog').addEventListener('close',()=>{clearTimeout(inspectionTimer);collectionRequest++;api('collectionCancel').catch(()=>{});},{once:true});
 form.addEventListener('input',event=>{if(!['cookie','referer','username','password'].includes(event.target.name))return;cancelProbe();clearTimeout(inspectionTimer);form.dataset.inspectedUrl='';setDownloadReady(false);inspectionTimer=setTimeout(()=>inspectDownload(),500);});
 form.addEventListener('input',event=>{if(event.target.name==='url')$('#add-form [name=mode]').value=isSiteVideo(event.target.value)?'site':'file';});
 form.addEventListener('change',event=>{if(event.target.name!=='mode')return;cancelProbe();form.dataset.inspectedUrl='';setDownloadReady(false);inspectDownload();});
};
function probeHeaders(){const d=readForm('#add-form'),headers={};if(d.referer)headers.referer=d.referer;if(d.cookie)headers.cookie=d.cookie;if(d.username||d.password)headers.authorization='Basic '+btoa(String.fromCharCode(...new TextEncoder().encode(d.username+':'+d.password)));return headers;}
function setDownloadReady(ready){for(const element of $$('[data-action=addNow],[data-action=addLater]')){element.disabled=!ready;element.title=ready?'':t('انتظر اكتمال الفحص بنجاح أولًا','Wait for inspection to finish successfully');}}
async function inspectDownload(){
 const form=$('#add-form');if(!form)return;const url=$('#f-url').value;if(!url)return;form.dataset.inspectedUrl='';setDownloadReady(false);
 if(isPlaylistURL(url))return inspectDownloadCollection(url);
 cancelProbe();const requestId=crypto.randomUUID();activeProbe=requestId;const button=$('[data-action=probeAdd]');if(button)button.disabled=true;$('#form-error').replaceChildren();
 $('#probe-result').innerHTML='<div class="inspection-status" role="status"><span class="inspection-spinner" aria-hidden="true"></span><span>'+t('جارٍ التحقق من الرابط وقراءة المعلومات… سيتفعّل زر التحميل بعد اكتمال الفحص.','Checking the link and reading details… Download unlocks when this finishes.')+'</span>'+buttonHTMLCancel()+'</div>';
 try{const d=readForm('#add-form'),info=await api('probe',{url,headers:probeHeaders(),requestId,mode:d.mode,id:windowArgs.get('id')||undefined});if(activeProbe!==requestId||!form.isConnected||$('#f-url')?.value!==url)return;if(!info.video&&/text\/html/i.test(info.type||'')&&!/\.html?$/i.test(new URL(url).pathname))throw Error(t('الرابط يفتح صفحة ويب وليس ملفًا. استخدم زر الفيديو في الإضافة أو رابط الملف المباشر.','This link opens a webpage, not a file. Use the extension video button or a direct file link.'));form.dataset.inspectedUrl=url;setDownloadReady(true);if(info.video)showVideoQualities(info);else $('#probe-result').innerHTML='<div class="info-box">'+h(info.size?size(info.size):t('الحجم غير معروف','Unknown size'))+' · '+h(info.type||'')+'</div>';
 }catch(error){if(activeProbe===requestId&&form.isConnected){$('#probe-result').replaceChildren();formError(error);}}
 finally{if(activeProbe===requestId){activeProbe='';if(button)button.disabled=false;}}
}
function buttonHTMLCancel(){return button('cancelInspection',t('إلغاء الفحص','Cancel inspection'),'x');}
showVideoQualities=function(info){
 const selectedQuality=$('#f-quality')?.value||'best',formats=info.formats||[],heights=[...new Set(formats.map(f=>f.height).filter(Boolean))].sort((a,b)=>b-a),values={best:t('أفضل جودة متاحة','Best available')};
 for(const height of heights){const candidates=formats.filter(f=>f.height===height),f=candidates.find(f=>f.ext==='mp4')||candidates[0];values[f.id]=height+'p · '+String(f.ext||'video').toUpperCase()+(f.size?' · ~'+size(f.size):'');}values.audio=t('صوت فقط · MP3','Audio only · MP3');
 if(selectedQuality.startsWith('max')&&!values[selectedQuality])values[selectedQuality]=t('فيديو حتى ','Video up to ')+selectedQuality.slice(3)+'p';
 $('#video-qualities').innerHTML=select('quality',t('الجودة','Quality'),values,values[selectedQuality]?selectedQuality:'best');
 const field=$('#f-name'),pending=state.downloads.find(d=>d.id===windowArgs.get('id'));if(field&&(!field.value||pending&&JSON.parse(pending.meta).autoName&&field.value===pending.name))field.value=info.title+'.mp4';
 $('#add-form [name=category]').value='video';$('#add-form [name=mode]').value='site';
 $('#probe-result').innerHTML='<div class="video-summary"><strong dir="auto">'+h(info.title)+'</strong><small>'+h(duration(info.duration))+' · '+heights.length+' '+t('جودات متاحة · الصوت يُدمج تلقائيًا','qualities · audio merged automatically')+'</small></div>';
};
async function inspectDownloadCollection(url){
 cancelProbe();const request=++collectionRequest,form=$('#add-form');downloadCollection=null;$('#form-error').replaceChildren();$('#probe-result').innerHTML='<div class="inspection-status" role="status">'+t('جارٍ قراءة عناوين القائمة فقط…','Reading playlist titles only…')+buttonHTMLCancel()+'</div>';
 const controls=$$('[data-action=addNow],[data-action=addLater],[data-action=probeAdd]');controls.forEach(b=>b.disabled=true);
 try{const result=await api('collectionInfo',{url,id:windowArgs.get('id')||undefined});if(request!==collectionRequest||!form.isConnected||$('#f-url')?.value!==url)return;downloadCollection=result;form.dataset.inspectedUrl=url;
 $('#probe-result').innerHTML='<section class="collection-preview"><strong dir="auto">'+h(result.title)+'</strong><p>'+result.items.length+' '+t('فيديو · يمكنك إلغاء تحديد أي عنصر','videos · uncheck any item')+(result.truncated?' · '+t('القائمة أكبر من حد الفحص','Playlist exceeds inspection limit'):'')+'</p><div class="collection-selection">'+button('collectionSelectAll',t('تحديد الكل','Select all'),'check')+button('collectionSelectNone',t('إلغاء الكل','Clear all'),'x')+'</div><div class="collection-items">'+result.items.map(item=>'<label><input type="checkbox" data-collection-id="'+h(item.id)+'" checked><span dir="auto">'+h(item.title)+'</span></label>').join('')+'</div><small>'+t('الجودة تُطبق على المحدد. تُحفظ الفيديوهات في مجلد باسم القائمة، ويُتخطى الموجود بالمكتبة.','Your quality applies to the selection. Videos save in a playlist folder; existing library links are skipped.')+'</small></section>';
 }catch(error){if(request===collectionRequest&&form.isConnected){$('#probe-result').replaceChildren();formError(error);}}
 finally{if(request===collectionRequest){const probe=$('[data-action=probeAdd]');if(probe)probe.disabled=false;setDownloadReady(!!downloadCollection);}}
}
submitAdd=async function(later){
 const form=$('#add-form');if(!form||!form.reportValidity())return;const data=readForm('#add-form');
 if(/^https?:/i.test(data.url)&&form.dataset.inspectedUrl!==data.url){if(!activeProbe)await inspectDownload();return;}
 if(!isPlaylistURL(data.url))return originalSubmitAdd(later);
 if(!downloadCollection||downloadCollection.url!==new URL(data.url).origin+'/playlist?list='+encodeURIComponent(new URL(data.url).searchParams.get('list')))return inspectDownloadCollection(data.url);
 const ids=new Set($$('[data-collection-id]:checked').map(i=>i.dataset.collectionId)),items=downloadCollection.items.filter(i=>ids.has(i.id));if(!items.length){formError(t('حدد فيديو واحدًا على الأقل','Select at least one video'));return;}
 const controls=$$('[data-action=addNow],[data-action=addLater]');controls.forEach(b=>b.disabled=true);
 try{const result=await api('collectionAdd',{items,id:windowArgs.get('id')||undefined,title:downloadCollection.title,quality:data.quality||'best',numbered:true,makeFolder:true,skipDuplicates:true,queueId:data.queueId||'main'});if(!later&&result.count)await api('queue',{id:data.queueId||'main',running:true});closeModal();if(!windowContext)toast(result.count+' '+t('فيديو أُضيف','videos added'));}catch(error){formError(error);controls.forEach(b=>b.disabled=false);}
};
handleAction=async function(name,el){
 if(name==='probeAdd')return inspectDownload();
 if(name==='cancelInspection'){cancelProbe();collectionRequest++;await api('collectionCancel');$('#probe-result')?.replaceChildren();const probe=$('[data-action=probeAdd]');if(probe)probe.disabled=false;setDownloadReady(false);return;}
 if(name==='collectionSelectAll'||name==='collectionSelectNone'){$$('[data-collection-id]').forEach(i=>i.checked=name==='collectionSelectAll');return;}
 return originalDownloadAction(name,el);
};
document.addEventListener('dragstart',event=>{const file=event.target.closest('[data-drag-file]');if(!file)return;event.preventDefault();if(window.desktopAPI?.startDrag)window.desktopAPI.startDrag(file.dataset.dragFile);else if(window.desktopAPI)api('dragFile',{id:file.dataset.dragFile}).catch(e=>toast(e,true));});
document.addEventListener('change',event=>{if(event.target.name!=='quality')return;const name=$('#f-name');if(name?.value){if(event.target.value==='audio')name.value=name.value.replace(/\.(mp4|mkv|webm)$/i,'.mp3');else name.value=name.value.replace(/\.mp3$/i,'.mp4');}});
