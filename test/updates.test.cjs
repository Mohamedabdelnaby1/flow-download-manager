const test=require('node:test'),assert=require('node:assert/strict');
const {UpdateChecker,newerVersion,releaseInfo:rawReleaseInfo,RELEASE_API,REPOSITORY_URL}=require('../src/updates.cjs');
const releaseInfo=data=>rawReleaseInfo(data,'win32');
function release(version='2.6.0',extra={}){const tag='v'+version;return {tag_name:tag,draft:false,prerelease:false,name:'Flow '+version,body:'## Improvements\nNew features and fixes.',html_url:REPOSITORY_URL+'/releases/tag/'+tag,assets:[{name:`Flow-${version}-Setup.exe`,state:'uploaded',size:123,browser_download_url:REPOSITORY_URL+`/releases/download/${tag}/Flow-${version}-Setup.exe`}],...extra};}
function fixture(options={}){const data=new Map(),notifications=[],opened=[],store=options.store||{get:(k,f)=>data.has(k)?structuredClone(data.get(k)):f,set:(k,v)=>data.set(k,structuredClone(v))};const checker=new UpdateChecker({platform:'win32',version:'2.5.3',store,fetch:async()=>Response.json(release()),openExternal:async url=>opened.push(url),onAvailable:async()=>notifications.push(true),...options});return {checker,store,notifications,opened};}

