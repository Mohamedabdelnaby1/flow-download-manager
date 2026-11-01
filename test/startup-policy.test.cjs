const {test}=require('node:test'),assert=require('node:assert/strict');
const {presentation}=require('../src/startup-failure.cjs'),model=require('../ui/error-model.js');
test('a Windows policy block of Realm is distinguished from database corruption',()=>{
 const error=Error('An Application Control policy has blocked this file. C:\\Program Files\\Flow\\resources\\app.asar.unpacked\\node_modules\\realm\\prebuilds\\node\\realm.node');
 for(const language of ['en','ar']){const result=model.describe(error,language);assert.equal(result.code,'APPLICATION_BLOCKED');assert.equal(result.retryable,false);assert.ok(!result.action.includes('reformat'));const plan=presentation(error,language);assert.equal(plan.blocked,true);assert.equal(plan.options.buttons.length,2);assert.equal(plan.options.defaultId,plan.options.cancelId);assert.ok(!plan.options.buttons.some(v=>/restart|إعادة تشغيل/i.test(v)));assert.ok(!plan.options.message.includes('realm.node'));assert.ok(plan.report.includes('realm.node'));}
 assert.equal(model.describe('Realm file decryption failed').code,'DATABASE');
});
test('Windows application integrity error codes receive the same explanation',()=>{
 for(const text of ['0x800711C7','0x11C7','ERROR_SYSTEM_INTEGRITY_POLICY_VIOLATION'])assert.equal(model.describe(Error(text)).code,'APPLICATION_BLOCKED');
});
test('an ordinary fatal error still offers a restart and redacts its report',()=>{
 const plan=presentation(Error('TypeError: startup failed https://site.test/?token=secret-value'),'en');assert.equal(plan.blocked,false);assert.equal(plan.options.buttons[0],'Restart Flow');assert.ok(!plan.report.includes('secret-value'));
});
