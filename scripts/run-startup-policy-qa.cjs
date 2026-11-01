const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'flow-policy-qa-')),report=path.join(root,'report.json');
const child=spawn(require('electron'),[path.join(__dirname,'startup-policy-qa.cjs'),report,'--background'],{windowsHide:true,stdio:'ignore'}),timer=setTimeout(()=>child.kill(),20000);
child.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{clearTimeout(timer);const result=fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')):{errors:['Missing startup failure report']};console.log(JSON.stringify(result));if(code||result.errors.length)process.exitCode=1;});
