const fs=require('node:fs'),path=require('node:path');
// Renderer input is a task identifier, never an arbitrary local path.
function completedFile(store,id){
 const item=typeof id==='string'&&store.find(id);
 if(!item||item.status!=='complete')throw Error('The download has not finished yet.');
 const file=JSON.parse(item.meta).filePath;
 if(typeof file!=='string'||!path.isAbsolute(file)||!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('The downloaded file was moved or removed. Open its folder to locate it.');
 return file;
}
module.exports={completedFile};
