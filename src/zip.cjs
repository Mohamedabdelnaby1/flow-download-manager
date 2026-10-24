const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const net=require('./network.cjs');
const MAX=128*1024*1024;
async function range(url,start,end,total,options){
 const r=await net.request(url,{...options,headers:{...options.headers,range:`bytes=${start}-${end}`}});
 if(r.statusCode!==206||r.headers['content-range']!==`bytes ${start}-${end}/${total}`){r.destroy();throw Error('The server did not return the exact archive range');}
 let size=0;const chunks=[];for await(const chunk of r){size+=chunk.length;if(size>end-start+1){r.destroy();throw Error('Archive range is too large');}chunks.push(chunk);}if(size!==end-start+1)throw Error('Archive range is incomplete');return Buffer.concat(chunks);
}
function safeName(name){if(!name||name.includes('\0')||name.includes('\\')||/^[/]|^[a-z]:/i.test(name)||name.split('/').some(p=>p==='..'||p==='.'||p.includes(':')))throw Error('Unsafe archive entry path');return name;}
async function list(url,options={}){
 net.validateURL(url,['http:','https:']);const info=await net.probe(url,options);if(!info.resumable||info.size<22)throw Error('Selective ZIP download needs a server with byte-range support');
 const headers={...options.headers,...(info.etag?{'if-match':info.etag}:{})};options={...options,headers};
 const start=Math.max(0,info.size-65557),tail=await range(url,start,info.size-1,info.size,options);let end=-1;
 for(let i=tail.length-22;i>=0;i--)if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){end=i;break;}
 if(end<0)throw Error('Not a supported ZIP archive');if(tail.readUInt16LE(end+4)||tail.readUInt16LE(end+6))throw Error('Multipart ZIP is not supported');
 const count=tail.readUInt16LE(end+10),length=tail.readUInt32LE(end+12),offset=tail.readUInt32LE(end+16);
 if(count===65535||offset===0xffffffff||length===0xffffffff)throw Error('ZIP64 is not supported');if(count>5000||length>8*1024*1024||offset+length>start+end)throw Error('Archive index is too large or invalid');if(!count)return [];
 const body=await range(url,offset,offset+length-1,info.size,options),files=[];let p=0;
 while(p<body.length){if(p+46>body.length||body.readUInt32LE(p)!==0x02014b50)throw Error('Invalid archive index');const n=body.readUInt16LE(p+28),extra=body.readUInt16LE(p+30),comment=body.readUInt16LE(p+32);if(!n||p+46+n+extra+comment>body.length)throw Error('Truncated archive index');
  const flags=body.readUInt16LE(p+8),method=body.readUInt16LE(p+10),size=body.readUInt32LE(p+24),compressed=body.readUInt32LE(p+20),localOffset=body.readUInt32LE(p+42),crc=body.readUInt32LE(p+16),mode=body.readUInt32LE(p+38)>>>16,name=body.subarray(p+46,p+46+n).toString('utf8');let reason='';
  try{safeName(name);}catch(e){reason=e.message;}if(name.endsWith('/'))reason='Folder';if((mode&0xf000)===0xa000)reason='Symbolic links are not supported';if(flags&1)reason='Encrypted entries are not supported';if(![0,8].includes(method))reason='Compression method is not supported';if(size>MAX||compressed>64*1024*1024)reason='Entry exceeds the selective download limit';if(localOffset===0xffffffff||size===0xffffffff||compressed===0xffffffff||localOffset+30+compressed>offset)reason='ZIP64 or invalid local offset';
  files.push({name,size,compressed,flags,method,localOffset,crc,available:!reason,reason,total:info.size,etag:info.etag});p+=46+n+extra+comment;
 }if(files.length!==count)throw Error('Archive entry count mismatch');return files;
}
const table=Array.from({length:256},(_,n)=>{for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
async function extract(service,data){
 if(!Array.isArray(data.names)||data.names.length<1||data.names.length>30)throw Error('Choose 1–30 ZIP files');const directory=String(data.directory||service.store.settings.downloadDir);if(!path.isAbsolute(directory))throw Error('Choose an absolute folder');
 return service.smart.run(async()=>{const controller=new AbortController();service.smart.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),180000);timer.unref();const options={headers:service.engine.authHeaders(data.url),settings:service.store.settings,signal:controller.signal};
 try{const files=await list(data.url,options),chosen=data.names.map(name=>{const matches=files.filter(f=>f.name===name);if(matches.length!==1||!matches[0].available)throw Error('Archive entry is unavailable or ambiguous');return matches[0];});if(new Set(data.names).size!==data.names.length||chosen.reduce((n,f)=>n+f.size,0)>256*1024*1024)throw Error('Selection is too large');const results=[];
 for(const file of chosen){controller.signal.throwIfAborted();const headers={...options.headers,...(file.etag?{'if-match':file.etag}:{})},opts={...options,headers};const local=await range(data.url,file.localOffset,file.localOffset+29,file.total,opts);if(local.readUInt32LE(0)!==0x04034b50||local.readUInt16LE(6)&1||local.readUInt16LE(8)!==file.method)throw Error('ZIP local header mismatch');
  const nameLength=local.readUInt16LE(26),extra=local.readUInt16LE(28),start=file.localOffset+30+nameLength+extra;if(start+file.compressed>file.total)throw Error('Invalid compressed range');const name=await range(data.url,file.localOffset+30,file.localOffset+29+nameLength,file.total,opts);if(name.toString('utf8')!==file.name)throw Error('ZIP entry name mismatch');
  const compressed=file.compressed?await range(data.url,start,start+file.compressed-1,file.total,opts):Buffer.alloc(0);const bytes=file.method===8?await new Promise((resolve,reject)=>zlib.inflateRaw(compressed,{maxOutputLength:Math.max(1,file.size)},(e,b)=>e?reject(e):resolve(b))):compressed;
  if(bytes.length!==file.size||crc32(bytes)!==file.crc)throw Error('ZIP entry integrity check failed');controller.signal.throwIfAborted();
  // Flatten selected entries to avoid archive-controlled directories or symlink traversal.
  const nameOut=require('./engine.cjs').fileName(path.posix.basename(safeName(file.name))),dest=path.join(directory,nameOut);await fs.promises.mkdir(directory,{recursive:true});await fs.promises.writeFile(dest,bytes,{flag:'wx',mode:0o600});
  let item;try{item=service.engine.add({url:data.url,name:nameOut,directory,later:true,description:'Selected ZIP file: '+file.name});service.store.update(item.id,{status:'complete',size:bytes.length,downloaded:bytes.length,meta:JSON.stringify({...JSON.parse(item.meta),filePath:dest,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),archiveEntry:file.name})});}catch(e){await fs.promises.unlink(dest).catch(()=>{});if(item)service.store.remove(item.id);throw e;}results.push({id:item.id,name:nameOut,size:bytes.length});
 }return {files:results};
 }finally{clearTimeout(timer);service.smart.controllers.delete(controller);}
 });
}
module.exports={list,extract,crc32,safeName,range};
