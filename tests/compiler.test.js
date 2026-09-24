import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentPlan} from '../src/compiler.js';

const plan={
 source:{title:'Example',text:'A causes B.'},
 claims:[{id:'c1',text:'A causes B.',type:'cause'}],
 duration:1,
 beats:[{id:'b1',time:0,label:'hook'}],
 scenes:[{id:'a',start:0,end:1,beat:'hook',purpose:'show cause',semanticRefs:['c1'],visualRule:'cause-effect',transition:{type:'fade',duration:.15},elements:[{type:'text',x:10,y:20,text:'A → B',motion:{type:'fade',duration:.2}}]}]
};

test('content plan compiles when scene refs are traceable',()=>{
 const s=compileContentPlan(plan);
 assert.equal(s.duration,1);
 assert.equal(s.schemaVersion,'0.3');
 assert.deepEqual(s.scenes[0].semanticRefs,['c1']);
 assert.equal(s.scenes[0].beat,'hook');
});

test('unknown claim reference is rejected',()=>{
 const x=structuredClone(plan); x.scenes[0].semanticRefs=['missing'];
 assert.throws(()=>compileContentPlan(x));
});

test('scene gaps are rejected',()=>{
 const x=structuredClone(plan); x.scenes[0].end=.5;
 assert.throws(()=>compileContentPlan(x));
});
