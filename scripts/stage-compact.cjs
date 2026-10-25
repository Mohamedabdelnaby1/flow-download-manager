const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function stage(config){
 const source=path.resolve(__dirname,'..'),target=path.resolve(config.target),dependencies=path.resolve(config.dependencies),lock=require('../package-lock.json');
 if(fs.existsSync(target))throw Error('Use a new staging directory; an existing runtime will never be overwritten.');
 if(hash(config.node)!=='33b1bc1a8aca11fd5a4f2699e51019c63c0af30cf437701d07af69be7706771b')throw Error('The complete official Node 22.14.0 x64 executable is required.');
 if(hash(config.nodeLicense)!=='1474fea5eff88dc92763acca3ca1f54b51fa153be1529eae74ace35957aea9ce')throw Error('Node license verification failed.');
 const manifest=require('../vendor/yt-dlp-unpacked.json');for(const [file,digest]of Object.entries(manifest.files))if(hash(path.join(config.extractor,file))!==digest)throw Error('The complete extractor distribution is required: '+file);
 const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});},app=path.join(target,'app');
 for(const name of ['src','ui','extension','vendor'])copy(path.join(source,name),path.join(app,name));
 for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.md')||['LICENSE','package.json','package-lock.json'].includes(n)))copy(path.join(source,name),path.join(app,name));
 for(const [name,entry]of Object.entries(lock.packages)){if(!name.startsWith('node_modules/')||entry.dev)continue;const from=path.join(dependencies,name.slice('node_modules/'.length));if(!fs.existsSync(from)){if(entry.optional)continue;throw Error('Missing production dependency: '+name);}copy(from,path.join(app,name));}
 copy(config.extractor,path.join(app,'vendor/yt-dlp-unpacked'));copy(path.join(source,'native/FlowNativeHost.exe'),path.join(app,'native/FlowNativeHost.exe'));
 copy(config.shell,target);copy(config.node,path.join(target,'runtime/node.exe'));copy(config.nodeLicense,path.join(target,'runtime/LICENSE.txt'));
 copy(path.join(config.sdk,'LICENSE.txt'),path.join(target,'licenses/WebView2-LICENSE.txt'));copy(path.join(config.sdk,'NOTICE.txt'),path.join(target,'licenses/WebView2-NOTICE.txt'));
 // Windows uses the unchanged node/realm.node. Mobile development archives are not Windows runtime features.
 for(const name of ['app/vendor/yt-dlp.exe','app/node_modules/realm/prebuilds/apple','app/node_modules/realm/prebuilds/android']){const file=path.resolve(target,name);if(!file.startsWith(target+path.sep))throw Error('Invalid staging path');fs.rmSync(file,{recursive:true,force:true});}
 execFileSync(path.join(target,'runtime/node.exe'),['-e','const R=require("./app/node_modules/realm");R.shutdown();'],{cwd:target,windowsHide:true});
 const files={};function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else files[path.relative(target,p).split(path.sep).join('/')]=hash(p);}}scan(target);
 fs.writeFileSync(path.join(target,'payload-manifest.json'),JSON.stringify({version:require('../package.json').version,nodeVersion:'22.14.0',nodeSHA256:hash(config.node),files},null,2));return target;
}
if(require.main===module){try{console.log(stage(JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''))));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={stage};