test('update versions use numeric stable semantic versions',()=>{
 assert.equal(newerVersion('v2.10.0','2.9.9'),true);assert.equal(newerVersion('2.5.3','2.5.3'),false);assert.equal(newerVersion('2.4.99','2.5.3'),false);assert.equal(newerVersion('3.0.0','2.99.99'),true);
 for(const invalid of ['2.6','v2.6.0-rc.1','2.06.0','2.6.0;calc','99999999999999999.0.0','main'])assert.equal(newerVersion(invalid,'2.5.3'),false);
});
test('new ready GitHub release requests one popup and exposes verified page',async()=>{
 const f=fixture();const state=await f.checker.check();assert.equal(state.status,'available');assert.equal(state.release.version,'2.6.0');assert.equal(f.notifications.length,1);
 await f.checker.check();assert.equal(f.notifications.length,1);await f.checker.openRelease();assert.deepEqual(f.opened,[REPOSITORY_URL+'/releases/tag/v2.6.0']);f.checker.stop();
});
test('same and older releases do not request a popup or permit a download action',async()=>{
 for(const version of ['2.5.3','2.5.2']){const f=fixture({fetch:async()=>Response.json(release(version))});assert.equal((await f.checker.check()).status,'current');assert.equal(f.notifications.length,0);await assert.rejects(()=>f.checker.openRelease(),/newer release/);f.checker.stop();}
});
test('drafts, prereleases and nonversion tags never become update offers',async()=>{
 for(const patch of [{draft:true},{prerelease:true},{tag_name:'main'},{tag_name:'v2.6.0-rc.1'}]){const f=fixture({fetch:async()=>Response.json(release('2.6.0',patch))});assert.equal((await f.checker.check()).error,'invalid-release');assert.equal(f.notifications.length,0);f.checker.stop();}
});
test('source-only releases and unfinished executable uploads are not offered',async()=>{
 for(const assets of [[],[{...release().assets[0],state:'starter'}],[{...release().assets[0],size:0}],[{name:'Source.zip',state:'uploaded',size:12}]]){const f=fixture({fetch:async()=>Response.json(release('2.6.0',{assets}))});assert.equal((await f.checker.check()).error,'not-ready');assert.equal(f.notifications.length,0);f.checker.stop();}
});
test('portable-only ready releases are supported',()=>{
 const data=release();data.assets[0].name='Flow-2.6.0-Portable.exe';data.assets[0].browser_download_url=REPOSITORY_URL+'/releases/download/v2.6.0/Flow-2.6.0-Portable.exe';const info=releaseInfo(data);assert.equal(info.portable,true);assert.equal(info.setup,false);
});
test('foreign pages, credentials and altered release URLs are rejected',async()=>{
 for(const html_url of ['https://evil.test/releases/tag/v2.6.0',REPOSITORY_URL+'/releases/tag/v2.6.0?next=evil','file:///C:/test.exe','https://github.com@evil.test/release']){const f=fixture({fetch:async()=>Response.json(release('2.6.0',{html_url}))});assert.equal((await f.checker.check()).error,'invalid-release');assert.equal(f.notifications.length,0);f.checker.stop();}
});
test('untrusted asset URLs cannot make a release ready',()=>{
 const data=release();data.assets[0].browser_download_url='https://evil.test/Flow-2.6.0-Setup.exe';assert.throws(()=>releaseInfo(data),/not-ready/);
});
test('manual checks do not create automatic popups, and disabled checks remain manually accessible',async()=>{
 let requests=0;const f=fixture({fetch:async()=>{requests++;return Response.json(release());}});f.checker.setEnabled(false);await f.checker.check();assert.equal(requests,0);assert.equal((await f.checker.check({manual:true})).status,'available');assert.equal(requests,1);assert.equal(f.notifications.length,0);assert.throws(()=>f.checker.setEnabled('false'));f.checker.stop();
});
test('skipping survives restart and allows a subsequent newer version',async()=>{
 const f=fixture();await f.checker.check();f.checker.skip();f.checker.stop();
 const g=fixture({store:f.store});await g.checker.check();assert.equal(g.notifications.length,0);g.checker.fetch=async()=>Response.json(release('2.7.0'));await g.checker.check();assert.equal(g.notifications.length,1);g.checker.stop();
});
test('remind tomorrow is persisted and suppresses automatic popups for 24 hours',async()=>{
 let now=1700000000000;const f=fixture({now:()=>now});await f.checker.check();f.checker.snooze();f.checker.stop();
 const g=fixture({store:f.store,now:()=>now});await g.checker.check();assert.equal(g.notifications.length,0);now+=24*60*60*1000+1;await g.checker.check();assert.equal(g.notifications.length,1);g.checker.stop();
});
test('parallel checks share one request and one notification',async()=>{
 let resolve,requests=0;const f=fixture({fetch:()=>{requests++;return new Promise(r=>resolve=r);}});const a=f.checker.check(),b=f.checker.check({manual:true});assert.equal(a,b);resolve(Response.json(release()));await Promise.all([a,b]);assert.equal(requests,1);assert.equal(f.notifications.length,1);f.checker.stop();
});
test('conditional GitHub requests reuse a validated cached release',async()=>{
 let count=0;const f=fixture({fetch:async(url,options)=>{assert.equal(url,RELEASE_API);assert.equal(options.redirect,'error');assert.ok(!options.headers.Authorization);count++;if(count===1)return Response.json(release(),{headers:{etag:'"flow-test"'}});assert.equal(options.headers['If-None-Match'],'"flow-test"');return new Response(null,{status:304});}});await f.checker.check();assert.equal((await f.checker.check()).status,'available');assert.equal(f.notifications.length,1);f.checker.stop();
});
test('offline and API failures stay quiet and report specific recoverable states',async()=>{
 for(const [status,error]of [[403,'rate-limit'],[429,'rate-limit'],[404,'no-release'],[503,'offline']]){const f=fixture({fetch:async()=>new Response('',{status})});const result=await f.checker.check();assert.equal(result.status,'error');assert.equal(result.error,error);assert.equal(f.notifications.length,0);f.checker.stop();}
 const f=fixture({fetch:async()=>{throw Error('Network unavailable');}});assert.equal((await f.checker.check()).error,'offline');f.checker.stop();
});
test('malformed and oversized responses are not processed as updates',async()=>{
 for(const response of [new Response('not json'),new Response('{}',{headers:{'content-length':String(600*1024)}}),new Response('x'.repeat(513*1024))]){const f=fixture({fetch:async()=>response});assert.equal((await f.checker.check()).error,'invalid-release');assert.equal(f.notifications.length,0);f.checker.stop();}
});
test('shutdown aborts a pending check without writing to a closed store',async()=>{
 let abort=false;const f=fixture({fetch:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{abort=true;reject(Error('aborted'));}))});const pending=f.checker.check();f.checker.stop();await pending;assert.equal(abort,true);assert.equal(f.notifications.length,0);
});
