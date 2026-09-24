import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentPlan} from '../src/compiler.js';

const plan={
 source:{title:'Example',text:'A causes B.'},
 claims:[{id:'c1',text:'A causes B.',type:'cause'}],
 duration:1,
 scenes:[{id:'a',start:0,end:1,purpose:'show cause',semanticRefs:['c1'],visualRule:'cause-effect',elements:[{type:'text',x:10,y:20,text:'A → B'}]}]
};

test('content plan compiles when scene refs are traceable',()=>{
 const s=compileContentPlan(plan);
 assert.equal(s.duration,1);
 assert.deepEqual(s.scenes[0].semanticRefs,['c1']);
});

test('unknown claim reference is rejected',()=>{
 const x=structuredClone(plan); x.scenes[0].semanticRefs=['missing'];
 assert.throws(()=>compileContentPlan(x));
});
