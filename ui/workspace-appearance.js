(function(root){
 const tones={sage:['#397e6d','#9fcfbf'],blue:['#426d9c','#accbed'],violet:['#75609a','#cdbce7'],rose:['#9d5c72','#e4b5c5'],sand:['#896b39','#dbc393'],teal:['#287f87','#9ed1d5']};
 let last={};
 function apply(p={}){last=p;const tone=tones[p.accent]||tones.sage,dark=document.body.classList.contains('dark'),primary=tone[dark?1:0];document.body.style.setProperty('--primary',primary);document.body.style.setProperty('--primary-soft',`color-mix(in srgb, ${primary} ${dark?'16':'11'}%, var(--surface))`);document.body.style.setProperty('--on-primary',dark?'#17312b':'#ffffff');document.body.dataset.density=p.density||'comfortable';document.body.dataset.corners=p.corners||'soft';document.body.dataset.motion=p.motion||'system';document.body.style.setProperty('--sidebar-width',Math.max(160,Math.min(320,Number(p.sidebarWidth)||232))+'px');document.body.dataset.toolbarLabels=p.toolbarLabels===false?'hidden':'visible';}
 root.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change',()=>apply(last));
 const applyAppearance=apply;
 apply=function(p={}){applyAppearance(p);document.body.style.fontFamily=p.font&&p.font!=='system'?'"'+p.font+'",system-ui,sans-serif':'';};
 root.FlowWorkspaceAppearance={apply,tones};
})(globalThis);
