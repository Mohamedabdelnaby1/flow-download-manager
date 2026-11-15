// The library and tray must remain usable when reconnecting an old engine fails.
async function reconnectEngine(service,{report=()=>{}}={}){
 try{await service.engineHost.attach();return true;}catch(error){
  const message=service.describeError?.(error,'engine')?.message||error.message;
  service.engineHost.lastError=message;
  try{service.store.log('error',message);}catch{}
  try{report(error);}catch{}
  return false;
 }
}
module.exports={reconnectEngine};
