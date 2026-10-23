const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Service}=require('./service.cjs');
async function createServer(service,port=17863){
  const token=crypto.randomBytes(32).toString('hex'),ui=path.join(__dirname,'../ui');
  let origin;
  const same=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
  const server=http.createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const host=req.headers.host;
    if(![`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`].includes(host)){send(403,{error:'Host غير مسموح'});return;}
    const requestOrigin='http://'+host;
    let url;try{url=new URL(req.url,origin);}catch{send(400,{error:'رابط طلب غير صالح'});return;}const isExt=url.pathname.startsWith('/extension/');
    if(isExt){
      if(!/^chrome-extension:\/\/[a-z]+$|^moz-extension:\/\/[a-z0-9-]+$/.test(req.headers.origin||'')){send(403,{error:'مصدر الإضافة غير مسموح'});return;}
      res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','content-type,x-flow-token');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
      if(!service.store.settings.integration){send(403,{error:'فعّل تكامل المتصفح من إعدادات Flow'});return;}
      if(!same(req.headers['x-flow-token'],service.extensionToken)){send(401,{error:'رمز الربط غير صحيح'});return;}
    }else{
      if((req.headers.origin&&req.headers.origin!==requestOrigin)||(req.headers['sec-fetch-site']&& !['same-origin','none'].includes(req.headers['sec-fetch-site']))){send(403,{error:'مصدر غير مسموح'});return;}
    }
    try{
      if(url.pathname==='/api/session'&&req.method==='GET'){send(200,{token});return;}
      if(url.pathname.startsWith('/api/')&&!same(req.headers['x-flow-token'],token)){send(401,{error:'جلسة غير صالحة'});return;}
      if(url.pathname==='/api/state'&&req.method==='GET'){send(200,service.snapshot());return;}
      if((url.pathname==='/api/action'||url.pathname==='/extension/add'||url.pathname==='/extension/ping')&&req.method==='POST'){
        let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>4*1024*1024){send(413,{error:'الطلب كبير جداً'});return;}chunks.push(chunk);}
        const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
        if(url.pathname==='/extension/ping'){service.browserSeen(body.client,body.extensionVersion);const {fileTypes,excludedSites,videoPanel,panelMode}=service.store.settings;send(200,{app:'Flow',version:require('../package.json').version,settings:{fileTypes,excludedSites,videoPanel,panelMode}});return;}
        if(isExt){service.browserSeen(body.client,body.extensionVersion);const item=await service.browserAdd(body);send(200,{result:{id:item.id,name:item.name,status:item.status}});return;}
        send(200,{result:await service.action(body.type,body.data)});return;
      }
      if(req.method!=='GET'){send(405,{error:'طريقة غير مسموحة'});return;}
      if(url.pathname==='/health'){send(200,{app:'Flow',version:require('../package.json').version,database:'Realm'});return;}
      const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');
      const target=path.resolve(ui,requested);
      if(!target.startsWith(ui+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){send(404,{error:'غير موجود'});return;}
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(target)]||'application/octet-stream';
      res.writeHead(200,{'content-type':mime,'cache-control':'no-cache'});fs.createReadStream(target).pipe(res);
    }catch(e){if(!res.headersSent)send(400,{error:e.message});else res.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;
  return{server,origin,token,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
if(require.main===module){
  const dir=process.env.FLOW_DATA_DIR||path.join(__dirname,'../data');const service=new Service(dir);
  createServer(service,Number(process.env.FLOW_PORT)||17863).then(({origin,close})=>{
    console.log(`Flow is running at ${origin} — Realm: ${service.store.realm.path}`);
    const stop=async()=>{await close();await service.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }).catch(async e=>{console.error(e.message);await service.close();process.exit(1);});
}
module.exports={createServer};
