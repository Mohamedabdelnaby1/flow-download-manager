/* Presentation only: these controls reuse existing validated actions and saved preferences. */
function updateWorkspaceOverview(){
 const target=document.getElementById('workspace-overview');if(!target||!state)return;
 const active=state.downloads.filter(isActive),waiting=state.downloads.filter(d=>['pending','queued'].includes(d.status)),done=state.downloads.filter(d=>d.status==='complete');
 const metrics=[['active',t('جارٍ التحميل','In progress'),active.length,'activity',t('تحميلات نشطة','active downloads')],['speed',t('السرعة الآن','Current speed'),size(active.reduce((n,d)=>n+(Number(d.speed)||0),0))+'/s','down',t('إجمالي معدل النقل','combined transfer rate')],['waiting',t('في الانتظار','Up next'),waiting.length,'clock',t('بانتظار البدء','waiting to start')],['finished',t('مكتملة','Completed'),done.length,'check',t('جاهزة للاستخدام','ready to use')]];
 const key=JSON.stringify(metrics);if(target.dataset.key===key)return;target.dataset.key=key;
 target.innerHTML=metrics.map(([tone,label,value,ico,caption])=>`<div class="overview-card tone-${tone}"><span class="overview-icon">${icon(ico)}</span><div><span class="overview-label">${label}</span><strong class="numeric">${h(String(value))}</strong><small>${caption}</small></div></div>`).join('');
}
const designHandleAction=handleAction;
handleAction=async function(name,el){if(name==='appearancePanel')return openTools('preferences');return designHandleAction(name,el);};
function decorateAppearanceChoices(){
 const accent=document.querySelector('select[name=accent]');if(accent&&!accent.parentElement.querySelector('.accent-picker')){const group=document.createElement('div');group.className='accent-picker';group.setAttribute('role','group');group.ariaLabel=t('اختيار الباليت','Choose your palette');group.innerHTML=[...accent.options].map(o=>'<button type="button" data-accent-choice="'+o.value+'" title="'+h(o.text)+'" aria-label="'+h(o.text)+'" aria-pressed="'+(o.value===accent.value)+'"><i></i><span>'+h(o.text)+'</span></button>').join('');accent.after(group);accent.classList.add('theme-select-fallback');}if(accent)for(const b of accent.parentElement.querySelectorAll('[data-accent-choice]'))b.setAttribute('aria-pressed',String(b.dataset.accentChoice===accent.value));
 const select=document.querySelector('select[name=theme]');if(!select)return;
 let picker=select.parentElement.querySelector('.appearance-picker');
 if(!picker){picker=document.createElement('div');picker.className='appearance-picker';picker.setAttribute('role','group');picker.ariaLabel=t('اختيار المظهر','Choose appearance');
  picker.innerHTML=[['system',t('حسب النظام','System'),t('يتبع جهازك','Follows your device')],['light',t('فاتح','Light'),t('إضاءة ناعمة','Soft daylight')],['dark',t('داكن','Dark'),t('درجات ليلية','Tonal night')],['amoled',t('أسود AMOLED','AMOLED'),t('أسود حقيقي','True black')]].map(([id,label,help])=>`<button type="button" class="appearance-choice" data-theme-choice="${id}" aria-pressed="false"><span class="appearance-preview preview-${id}" aria-hidden="true"><i></i><b></b><em></em></span><strong>${label}</strong><small>${help}</small></button>`).join('');
  select.insertAdjacentElement('afterend',picker);select.classList.add('theme-select-fallback');
 }
 for(const button of picker.children)button.setAttribute('aria-pressed',String(button.dataset.themeChoice===select.value));
}
// Observe structure only: never re-render a form, reset its draft, or steal focus.
const designObserver=new MutationObserver(()=>decorateAppearanceChoices());
designObserver.observe(document.getElementById('dialog-content'),{childList:true,subtree:true});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-theme-choice]');if(!button)return;
 const select=button.closest('.field').querySelector('select[name=theme]');select.value=button.dataset.themeChoice;
 select.dispatchEvent(new Event('change',{bubbles:true}));
 window.flowDesignPreview=select.value;applyAppearance(select.value);FlowWorkspaceAppearance.apply(state.downloadTools?.preferences);decorateAppearanceChoices();
});

const designCloseModal=closeModal;closeModal=function(){window.flowDesignPreview=null;window.flowWorkspacePreview=null;return designCloseModal();};
document.getElementById("dialog").addEventListener("close",()=>{window.flowDesignPreview=null;if(state)applyAppearance(state.settings.theme);});

document.addEventListener('click',event=>{const button=event.target.closest('[data-accent-choice]');if(!button)return;const select=button.closest('.field').querySelector('select[name=accent]');select.value=button.dataset.accentChoice;select.dispatchEvent(new Event('change',{bubbles:true}));decorateAppearanceChoices();});
