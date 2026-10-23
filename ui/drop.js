let dropLanguage='en';
async function syncDrop(){try{const state=await window.desktopAPI.state();dropLanguage=state.settings.language;applyAppearance(state.settings.theme);document.documentElement.lang=dropLanguage;document.documentElement.dir=dropLanguage==='ar'?'rtl':'ltr';document.querySelector('#drop-target strong').textContent=dropLanguage==='ar'?'أفلت الرابط هنا':'Drop a link here';document.querySelector('#close').ariaLabel=dropLanguage==='ar'?'إغلاق':'Close';}catch{}}
syncDrop();setInterval(syncDrop,1000);
document.querySelector('#close').onclick=()=>window.desktopAPI?.action('dropClose');
document.addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('over');});
document.addEventListener('dragleave',()=>document.body.classList.remove('over'));
document.addEventListener('drop',async e=>{e.preventDefault();document.body.classList.remove('over');const url=(e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain')).split('\n')[0].trim();try{await window.desktopAPI.action('add',{url});document.querySelector('#drop-status').textContent=dropLanguage==='ar'?'تمت الإضافة':'Download added';}catch(err){document.querySelector('#drop-status').textContent=err.message;}});
