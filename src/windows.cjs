const path=require('node:path');
const {validateURL}=require('./network.cjs');
const TOOLS=new Set(['settings','add','download-info','details','scheduler','batch','grabber','integration','logs','complete','about','updates','smart','power','library','tools','shutdown']);
class ToolWindows{
  constructor({BrowserWindow,service,origin,main,screen,guardWindow}){Object.assign(this,{BrowserWindow,service,origin,main,screen,guardWindow});this.windows=new Map();this.closing=false;}
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
    if(['details','download-info','complete'].includes(kind)&&!this.service.store.find(data.id))throw Error('التحميل غير موجود');
    if(data.url)validateURL(data.url);
    const key=kind+(['details','download-info','complete'].includes(kind)?':'+data.id:'');
    let window=this.windows.get(key);
    if(window&&!window.isDestroyed()){this.present(window,['download-info','details','complete','updates'].includes(kind));if(['library','power','tools'].includes(kind)&&data.tab)window.webContents.send('flow:tool-context',{tab:data.tab,id:data.id||'',url:data.url||''});return {key,id:window.id,reused:true};}
    const area=(['download-info','details','complete','updates'].includes(kind)?this.screen.getDisplayNearestPoint(this.screen.getCursorScreenPoint()):this.main&&!this.main.isDestroyed()?this.screen.getDisplayMatching(this.main.getBounds()):this.screen.getPrimaryDisplay()).workArea;
    const wide=['settings','scheduler','integration','grabber','logs','smart','power','library','tools','shutdown'].includes(kind);
    window=new this.BrowserWindow({width:Math.min(kind==='complete'?490:kind==='details'?550:wide?850:660,area.width),height:Math.min(kind==='complete'?370:kind==='details'?460:wide?740:620,area.height),minWidth:360,minHeight:260,title:'Flow',autoHideMenuBar:true,backgroundColor:'#ffffff',minimizable:true,maximizable:!['complete','details'].includes(kind),resizable:true,show:false,icon:path.join(__dirname,'../ui/logo.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    window.flowDownloadId=data.id||null;window.flowKind=kind;window.on('minimize',()=>{if(this.service.store.settings.minimizeToTray&&this.service.desktop?.runtimeStatus?.().trayResident)window.hide();});this.windows.set(key,window);window.setMenu(null);window.setPosition(Math.round(area.x+(area.width-window.getBounds().width)/2),Math.round(area.y+(area.height-window.getBounds().height)/2));
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==this.origin)e.preventDefault();});
    window.webContents.session.setPermissionRequestHandler((_w,_p,done)=>done(false));
    window.on('closed',()=>{clearTimeout(window.flowAttentionTimer);this.windows.delete(key);if(kind==='shutdown')this.service.desktop?.cancelShutdown?.();if(kind==='download-info'&&!this.closing&&this.service.store.find(data.id)?.status==='pending')this.service.action('remove',{id:data.id}).catch(()=>{});});
    const url=new URL(this.origin);url.searchParams.set('window',kind);for(const k of ['id','url','tab'])if(data[k])url.searchParams.set(k,String(data[k]));
    this.guardWindow?.(window,url.href,kind);
    try{await window.loadURL(url.href);window.webContents.setZoomFactor(Math.max(.8,Math.min(1.5,this.service.store.settings.textScale/100)));this.present(window,['download-info','details','complete','updates'].includes(kind));}catch(error){window.destroy();throw error;}
    return {key,id:window.id,reused:false};
  }
  scale(value){for(const w of this.windows.values())if(!w.isDestroyed())w.webContents.setZoomFactor(value);}
  closeAll(){this.closing=true;for(const w of this.windows.values())if(!w.isDestroyed())w.destroy();this.windows.clear();}
}
module.exports={ToolWindows,TOOLS};

