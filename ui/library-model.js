(function(root){
 function tokens(text){return String(text||'').match(/(?:[^\s"]+|"[^"]*")+/g)||[];}
 function bytes(value){const m=/^(\d+(?:\.\d+)?)(b|kb|mb|gb|tb)?$/i.exec(value);return m?+m[1]*1024**(['b','kb','mb','gb','tb'].indexOf((m[2]||'b').toLowerCase())):NaN;}
 function matches(item,query){
  let host='';try{host=new URL(item.url).hostname.toLowerCase();}catch{}
  let meta={};try{meta=JSON.parse(item.meta||'{}');}catch{}
  for(const token of tokens(query)){const split=token.indexOf(':'),key=split>0?token.slice(0,split).toLowerCase():'',value=(split>0?token.slice(split+1):token).replaceAll('"','').toLowerCase();
   if(key==='host'){if(host!==value&&!host.endsWith('.'+value.replace(/^\*\./,'')))return false;}
   else if(key==='ext'){if(!value.split(',').includes(item.name.split('.').pop().toLowerCase()))return false;}
   else if(key==='status'){if(!value.split(',').includes(item.status))return false;}
   else if(key==='tag'){if(!(meta.tags||[]).some(t=>t.toLowerCase()===value))return false;}
   else if(key==='min'||key==='max'){const n=bytes(value);if(!Number.isFinite(n)||(key==='min'?item.size<n:item.size>n))return false;}
   else if(key==='queue'){if(item.queueId.toLowerCase()!==value)return false;}
   else if(!`${item.name} ${item.url} ${item.description} ${(meta.tags||[]).join(' ')}`.toLowerCase().includes((key?token:value).replaceAll('"','').toLowerCase()))return false;
  }return true;
 }
 const api={matches,bytes};if(typeof module!=='undefined')module.exports=api;else root.FlowLibraryModel=api;
})(typeof globalThis==='undefined'?this:globalThis);
