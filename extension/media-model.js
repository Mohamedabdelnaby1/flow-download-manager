(function(root){
 function sitePage(value){try{const u=new URL(value),host=u.hostname;return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|dailymotion\.com)$/i.test(host)||/(^|\.)instagram\.com$/i.test(host)&&/^\/(reels?|p)\//.test(u.pathname)||/(^|\.)(facebook\.com|fb\.watch)$/i.test(host)&&(/fb\.watch$/i.test(host)||/^\/(?:reels?|videos)\//.test(u.pathname)||/\/videos\/\d+/.test(u.pathname)||/^\/watch\/?$/.test(u.pathname)&&u.searchParams.has('v'));}catch{return false;}}
 function describe(item){try{
  const u=new URL(item.url);if(!/^https?:$/.test(u.protocol))return null;
  if(/(^|[\/_-])(?:failure|no_input|success|open|notification|notify|beep|click|error|silence)\.(?:mp3|wav|ogg)$/i.test(u.pathname))return null;
  const type=String(item.type||'').split(';')[0],manifest=/mpegurl|dash\+xml/i.test(type)||/\.(m3u8|mpd)$/i.test(u.pathname);
  if(!manifest&&(/\.(m4s|cmfv|cmfa|ts)$/i.test(u.pathname)||/(?:^|[\/_.-])(?:seg(?:ment)?|chunk|fragment|init)[-_.\d\/]/i.test(u.pathname)||[...u.searchParams.keys()].some(k=>/^(bytestart|byteend|range|sq|segment|fragment|start_byte|end_byte)$/i.test(k))))return null;
  if(!manifest&&!/^(video|audio)\//i.test(type)&&!/^media$/i.test(type)&&! /\.(mp4|mkv|webm|mp3|m4a|aac|ogg|flac|wav)$/i.test(u.pathname))return null;
  const audio=/^audio\//i.test(type)||/\.(mp3|m4a|aac|ogg|flac|wav)$/i.test(u.pathname),kind=manifest?'stream':audio?'audio':'video';
  const range=/bytes\s+\d+-\d+\/(\d+)/i.exec(item.contentRange||''),bytes=Number(range?.[1]||item.size)||0;
  let ext=(u.pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]||type.split('/')[1]||'').toUpperCase();if(!/^(MP4|WEBM|MKV|MP3|M4A|AAC|OGG|FLAC|WAV)$/.test(ext))ext=manifest?(/mpd$|dash/i.test(u.pathname+type)?'DASH':'HLS'):audio?'Audio':'Video';
  let name=String(item.name||'');try{name||=decodeURIComponent(u.pathname.split('/').pop());}catch{}
  if(!name||name.length>70||/^[\w-]{24,}(?:\.[a-z0-9]{2,5})?$/i.test(name)||/^(videoplayback|playback|media|video|audio)$/i.test(name))name=audio?'Audio file':manifest?'Complete video stream':'Video file';
  const identity=new URL(u);identity.hash='';for(const key of [...identity.searchParams.keys()])if(/^(token|sig|signature|expire|expires|auth|oh|oe|_nc_.+|ccb|stp)$/i.test(key))identity.searchParams.delete(key);identity.searchParams.sort();if(/(^|\.)fbcdn\.net$/i.test(identity.hostname))identity.hostname='fbcdn.net';
  const label=`${name} · ${ext}${bytes?' · '+(bytes/1048576).toFixed(1)+' MB':''}`;
  const suffix=manifest?'mp4':/^(MP4|WEBM|MKV|MP3|M4A|AAC|OGG|FLAC|WAV)$/.test(ext)?ext.toLowerCase():'bin',fileName=manifest?name.replace(/\.(m3u8|mpd)$/i,'')+'.mp4':/\.[a-z0-9]{2,5}$/i.test(name)?name:name+'.'+suffix;
  return {...item,kind,bytes,label,name,fileName,mode:manifest?'media':'file',identity:identity.href};
 }catch{return null;}}
 function select(items,limit=16){const map=new Map();for(const item of items||[]){const clean=describe(item);if(clean){if(map.has(clean.identity))map.delete(clean.identity);map.set(clean.identity,clean);}}return [...map.values()].slice(-limit).reverse();}
 const model={sitePage,describe,select};if(typeof module!=='undefined')module.exports=model;else root.FlowMediaModel=model;
})(globalThis);
