const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
const events=new Set(['complete','error','queue']);
function soundPath(file,event='complete'){
 if(!events.has(event))throw Error('Unknown sound event');
 const target=file||path.join(__dirname,'../ui/sounds',event+'.wav').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
 if(!target.toLowerCase().endsWith('.wav')||!fs.existsSync(target)||!fs.statSync(target).isFile())throw Error('The WAV file is missing. Choose another file or restore the built-in sound.');
 return path.resolve(target);
}
function playSound(file,event='complete',execute=execFile){
 const target=soundPath(file,event),encodedPath=Buffer.from(target,'utf8').toString('base64');
 const script="$ErrorActionPreference='Stop';$soundFile=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+encodedPath+"'));$player=New-Object System.Media.SoundPlayer;$player.SoundLocation=$soundFile;try{$player.Load();$player.PlaySync()}finally{$player.Dispose()}";
 return new Promise((resolve,reject)=>execute('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:10000},error=>error?reject(Error('Could not play the sound. Check Windows audio output or choose another WAV file.')):resolve(true)));
}
module.exports={soundPath,playSound};
