let updatesSignature='';
function renderUpdates(){
 const u=state?.updates;if(!u)return;
 const signature=state.settings.language+JSON.stringify(u);if(signature===updatesSignature&&$('#dialog').open)return;updatesSignature=signature;
 const available=u.status==='available',busy=u.status==='checking',release=u.release;
 const errors={offline:t('تعذر الاتصال بـ GitHub. تحقق من اتصال الإنترنت وأعد المحاولة.','Could not reach GitHub. Check your connection and try again.'),'rate-limit':t('GitHub يطلب الانتظار قبل إعادة الفحص. حاول لاحقًا.','GitHub has limited update requests. Please try again later.'),'no-release':t('لا يوجد إصدار منشور متاح حاليًا.','No published release is available yet.'),'invalid-release':t('تعذر التحقق من بيانات الإصدار. لم يتم فتح أي رابط.','The release could not be verified. No link was opened.'),'not-ready':t('الإصدار المنشور لا يحتوي على نسخة ويندوز جاهزة بعد.','The published release does not have a ready Windows download yet.')};
 const title=available?t('تحديث جديد متاح','A new update is available'):busy?t('جارٍ البحث عن تحديثات…','Checking for updates…'):u.status==='current'?t('أنت تستخدم أحدث إصدار','You are up to date'):u.status==='error'?t('تعذر إكمال الفحص','Could not check for updates'):t('تحديثات Flow','Flow updates');
 const body=`<div class="modal-body update-body"><div class="update-hero ${available?'available':''}"><div class="update-mark">${icon(busy?'refresh':available?'arrow':u.status==='current'?'check':'info')}</div><div><h2>${h(title)}</h2><p>${t('الإصدار المثبت','Installed version')}: <bdi>${h(u.currentVersion)}</bdi>${available?' · '+t('الجديد','New')+': <bdi>'+h(release.version)+'</bdi>':''}</p></div></div>${u.status==='error'?`<div class="info-box update-error" role="status">${h(errors[u.error]||errors.offline)}</div>`:''}${available?`<section class="update-notes"><h3>${h(release.title)}</h3><div class="update-release-notes" dir="auto">${h(release.notes||t('تفاصيل الإصدار متاحة على GitHub.','Release details are available on GitHub.'))}</div><p class="help">${t('يفتح زر التحميل صفحة الإصدار لاختيار النسخة المثبتة أو البورتابل. أغلق Flow من قائمته قبل تثبيت التحديث.','The download button opens the release page to choose Setup or Portable. Exit Flow from its menu before installing the update.')}</p></section>`:`<p class="help">${busy?t('نفحص الإصدارات المنشورة في الريبو الرسمي.','Checking published releases in the official repository.'):t('التنبيه يعتمد على إصدار منشور برقم أحدث، وليس مجرد تعديل ملفات السورس.','Notifications follow published releases with newer version numbers, rather than source-only commits.')}</p>`}<div class="update-preference">${check('automaticUpdates',t('التحقق تلقائيًا عند التشغيل ثم كل 6 ساعات','Check automatically at startup and every 6 hours'),u.enabled)}</div><div class="update-source" dir="ltr">github.com/Mohamedabdelnaby1/flow-download-manager</div>${u.lastChecked?`<p class="help">${t('آخر فحص','Last checked')}: ${h(new Date(u.lastChecked).toLocaleString(state.settings.language==='ar'?'ar-EG':'en-GB'))}</p>`:''}</div>`;
 const footer=available?`${button('updatesSkip',t('تخطي هذا الإصدار','Skip this version'),null)}${button('updatesLater',t('ذكرني غدًا','Remind me tomorrow'),null)}${button('updatesOpen',t('التحميل من GitHub','Download from GitHub'),'external','primary')}`:`${button('close',t('إغلاق','Close'),null)}${button('updatesCheck',busy?t('جارٍ الفحص…','Checking…'):t('إعادة الفحص','Check again'),'refresh','primary',busy?'disabled':'')}`;
 modal(t('تحديثات Flow','Flow updates'),body,footer);$('#dialog').classList.add('update-dialog');
}
const beforeUpdateAction=handleAction;
handleAction=async(name,el)=>{
 if(name==='checkUpdates'){
  closeDesktopMenus();
  if(!window.desktopAPI)return toast(t('التحقق من التحديثات متاح في نسخة سطح المكتب.','Update checks are available in the desktop edition.'),true);
  await api('window',{kind:'updates'});await api('updatesCheck');return;
 }
 if(name==='updatesCheck'){el.disabled=true;await api('updatesCheck');await refresh();return;}
 if(name==='updatesOpen'){await api('updatesOpen');closeModal();return;}
 if(name==='updatesLater'||name==='updatesSkip'){await api(name);closeModal();return;}
 return beforeUpdateAction(name,el);
};
document.addEventListener('change',async e=>{
 if(e.target.name!=='automaticUpdates')return;
 try{await api('updatesPreferences',{enabled:e.target.checked});await refresh();}catch(error){toast(error.message,true);}
});
