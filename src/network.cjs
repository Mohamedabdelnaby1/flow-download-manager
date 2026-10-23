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
  const response=await new Promise(async (resolve,reject)=>{
    try {
      const config={ method:options.method||'GET', headers, signal:options.signal, timeout:30000 };
      if(proxy) { config.agent=new ProxyAgent({getProxyForUrl:()=>proxy}); req=(u.protocol==='https:'?https:http).request(u,config,resolve); }
      else if(u.protocol==='https:') req=await h2.auto(u,{...config,agent:agents},resolve);
      else req=http.request(u,{...config,agent:agents.http},resolve);
      req.on('timeout',()=>req.destroy(Error('انتهت مهلة الاتصال'))); req.on('error',reject); req.end(options.body);
    } catch(e){reject(e);}
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
async function zipPreview(url,options={}) {
  const info=await probe(url,options); if(!info.resumable||!info.size) throw Error('معاينة ZIP تحتاج خادماً يدعم النطاقات');
  const start=Math.max(0,info.size-65557);
  const {body:tail}=await buffer(url,{...options,headers:{...options.headers,range:`bytes=${start}-${info.size-1}`}},65557);
  let end=-1; for(let i=tail.length-22;i>=0;i--) if(tail.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0) throw Error('الملف ليس ZIP قياسياً');
  if(tail.readUInt16LE(end+4)||tail.readUInt16LE(end+6)) throw Error('الأرشيف متعدد الأجزاء غير مدعوم');
  const length=tail.readUInt32LE(end+12),offset=tail.readUInt32LE(end+16);
  if(!length)return [];
  if(offset+length>info.size)throw Error('فهرس ZIP غير صالح');
  if(offset===0xffffffff||length===0xffffffff) throw Error('معاينة ZIP64 غير مدعومة');
  if(length>8*1024*1024)throw Error('فهرس الأرشيف أكبر من حد المعاينة');
  const {body}=await buffer(url,{...options,headers:{...options.headers,range:`bytes=${offset}-${offset+length-1}`}},8*1024*1024);
  const files=[];let p=0;while(p+46<=body.length && body.readUInt32LE(p)===0x02014b50){
    const n=body.readUInt16LE(p+28),extra=body.readUInt16LE(p+30),comment=body.readUInt16LE(p+32);
    files.push({name:body.subarray(p+46,p+46+n).toString('utf8'),size:body.readUInt32LE(p+24),compressed:body.readUInt32LE(p+20)});p+=46+n+extra+comment;
    if(files.length>=5000)break;
  } return files;
}
module.exports={request,buffer,probe,zipPreview,validateURL};
