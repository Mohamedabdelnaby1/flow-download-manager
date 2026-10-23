const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');let checked=0;
for(const folder of ['src','ui','extension','scripts','test'])for(const name of fs.readdirSync(path.join(root,folder))){
 if(!/\.(?:js|cjs)$/.test(name))continue;
 execFileSync(process.execPath,['--check',path.join(root,folder,name)],{stdio:'pipe',windowsHide:true});checked++;
}
const pkg=require('../package.json'),manifest=require('../extension/manifest.json');
if(pkg.version!==manifest.version)throw Error('Application and companion versions differ');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'vendor/yt-dlp.json'),'utf8'));
const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'vendor/yt-dlp.exe'))).digest('hex');
const expected=metadata.sha256||'33121d192d706e62f684a06f80918e3f3a8ba52ac3a65213b6951c39c7d9f555';
if(digest!==expected)throw Error('Bundled extractor checksum mismatch');
for(const file of ['native/FlowNativeHost.exe','native/FlowNativeHost.cs','ui/appearance.js','ui/messages.js'])if(!fs.existsSync(path.join(root,file)))throw Error('Missing required source asset: '+file);
console.log(JSON.stringify({version:pkg.version,syntaxFiles:checked,extractorSHA256:digest,companionVersion:manifest.version},null,2));
