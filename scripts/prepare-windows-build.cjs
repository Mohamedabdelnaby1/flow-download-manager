const fs=require('node:fs'),path=require('node:path');
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 const template=path.join(path.dirname(require.resolve('app-builder-lib/package.json')),'templates/nsis/portable.nsi');let text=fs.readFileSync(template,'utf8');if(text.includes('; Flow Windows compatibility guard'))return;if(!text.includes('Function .onInit\n')&&!text.includes('Function .onInit\r\n'))throw Error('Portable startup template changed; review its Windows compatibility guard');
 const guard=`Function .onInit
  ; Flow Windows compatibility guard
  \${IfNot} \${AtLeastWin10}
    MessageBox MB_OK|MB_ICONSTOP "Flow Download Manager requires Windows 10 or Windows 11 (64-bit). Windows 7, 8 and 8.1 are not supported." /SD IDOK
    SetErrorLevel 1633
    Quit
  \${EndIf}
`;
 fs.writeFileSync(template,text.replace(/Function \.onInit\r?\n/,guard));
};
