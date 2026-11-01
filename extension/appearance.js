var flowBrowser=typeof browser==='object'&&browser.runtime?browser:chrome;
/* Desktop preference arrives through the existing authenticated ping. No page content is changed. */
(async()=>{
 const apply=theme=>{document.documentElement.dataset.theme=['light','dark','amoled'].includes(theme)?theme:'system';};
 apply((await flowBrowser.storage.local.get('theme')).theme);
 flowBrowser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.theme)apply(changes.theme.newValue);});
})().catch(()=>{});
