const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const [payloadArg,compilerArg,outputArg]=process.argv.slice(2),source=path.resolve(__dirname,'..'),version=require('../package.json').version;
if(!payloadArg||!compilerArg||!outputArg)throw Error('Provide a complete staged payload, the NSIS compiler and the output EXE path.');
const payload=path.resolve(payloadArg),compiler=path.resolve(compilerArg),output=path.resolve(outputArg),manifestFile=path.join(payload,'payload-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
for(const [file,expected]of Object.entries(manifest.files)){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(payload,file))).digest('hex');if(actual!==expected)throw Error('Payload changed after validation: '+file);}
fs.mkdirSync(path.dirname(output),{recursive:true});const id=crypto.createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex'),checks=output+'.presence.nsh';
fs.writeFileSync(checks,[...Object.keys(manifest.files),'payload-manifest.json'].map(file=>'IfFileExists "$flowCache\\'+file.replace(/\//g,'\\').replace(/\$/g,'$$')+'" 0 portableExtract').join('\r\n'));
const result=spawnSync(compiler,['/V2','/DPROJECT_DIR='+source,'/DVERSION='+version,'/DPAYLOAD_ID='+id.slice(0,20),'/DPAYLOAD_DIR='+payload,'/DOUTPUT_FILE='+output,'/DPRESENCE_CHECKS='+checks,path.join(source,'build/compact-portable.nsi')],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;if(result.status)process.exit(result.status);
fs.writeFileSync(output+'.json',JSON.stringify({version,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),payloadId:id.slice(0,20),cacheRetainedForIndependentEngine:true},null,2));console.log(output);
