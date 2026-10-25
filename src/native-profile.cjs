const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function acquireProfile(profile){
 fs.mkdirSync(profile,{recursive:true});const file=path.join(profile,'desktop-owner.json'),nonce=crypto.randomUUID();
 for(let attempt=0;attempt<2;attempt++){
  try{const fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,nonce}));fs.closeSync(fd);let released=false;return()=>{if(released)return;released=true;try{if(JSON.parse(fs.readFileSync(file,'utf8')).nonce===nonce)fs.unlinkSync(file);}catch{}};}
  catch(error){if(error.code!=='EEXIST')throw error;let previous;try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('Flow could not verify the library owner. Exit all Flow windows before repairing this installation.');}
   if(!Number.isInteger(previous.pid)||previous.pid<1)throw Error('The library ownership record is invalid. Your data has been kept.');
   let alive=true;try{process.kill(previous.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
   if(alive)throw Error('Another Flow download service is using this library. Exit it from its tray menu before opening this edition.');
   // A dead owner may be replaced; verify the nonce again before removing its lease.
   if(JSON.parse(fs.readFileSync(file,'utf8')).nonce===previous.nonce)fs.unlinkSync(file);
  }
 }
 throw Error('Flow could not safely open the library. Try again after closing its other edition.');
}
function backupBeforeNative(profile){
 const files=['Local State','FlowData/realm-key.protected','FlowData/realm-key.local','FlowData/flow.realm'].filter(name=>fs.existsSync(path.join(profile,name)));
 if(!files.includes('FlowData/flow.realm'))return null;
 const base=path.join(profile,'MigrationBackups'),marker=path.join(base,'native-v1.json');if(fs.existsSync(marker))return JSON.parse(fs.readFileSync(marker,'utf8')).directory;
 fs.mkdirSync(base,{recursive:true,mode:0o700});const directory=path.join(base,'before-native-'+Date.now());fs.mkdirSync(directory,{mode:0o700});const manifest=[];
 for(const name of files){const source=path.join(profile,name),target=path.join(directory,name),bytes=fs.readFileSync(source);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,bytes,{mode:0o600,flag:'wx'});const sha256=crypto.createHash('sha256').update(bytes).digest('hex');if(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==sha256)throw Error('The library backup could not be verified. The previous edition has not been changed.');manifest.push({name,bytes:bytes.length,sha256});}
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),files:manifest},null,2),{mode:0o600,flag:'wx'});
 fs.writeFileSync(marker,JSON.stringify({directory}),{mode:0o600,flag:'wx'});return directory;
}
module.exports={acquireProfile,backupBeforeNative};
