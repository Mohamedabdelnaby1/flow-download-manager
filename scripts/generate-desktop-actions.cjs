const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'../src/preload.cjs'),actions=require('../src/desktop-actions.json'),original=fs.readFileSync(target,'utf8');
const statement='const allowed=new Set(/* FLOW_ACTIONS_START */'+JSON.stringify(actions)+'/* FLOW_ACTIONS_END */);';
const next=original.replace(/^const allowed=new Set\(.*\);$/m,statement);if(next===original&&!original.includes(statement))throw Error('Desktop preload permission boundary not found');fs.writeFileSync(target,next);
