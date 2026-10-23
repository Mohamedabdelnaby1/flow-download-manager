const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const {Service}=require('../src/service.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
after(()=>require('realm').shutdown());
test('FTP PASV downloads and resumes at the local byte offset',async()=>{
  const bytes=Buffer.alloc(1024*1024);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
  const sockets=new Set(),passiveServers=new Set();let resumeSeen=0;
  const control=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));let input='',dataSocket,offset=0;
    socket.write('220 Test FTP\r\n');socket.on('data',async b=>{
      input+=b.toString();while(input.includes('\r\n')){
        const index=input.indexOf('\r\n'),line=input.slice(0,index);input=input.slice(index+2);const [command,...args]=line.split(' ');
        switch(command){
          case'USER':socket.write('331 Password\r\n');break;
          case'PASS':socket.write('230 Welcome\r\n');break;
          case'FEAT':socket.write('211-Features\r\n UTF8\r\n SIZE\r\n REST STREAM\r\n EPSV\r\n211 End\r\n');break;
          case'TYPE':case'STRU':case'OPTS':case'MODE':socket.write('200 OK\r\n');break;
          case'PWD':socket.write('257 "/"\r\n');break;
          case'SIZE':socket.write(`213 ${bytes.length}\r\n`);break;
          case'EPSV':{
            const passive=net.createServer(s=>{dataSocket=s;sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s));});passiveServers.add(passive);
            await new Promise(r=>passive.listen(0,'127.0.0.1',r));socket.write(`229 Entering Extended Passive Mode (|||${passive.address().port}|)\r\n`);break;
          }
          case'REST':offset=Number(args[0]);resumeSeen=offset;socket.write('350 Restart set\r\n');break;
          case'RETR':{
            socket.write('150 Opening data\r\n');let current=offset;offset=0;
            const timer=setInterval(()=>{if(!dataSocket||dataSocket.destroyed){clearInterval(timer);return;}if(current>=bytes.length){clearInterval(timer);dataSocket.end();socket.write('226 Complete\r\n');return;}const end=Math.min(bytes.length,current+16384);dataSocket.write(bytes.subarray(current,end));current=end;},16);
            break;
          }
          case'QUIT':socket.end('221 Bye\r\n');break;
          default:socket.write('502 Unsupported\r\n');
        }
      }
    });socket.on('error',()=>{});
  });
  await new Promise(r=>control.listen(0,'127.0.0.1',r));const root=path.join(require('node:os').tmpdir(),'flow-tests/ftp-'+Date.now()),s=new Service(root);
  try{
    const d=await s.action('add',{url:`ftp://127.0.0.1:${control.address().port}/fixture.bin`});let start=Date.now();
    while((s.store.find(d.id).downloaded<100000)&&Date.now()-start<10000){if(s.store.find(d.id).status==='error')throw Error(s.store.find(d.id).error);await wait(20);}
    await s.action('pause',{id:d.id});const at=s.store.find(d.id).downloaded;assert.ok(at>0&&at<bytes.length);await s.action('start',{id:d.id});start=Date.now();
    while(s.store.find(d.id).status!=='complete'&&Date.now()-start<10000){if(s.store.find(d.id).status==='error')throw Error(s.store.find(d.id).error);await wait(20);}
    const done=s.store.find(d.id);assert.equal(done.status,'complete');assert.ok(resumeSeen>0);assert.deepEqual(fs.readFileSync(JSON.parse(done.meta).filePath),bytes);
  }finally{await s.close();for(const sock of sockets)sock.destroy();for(const server of passiveServers)await new Promise(r=>server.close(r));await new Promise(r=>control.close(r));}
});
