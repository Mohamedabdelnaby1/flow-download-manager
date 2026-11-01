const path=require('node:path');
const {validateURL}=require('./network.cjs');
const TOOLS=new Set(['settings','add','download-info','details','scheduler','batch','grabber','integration','logs','complete','about','updates','smart','power','library','tools','shutdown']);
class ToolWindows{
  constructor({BrowserWindow,service,origin,main,screen,guardWindow}){Object.assign(this,{BrowserWindow,service,origin,main,screen,guardWindow});this.windows=new Map();this.opening=new Map();this.closing=false;}
  owns(contents){return [...this.windows.values()].some(w=>!w.isDestroyed()&&w.webContents===contents);}
  present(window,attention=false){
    if(window.isMinimized())window.restore();
    // Briefly raise download windows above the browser, then return to normal stacking.
    if(attention)window.setAlwaysOnTop(true,'floating');
    window.show();window.moveTop();window.focus();
    if(attention){window.flashFrame(true);clearTimeout(window.flowAttentionTimer);window.flowAttentionTimer=setTimeout(()=>{if(!window.isDestroyed()){window.setAlwaysOnTop(false);window.flashFrame(false);}},1800);window.flowAttentionTimer.unref();}
  }
  async open(kind,data={}){
    if(!TOOLS.has(kind))throw Error('نوع نافذة غير صالح');
    if(kind==='details'&&this.service.store.find(data.id)?.status==='complete'&&this.service.store.settings.completionDialog)kind='complete';
    if(kind==='complete'){const progress=this.windows.get('details:'+data.id);if(progress&&!progress.isDestroyed())progress.destroy();}
    if(['details','download-info','complete'].includes(kind)&&!this.service.store.find(data.id))throw Error('التحميل غير موجود');
    if(data.url)validateURL(data.url);
    const key=kind+(['details','download-info','complete'].includes(kind)?':'+data.id:'');
    if(this.opening.has(key)){await this.opening.get(key);const existing=this.windows.get(key);if(existing&&!existing.isDestroyed()&&!existing.flowClosing){this.present(existing,true);return {key,id:existing.id,reused:true};}}
    let window=this.windows.get(key);
    if(window&&!window.isDestroyed()&&!window.flowClosing){this.present(window,['download-info','details','complete','updates'].includes(kind));if(['library','power','tools','smart'].includes(kind)&&data.tab)window.webContents.send('flow:tool-context',{tab:data.tab,id:data.id||'',url:data.url||''});return {key,id:window.id,reused:true};}
    const area=(['download-info','details','complete','updates'].includes(kind)?this.screen.getDisplayNearestPoint(this.screen.getCursorScreenPoint()):this.main&&!this.main.isDestroyed()?this.screen.getDisplayMatching(this.main.getBounds()):this.screen.getPrimaryDisplay()).workArea;
    const wide=['settings','scheduler','integration','grabber','logs','smart','power','library','tools','shutdown'].includes(kind);
    window=new this.BrowserWindow({width:Math.min(kind==='complete'?490:kind==='details'?550:wide?850:600,area.width),height:Math.min(kind==='complete'?360:kind==='details'?530:wide?740:560,area.height),minWidth:360,minHeight:260,title:'Flow',autoHideMenuBar:true,backgroundColor:'#ffffff',minimizable:true,maximizable:!['complete','details'].includes(kind),resizable:true,show:false,icon:path.join(__dirname,'../ui/logo.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    window.flowDownloadId=data.id||null;window.flowKind=kind;window.on('minimize',()=>{if(this.service.store.settings.minimizeToTray&&this.service.desktop?.runtimeStatus?.().trayResident)window.hide();});this.windows.set(key,window);window.setMenu(null);window.setPosition(Math.round(area.x+(area.width-window.getBounds().width)/2),Math.round(area.y+(area.height-window.getBounds().height)/2));
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==this.origin)e.preventDefault();});
    window.webContents.session.setPermissionRequestHandler((_w,_p,done)=>done(false));
    window.on('close',()=>{window.flowClosing=true;});window.on('closed',()=>{clearTimeout(window.flowAttentionTimer);if(this.windows.get(key)===window)this.windows.delete(key);if(kind==='shutdown')this.service.desktop?.cancelShutdown?.();if(kind==='download-info'&&!this.closing&&this.service.store.find(data.id)?.status==='pending')this.service.action('remove',{id:data.id}).catch(()=>{});});
    const url=new URL(this.origin);url.searchParams.set('window',kind);for(const k of ['id','url','tab'])if(data[k])url.searchParams.set(k,String(data[k]));
    this.guardWindow?.(window,url.href,kind);
    const loading=window.loadURL(url.href);this.opening.set(key,loading);
    try{await loading;if(window.isDestroyed())return {key,closed:true};window.webContents.setZoomFactor(Math.max(.8,Math.min(1.5,this.service.store.settings.textScale/100)));this.present(window,['download-info','details','complete','updates'].includes(kind));}catch(error){if(!window.isDestroyed())window.destroy();throw error;}finally{this.opening.delete(key);}
    return {key,id:window.id,reused:false};
  }
  scale(value){for(const w of this.windows.values())if(!w.isDestroyed())w.webContents.setZoomFactor(value);}
  closeAll(){this.closing=true;for(const w of this.windows.values())if(!w.isDestroyed())w.destroy();this.windows.clear();}
}
module.exports={ToolWindows,TOOLS};
