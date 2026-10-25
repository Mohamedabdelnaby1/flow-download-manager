// Experimental WebView2 package. Keep the stable Electron build available.
const original=require('../package.json').build;
module.exports={
 ...original,
 compression:'maximum',
 directories:{...original.directories,output:'release-compact'},
 afterPack:undefined,
 win:{...original.win,target:['nsis']},
 nsis:{...original.nsis,differentialPackage:false,artifactName:'Flow-${version}-Compact-Preview-Setup.${ext}',include:'build/compact-installer.nsh'}
};
