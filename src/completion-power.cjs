const {execFile}=require('node:child_process');
class CompletionPower{
 constructor(service,{execute=execFile,now=Date.now,delay=60000,onPrompt=()=>{}}={}){Object.assign(this,{service,execute,now,delay,onPrompt});this.pending=null;}
 snapshot(){return this.pending?{queueId:this.pending.queueId,queueName:this.pending.queueName,dueAt:this.pending.dueAt}:null;}
 busy(){return this.service.peers?.records.some(d=>['active','waiting'].includes(d.state))||this.service.engine.active.size>0||this.service.engine.maintenance.size>0||!!this.service.power?.workshop.active||this.service.store.queues().some(q=>q.running&&this.service.store.list().some(d=>d.queueId===q.id&&d.status!=='complete'));}
 eligible(queueId){const items=this.service.store.list().filter(d=>d.queueId===queueId);return JSON.parse(this.service.store.queues().find(q=>q.id===queueId)?.schedule||'{}').completion==='shutdown'&&items.length>0&&items.every(d=>d.status==='complete')&&!this.busy();}
 async request(queue){if(this.pending||!this.eligible(queue.id))return false;const schedule=JSON.parse(this.service.store.queues().find(q=>q.id===queue.id)?.schedule||'{}');if(schedule.completion!=='shutdown')return false;
  this.pending={queueId:queue.id,queueName:queue.name,dueAt:this.now()+this.delay};this.timer=setInterval(()=>this.tick(),250);this.timer.unref();try{await this.onPrompt();}catch{this.cancel();return false;}return true;
 }
 tick(){if(!this.pending)return;if(!this.eligible(this.pending.queueId)){this.cancel();return;}if(this.now()<this.pending.dueAt)return;this.cancel();const platform=process.platform;const exe=platform==='win32'?'shutdown.exe':'systemctl',args=platform==='win32'?['/s','/t','0']:['poweroff'];
  // Do not force-close unsaved applications. The operating system may require permission.
  this.execute(exe,args,{windowsHide:true,timeout:10000},error=>{if(error)this.service.store.log('power','Could not shut down the computer: '+error.message);});
 }
 cancel(){clearInterval(this.timer);this.timer=null;this.pending=null;return true;}
 close(){this.cancel();}
}
module.exports={CompletionPower};
