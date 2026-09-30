import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDirectorPlan} from '../src/director.js';

const base={
  schemaVersion:'1.0',
  reference:{sources:[]},
  styleGuide:{palette:['ink'],typography:'sans',composition:'stable',motion:'causal',identity:['host']},
  story:{hook:'h',progression:['p'],payoff:'p'},
  beatSheet:[{id:'b1',start:0,end:2,purpose:'x'}],
  shotList:[{id:'s1',start:0,end:1,beatId:'b1',startState:'a',endState:'b',action:'move'},{id:'s2',start:1,end:2,beatId:'b1',startState:'b',endState:'c',action:'react'}],
  timeline:{fps:30,events:[]},
  review:{checks:['x'],repairLoop:['render','inspect','diagnose','repair','rerender','reinspect']}
};

test('director plan accepts contiguous state-changing shots',()=>assert.equal(validateDirectorPlan(base,{duration:2}),true));
test('director plan rejects a gap',()=>{
  const p=structuredClone(base); p.shotList[1].start=1.1;
  assert.throws(()=>validateDirectorPlan(p,{duration:2}),/Shot gap/);
});
test('director plan rejects a static shot',()=>{
  const p=structuredClone(base); p.shotList[1].startState='same'; p.shotList[1].endState='same';
  assert.throws(()=>validateDirectorPlan(p,{duration:2}),/no state change/);
});
