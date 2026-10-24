const http = require('node:http');
const https = require('node:https');
const h2 = require('http2-wrapper');
const { ProxyAgent } = require('proxy-agent');
const agents = { http: new http.Agent({ keepAlive:true, maxSockets:128 }), https: new https.Agent({ keepAlive:true, maxSockets:128 }), http2: new h2.Agent({maxSessions:32}) };
function validateURL(value, protocols = ['http:','https:','ftp:','ftps:']) {
  const u=new URL(value); if(!protocols.includes(u.protocol)) throw Error('بروتوكول الرابط غير مدعوم');
  if(u.username || u.password) throw Error('أدخل بيانات الدخول في حقل الحساب، وليس داخل الرابط'); return u;
}
async function request(url, options = {}, redirects = 0) {
  const u=validateURL(url,['http:','https:']);
  const headers={ 'user-agent':'Flow/1.0', 'accept-encoding':'identity', ...options.headers };
  const settings=options.settings||{};
  const except=(settings.proxyExceptions||'').split(',').map(s=>s.trim()).filter(Boolean);
  const proxy=settings.proxy && !except.includes(u.hostname) ? settings.proxy : '';
  let req;
  const timeout=Math.max(1,Number(options.timeoutMs)||30000),controller=new AbortController();
  const signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
  const response=await new Promise((resolve,reject)=>{
    let settled=false;
    const cleanup=()=>{clearTimeout(deadline);signal.removeEventListener('abort',aborted);};
    const fail=e=>{if(settled)return;settled=true;cleanup();reject(e);};
    const aborted=()=>{req?.destroy(signal.reason);fail(signal.reason||Error('تم إلغاء الاتصال'));};
    const deadline=setTimeout(()=>controller.abort(Error('انتهت مهلة الاتصال بالخادم')),timeout);
    signal.addEventListener('abort',aborted,{once:true});
    if(signal.aborted){aborted();return;}
    const receive=r=>{if(settled){r.destroy();return;}settled=true;cleanup();resolve(r);};
    (async()=>{try {
      const config={method:options.method||'GET',headers,signal,timeout};
      if(proxy){config.agent=new ProxyAgent({getProxyForUrl:()=>proxy});req=(u.protocol==='https:'?https:http).request(u,config,receive);}
      else if(u.protocol==='https:'&&!options.http1)req=await h2.auto(u,{...config,agent:agents},receive);
      else req=(u.protocol==='https:'?https:http).request(u,{...config,agent:u.protocol==='https:'?agents.https:agents.http},receive);
      req.on('error',fail);req.on('timeout',()=>req.destroy(Error('انتهت مهلة استجابة الخادم')));
      if(signal.aborted){req.destroy(signal.reason);return;}req.end(options.body);
    }catch(e){fail(e);}})();
  });
  response.on('error',()=>{});
  if([301,302,303,307,308].includes(response.statusCode)) {
    response.destroy(); if(redirects>=8) throw Error('عدد تحويلات الرابط أكبر من المسموح');
    const next=new URL(response.headers.location,url); validateURL(next.href,['http:','https:']);
    const nextOptions={...options, headers:{...headers}};
    if(next.origin!==u.origin) for(const key of Object.keys(nextOptions.headers)) if(['authorization','cookie','referer','origin'].includes(key.toLowerCase())) delete nextOptions.headers[key];
    return request(next.href,nextOptions,redirects+1);
  }
  response.finalURL=url; return response;
}
async function buffer(url, options = {}, max = 5*1024*1024) {
  const r=await request(url,options); if(r.statusCode>=400){r.destroy();throw Error(`HTTP ${r.statusCode}`);}
  let size=0;const chunks=[];for await(const c of r){size+=c.length;if(size>max){r.destroy();throw Error('المحتوى أكبر من الحد المسموح للفحص');}chunks.push(c);}return {body:Buffer.concat(chunks),headers:r.headers,url:r.finalURL};
}
async function probe(url,options={}) {
  let r=await request(url,{...options,headers:{...options.headers,range:'bytes=0-0'}});
  // Some signed/CDN endpoints accept a normal GET but reject the Range probe.
  if([400,403,405,416,501].includes(r.statusCode)){r.destroy();const headers={...options.headers};delete headers.range;r=await request(url,{...options,headers});}
  const code=r.statusCode;const headers=r.headers; const finalURL=r.finalURL;r.destroy();
  if(code>=400) throw Error(`HTTP ${code} — ${code===403?'الرابط مرفوض أو منتهي الصلاحية':code===401?'بيانات الدخول مطلوبة':'تعذر الوصول إلى الملف'}`);
  const range=/bytes\s+0-0\/(\d+)/i.exec(headers['content-range']||'');
  const size=range?Number(range[1]):Number(headers['content-length']||0);
  return {size,resumable:code===206&&!!range,etag:headers.etag||'',modified:headers['last-modified']||'',type:headers['content-type']||'',disposition:headers['content-disposition']||'',url:finalURL,protocol:'HTTP'};
}
async function zipPreview(url,options={}){return require('./zip.cjs').list(url,options);}
module.exports={request,buffer,probe,zipPreview,validateURL};
