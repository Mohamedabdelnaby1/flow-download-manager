// Keep startup diagnostics independent of Realm and every native dependency.
const model=require('../ui/error-model.js');
function presentation(error,language='en'){
 const packet=model.encode(error,'application'),info=model.describe(packet,language),ar=language==='ar',blocked=info.code==='APPLICATION_BLOCKED';
 return {packet,blocked,report:model.report(packet,language),options:{type:'error',title:'Flow Download Manager',message:info.message,detail:blocked?info.action:ar?'أعد تشغيل Flow للمتابعة بأمان. قد تتوقف التحميلات لحين فتحه مجددًا.':'Restart Flow to continue safely. Downloads may pause until it reopens.',buttons:blocked?(ar?['نسخ تقرير المشكلة','إغلاق']:['Copy problem report','Close']):(ar?['إعادة تشغيل Flow','نسخ التقرير وإغلاق','إغلاق']:['Restart Flow','Copy report and close','Close']),defaultId:blocked?1:0,cancelId:blocked?1:2}};
}
module.exports={presentation};
