// Stable IDs shared by saved toolbar preferences, never user-supplied commands.
const TOOL_IDS=['limits','connection','troubleshoot','remote','torrent','mirrors','links','playlist','zip','move','verify','rescue','duplicates','trash','media','rename','traffic','rules','folders','backup','preferences'];
function pinnedTools(value){
 if(!Array.isArray(value)||value.length>8||new Set(value).size!==value.length||value.some(id=>!TOOL_IDS.includes(id)))throw Error('Choose up to 8 different tools to pin.');
 return [...value];
}
module.exports={TOOL_IDS,pinnedTools};
