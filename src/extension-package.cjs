const fs=require('node:fs'),path=require('node:path');
const {FIREFOX_ID}=require('./browser-targets.cjs');
function firefoxManifest(base){const result=JSON.parse(JSON.stringify(base));delete result.key;
 result.background={scripts:['media-model.js','messages.js','error-model.js','background.js']};
 result.browser_specific_settings={gecko:{id:FIREFOX_ID,strict_min_version:'142.0',data_collection_permissions:{required:['authenticationInfo','browsingActivity','websiteContent']}}};
 // Firefox does not implement this Chromium-only content-script option.
 for(const script of result.content_scripts||[])delete script.match_origin_as_fallback;
 return result;
}
function prepareFirefox(source,destination){fs.mkdirSync(destination,{recursive:true});fs.cpSync(source,destination,{recursive:true});fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(firefoxManifest(JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'))),null,2)+'\n');return destination;}
module.exports={firefoxManifest,prepareFirefox};
