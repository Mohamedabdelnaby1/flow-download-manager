const fs=require('node:fs'),crypto=require('node:crypto');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Replace in the same directory. A failed write must retain the last valid session.
async function atomicFile(file,value,{io=fs.promises,delay=wait,attempts=25}={}){
 const temporary=file+'.'+process.pid+'.'+crypto.randomUUID()+'.tmp';
 await io.writeFile(temporary,value,{mode:0o600,flag:'wx'});
 try{
  for(let attempt=0;;attempt++)try{await io.rename(temporary,file);return;}catch(error){
   if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=attempts-1)throw error;
   await delay(Math.min(200,25*(attempt+1)));
  }
 }finally{try{await io.unlink(temporary);}catch{}}
}
module.exports={atomicFile};
