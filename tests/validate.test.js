import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateVideoSpec} from '../src/validate.js';

const spec=JSON.parse(await fs.readFile(new URL('../examples/hot-air-balloon.json',import.meta.url)));

test('example is valid',()=>assert.equal(validateVideoSpec(spec),true));

test('duplicate scene id rejected',()=>{
  const x=structuredClone(spec);
  x.scenes[1].id=x.scenes[0].id;
  assert.throws(()=>validateVideoSpec(x));
});

test('bad final duration rejected',()=>{
  const x=structuredClone(spec);
  x.scenes.at(-1).end=11;
  assert.throws(()=>validateVideoSpec(x));
});

test('interaction contracts are enforced by the production validation boundary',()=>{
  const x={
    ...structuredClone(spec),
    duration:4,
    captions:[],
    beats:[],
    scenes:[{
      id:'interaction',
      start:0,
      end:4,
      purpose:'test',
      semanticRefs:[],
      visualRule:'causal',
      elements:[
        {type:'character',id:'host',characterId:'host',x:100,y:220,scale:1.2},
        {type:'prop',id:'ball',kind:'ball',x:240,y:170,scale:1}
      ],
      events:[{
        id:'touch',
        start:1,
        end:2,
        action:'touch',
        actor:'host',
        target:'ball',
        interaction:{
          type:'touch',
          contactAt:0.5,
          response:{type:'impulse',duration:1,vx:100,vy:-50,gravity:300},
          feedback:{duration:0.2}
        }
      }]
    }]
  };
  assert.equal(validateVideoSpec(x),true);
  x.scenes[0].events[0].interaction.causes=['missing'];
  assert.throws(()=>validateVideoSpec(x),/causes unknown event/);
});

test('beats outside the timeline are rejected',()=>{
  const x=structuredClone(spec);
  x.beats=[{id:'late',time:x.duration+1}];
  assert.throws(()=>validateVideoSpec(x),/outside duration/);
});

test('caption overlaps are rejected',()=>{
  const x=structuredClone(spec);
  x.captions=[
    {start:0,end:0.8,text:'A'},
    {start:0.7,end:1.2,text:'B'}
  ];
  assert.throws(()=>validateVideoSpec(x),/Caption overlap/);
});
