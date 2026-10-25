const crypto=require('node:crypto');
function seal(key,value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(String(value)),c.final(),c.getAuthTag()]);}
function open(key,bytes){const b=Buffer.from(bytes),c=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAuthTag(b.subarray(-16));return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString();}
module.exports={seal,open};
