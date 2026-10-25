const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
require('./generate-desktop-actions.cjs');
const script=path.join(__dirname,'../node_modules/electron/install.js');
if(fs.existsSync(script)){
  const result=spawnSync(process.execPath,[script],{stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;process.exitCode=result.status||0;
}
