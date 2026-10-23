// Isolated service process used only by the native-host autostart test.
const fs=require('node:fs'),path=require('node:path');
const {Service}=require('../src/service.cjs'),{createServer}=require('../src/server.cjs');
const root=process.argv[2],port=Number(process.argv[3]);
fs.writeFileSync(path.join(root,'fixture.pid'),String(process.pid));
const service=new Service(path.join(root,'data'));
createServer(service,port).catch(()=>process.exit(1));
const timer=setTimeout(()=>process.exit(0),30000);timer.unref();
