const path=require('node:path'),crypto=require('node:crypto');
const categories=new Set(['compressed','documents','music','programs','video','other']);
function validateRule(value,store){
 const host=String(value.host||'').trim().toLowerCase();if(host&&!/^(\*\.)?[a-z0-9.-]+$/.test(host))throw Error('اكتب نطاقًا مثل example.com أو *.example.com');
 const extensions=String(value.extensions||'').toLowerCase().split(/[\s,;.]+/).filter(Boolean);if(extensions.some(e=>!/^[a-z0-9]{1,12}$/.test(e)))throw Error('امتداد غير صالح');
 if(!host&&!extensions.length)throw Error('حدد موقعًا أو امتدادًا واحدًا على الأقل');
 if(value.category&&!categories.has(value.category))throw Error('تصنيف غير صالح');
 if(value.queueId&&!store.queues().some(q=>q.id===value.queueId))throw Error('القائمة غير موجودة');
 const directory=String(value.directory||'');if(directory&&!path.isAbsolute(directory))throw Error('اختر مجلدًا مطلقًا');
 const folder=String(value.folder||'').trim();if(folder&&!['host','date','host-date'].includes(folder))throw Error('نمط مجلد غير صالح');
 return {id:value.id&&/^[a-z0-9-]{1,80}$/i.test(value.id)?value.id:crypto.randomUUID(),name:String(value.name||host||extensions.join(', ')).trim().slice(0,100),enabled:value.enabled!==false,host,extensions,category:value.category||'',queueId:value.queueId||'',directory,folder,prefix:String(value.prefix||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,50),priority:Math.max(-2,Math.min(2,Math.trunc(Number(value.priority)||0))),speedLimit:Math.max(0,Math.min(1000000,Number(value.speedLimit)||0)),defer:!!value.defer};
}
function applyRules(data,store,now=new Date()){
 const u=new URL(data.url);let original=data.name;try{original||=decodeURIComponent(u.pathname.split('/').pop());}catch{}original||=u.hostname||'download';
 const ext=original.split('.').pop().toLowerCase(),host=u.hostname.toLowerCase();
 const rules=store.get('automationRules',[]);const rule=rules.find(r=>r.enabled&&(!r.host||host===r.host.replace(/^\*\./,'')||r.host.startsWith('*.')&&host.endsWith(r.host.slice(1)))&&(!r.extensions.length||r.extensions.includes(ext)));
 if(!rule)return {...data};
 const result={...data,ruleId:rule.id,ruleName:rule.name,priority:data.priority??rule.priority,speedLimit:data.speedLimit||rule.speedLimit,later:data.later||rule.defer};
 if(rule.category&&!data.category)result.category=rule.category;
 if(rule.queueId&&store.queues().some(q=>q.id===rule.queueId)&&!data.queueId)result.queueId=rule.queueId;
 if(rule.prefix)result.name=rule.prefix+original;
 if(!data.directory&&(rule.directory||rule.folder)){
  let base=rule.directory||store.settings.categoryFolders?.[result.category]||store.settings.downloadDir;
  const safeHost=host.replace(/[^a-z0-9.-]/g,'_')||'files',date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  if(rule.folder==='host')base=path.join(base,safeHost);if(rule.folder==='date')base=path.join(base,date);if(rule.folder==='host-date')base=path.join(base,safeHost,date);result.directory=base;
 }return result;
}
function validateTraffic(value){
 const mode=value.mode||'normal';if(!['normal','browse','metered','custom','schedule'].includes(mode))throw Error('وضع شبكة غير صالح');
 const kbps=Math.max(1,Math.min(1000000,Number(value.kbps)||512)),slots=Math.max(1,Math.min(16,Math.trunc(Number(value.slots)||2))),schedule=[];
 for(const row of value.schedule||[]){if(schedule.length>=14)throw Error('الحد الأقصى 14 فترة');for(const k of ['start','end'])if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(row[k]))throw Error('وقت غير صالح');if(row.start===row.end)throw Error('وقت البداية والنهاية يجب أن يختلفا');const days=[...new Set(row.days||[0,1,2,3,4,5,6])];if(!days.length||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('أيام غير صالحة');schedule.push({start:row.start,end:row.end,days,kbps:Math.max(1,Math.min(1000000,Number(row.kbps)||512)),slots:Math.max(1,Math.min(16,Math.trunc(Number(row.slots)||2)))});}
 return {mode,kbps,slots,schedule};
}
function effectiveTraffic(store,now=new Date()){
 const s=store.settings,plan=store.get('trafficPlan',{mode:'normal',kbps:512,slots:2,schedule:[]});let current;
 if(plan.mode==='browse')current={kbps:512,slots:2};else if(plan.mode==='metered')current={kbps:128,slots:1};else if(plan.mode==='custom')current=plan;
 else if(plan.mode==='schedule'){
  const minutes=now.getHours()*60+now.getMinutes(),day=now.getDay(),at=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
  current=plan.schedule.find(r=>{const a=at(r.start),b=at(r.end);return a<b?r.days.includes(day)&&minutes>=a&&minutes<b:(r.days.includes(day)&&minutes>=a||r.days.includes((day+6)%7)&&minutes<b);});
 }
 return {mode:plan.mode,scheduled:plan.mode==='schedule'&&!!current,speedLimit:current?(s.speedLimit?Math.min(s.speedLimit,current.kbps):current.kbps):s.speedLimit,simultaneous:current?Math.min(s.simultaneous,current.slots):s.simultaneous};
}
module.exports={validateRule,applyRules,validateTraffic,effectiveTraffic};
