const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
function systemFile(name,env=process.env){const root=env.SystemRoot||env.WINDIR||'C:\\Windows';return path.join(root,'System32',name);}
function run(exe,args,input='',options={}){return new Promise((resolve,reject)=>{let p,settled=false,output='',errors='',timer;const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){error.message='Browser setup: '+path.basename(exe)+' could not finish. '+(error.code?error.code+': ':'')+error.message;reject(error);}else resolve(output);};try{p=(options.spawn||spawn)(exe,args,{windowsHide:true,stdio:[input?'pipe':'ignore','pipe','pipe']});}catch(error){finish(error);return;}timer=setTimeout(()=>{p.kill();const error=Error('The setup component took too long to respond');error.code='ETIMEDOUT';finish(error);},options.timeout||20000);p.stdout.on('data',b=>output=(output+b).slice(-32768));p.stderr.on('data',b=>errors=(errors+b).slice(-4096));p.once('error',finish);p.once('close',code=>{if(code){const error=Error(errors||'Setup component exited with code '+code);error.code='SETUP_COMPONENT_FAILED';finish(error);}else finish();});if(input){p.stdin.on('error',error=>{if(error.code!=='EPIPE')finish(error);});p.stdin.end(input);}});}
const configureScript=`$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Security
$c=ConvertFrom-Json ([Console]::In.ReadToEnd())
$secret=[Text.Encoding]::UTF8.GetBytes([string]$c.token)
$protected=[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($secret,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
$target=[string]$c.configFile
$out=@{address=$c.address;extensionId=$c.extensionId;executable=$c.executable;arguments=$c.arguments;protectedToken=$protected}
$temp=$target+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
# Windows PowerShell binds $null to an empty string for this string parameter.
# NullString preserves a real null backup path for atomic File.Replace.
try{[IO.File]::WriteAllText($temp,($out|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)));if([IO.File]::Exists($target)){[IO.File]::Replace($temp,$target,[System.Management.Automation.Language.NullString]::Value)}else{[IO.File]::Move($temp,$target)}}finally{if([IO.File]::Exists($temp)){[IO.File]::Delete($temp)}}
`;
async function configure(config,options={}){const exe=systemFile('WindowsPowerShell/v1.0/powershell.exe',options.env);return (options.run||run)(exe,['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(configureScript,'utf16le').toString('base64')],JSON.stringify(config));}
async function register(manifest,host,options={}){const exe=systemFile('reg.exe',options.env);for(const browser of ['Google\\Chrome','Microsoft\\Edge','BraveSoftware\\Brave-Browser','Chromium'])await (options.run||run)(exe,['ADD',`HKCU\\Software\\${browser}\\NativeMessagingHosts\\${host}`,'/ve','/t','REG_SZ','/d',manifest,'/f']);}
module.exports={systemFile,run,configure,register};
