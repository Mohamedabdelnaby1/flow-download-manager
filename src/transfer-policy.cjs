function configuredConnections(settings,host){return Math.max(1,Math.min(32,Number(settings.connections)||1,Number(settings.serverConnections?.[host])||32));}
function connectionLimit(settings,host,hint,now=Date.now()){
 const maximum=configuredConnections(settings,host);
 // Network congestion is temporary. Do not permanently penalize every file on a host.
 const lifetime=hint?.reason==='range'?900000:90000;
 return hint&&Number.isInteger(hint.connections)&&hint.connections>=1&&now-hint.time<lifetime?Math.min(maximum,hint.connections):maximum;
}
module.exports={configuredConnections,connectionLimit};
