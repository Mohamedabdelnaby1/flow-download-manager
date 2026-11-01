const path=require('node:path');
const destination=path.resolve(process.argv[2]||path.join(__dirname,'../release/firefox-companion'));
require('../src/extension-package.cjs').prepareFirefox(path.join(__dirname,'../extension'),destination);
console.log(destination);
