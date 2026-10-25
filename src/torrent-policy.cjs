const PROFILES={balanced:{maxPeers:100,targetKB:512},fast:{maxPeers:200,targetKB:2048},quiet:{maxPeers:40,targetKB:128}};
function preferences(data={},old={}){const p={profile:'balanced',uploadKB:128,seedMinutes:0,maxPeers:100,autoRecover:true,...old,...data};if(!Object.hasOwn(PROFILES,p.profile))throw Error('Choose a torrent connection profile.');for(const [key,min,max]of [['uploadKB',1,1000000],['seedMinutes',0,10080],['maxPeers',1,500]])if(!Number.isInteger(Number(p[key]))||Number(p[key])<min||Number(p[key])>max)throw Error('Invalid torrent preferences');return {profile:p.profile,uploadKB:Number(p.uploadKB),seedMinutes:Number(p.seedMinutes),maxPeers:Number(p.maxPeers),autoRecover:p.autoRecover===true};}
function options(p){return {'bt-max-peers':String(p.maxPeers),'bt-request-peer-speed-limit':PROFILES[p.profile].targetKB+'K','max-upload-limit':p.uploadKB+'K','seed-time':String(p.seedMinutes)};}
function health(record,status,now){
 const bytes=Number(status.completedLength)||0,total=Number(status.totalLength)||0;
 if(record.lastProgressBytes!==bytes){record.lastProgressBytes=bytes;record.lastProgressAt=now;}
 record.lastProgressAt||=now;
 if(record.held)return 'QUEUED';if(status.status==='complete')return 'COMPLETE';if(status.status==='paused')return 'PAUSED';if(status.status==='error')return 'FAILED';if(status.verifiedLength!==undefined||status.verifyIntegrityPending==='true')return 'VERIFYING';
 if(!total&&!status.bittorrent?.info?.name)return 'METADATA';if(total&&bytes>=total)return 'SEEDING';if(Number(status.downloadSpeed)>0)return 'RECEIVING';if(now-record.lastProgressAt>90000)return Number(status.connections)>0?'NO_PROGRESS':'NO_PEERS';return 'CONNECTING';
}
module.exports={PROFILES,preferences,options,health};
