// Opt-in only. An ordinary developer build remains possible without credentials.
const base=require('../package.json').build;
if(!/^[a-f0-9]{40}$/i.test(process.env.FLOW_SIGNING_THUMBPRINT||''))throw Error('Import a trusted code-signing certificate before building the signed release.');
module.exports={...base,forceCodeSigning:true,win:{...base.win,signExecutable:true,signExts:['.dll','.node','!aria2c.exe','!yt-dlp.exe','!ffmpeg.exe','!FlowNativeHost.exe'],signtoolOptions:{certificateSha1:process.env.FLOW_SIGNING_THUMBPRINT,signingHashAlgorithms:['sha256'],rfc3161TimeStampServer:'http://timestamp.digicert.com'}}};
