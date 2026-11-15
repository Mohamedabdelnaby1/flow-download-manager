// Prepare the official directory distribution once, avoiding self-extraction at launch.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function prepare(project){
 const meta=JSON.parse(fs.readFileSync(path.join(project,'vendor/yt-dlp-unpacked.json'),'utf8'));
 if(!/^[\d.]+$/.test(meta.version)||meta.url!=='https://github.com/yt-dlp/yt-dlp/releases/download/'+meta.version+'/yt-dlp_win.zip'||!/^[a-f0-9]{64}$/.test(meta.archiveSHA256)||!Object.keys(meta.files||{}).length||!/^[a-f0-9]{64}$/.test(meta.files['yt-dlp.exe']||'')||!Object.values(meta.files).every(hash=>/^[a-f0-9]{64}$/.test(hash)))throw Error('Invalid official extractor distribution metadata');
 const target=path.join(project,'vendor/yt-dlp-unpacked-'+meta.version),verify=root=>Object.entries(meta.files).every(([name,hash])=>name&&!path.isAbsolute(name)&&!name.split(/[\\/]/).some(s=>s==='..'||!s)&&!name.includes(':')&&fs.existsSync(path.join(root,name))&&digest(path.join(root,name))===hash);
 if(fs.existsSync(target)){if(verify(target))return target;throw Error('Generated extractor directory failed verification. Remove that generated build directory before retrying.');}
 const cache=path.join(os.tmpdir(),'Flow-Verified-Build-Tools');fs.mkdirSync(cache,{recursive:true});const archive=path.join(cache,'yt-dlp-'+meta.version+'.zip');
 if(!fs.existsSync(archive)){const response=await fetch(meta.url,{headers:{accept:'application/octet-stream'},credentials:'omit',signal:AbortSignal.timeout(300000)});if(!response.ok)throw Error('Official extractor distribution unavailable: '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>64*1024*1024||crypto.createHash('sha256').update(bytes).digest('hex')!==meta.archiveSHA256)throw Error('Official extractor archive integrity failed');fs.writeFileSync(archive,bytes,{flag:'wx'});}
 if(digest(archive)!==meta.archiveSHA256)throw Error('Cached extractor archive integrity failed');
 const temporary=fs.mkdtempSync(path.join(cache,'unpacked-'));
 // PowerShell 7's module search path is incompatible with Windows PowerShell 5.
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toLowerCase()!=='psmodulepath'));
 env.FLOW_VIDEO_ARCHIVE=archive;env.FLOW_VIDEO_DIRECTORY=temporary;
 execFileSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop';Import-Module Microsoft.PowerShell.Archive -ErrorAction Stop;Expand-Archive -LiteralPath $env:FLOW_VIDEO_ARCHIVE -DestinationPath $env:FLOW_VIDEO_DIRECTORY -Force"],{windowsHide:true,stdio:'pipe',env});
 if(!verify(temporary)){const mismatches=Object.entries(meta.files).filter(([name,hash])=>!fs.existsSync(path.join(temporary,name))||digest(path.join(temporary,name))!==hash).map(([name])=>name);throw Error('Extractor distribution files failed verification: '+mismatches.join(', '));}fs.cpSync(temporary,target,{recursive:true});if(!verify(target))throw Error('Copied extractor distribution failed verification');return target;
}
module.exports=async context=>{if(context.electronPlatformName==='win32')await prepare(path.resolve(__dirname,'..'));};
module.exports.prepare=prepare;
