const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {configure}=require('../src/windows-bridge.cjs');
test('Windows bridge atomically replaces an existing protected configuration during upgrade',{skip:process.platform!=='win32'},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-bridge-upgrade-')),directory=path.join(root,'Profile مساحة'),file=path.join(directory,'host-config.json');fs.mkdirSync(directory);
 try{
  const base={configFile:file,address:'http://127.0.0.1:17863',extensionId:'abcdefghijklmnopabcdefghijklmnop',executable:process.execPath,arguments:'--background'};
  await configure({...base,token:'old-fixture-token'});const before=fs.readFileSync(file,'utf8');
  await configure({...base,token:'new-fixture-token',address:'http://127.0.0.1:17963'});
  const after=fs.readFileSync(file,'utf8'),value=JSON.parse(after);assert.equal(value.address,'http://127.0.0.1:17963');assert.equal(value.executable,process.execPath);assert.equal(value.extensionId,base.extensionId);assert.ok(value.protectedToken);assert.notEqual(after,before);assert.ok(!after.includes('fixture-token'));assert.deepEqual(fs.readdirSync(directory),['host-config.json']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
