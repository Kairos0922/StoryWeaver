import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSceneInteractions,interactionForActor,interactionForTarget} from '../src/animation/interaction.js';
import {actingState,poseState} from '../src/animation/acting.js';
import {motionState} from '../src/animation/motion.js';
import {frameSvg} from '../src/renderers/svg.js';

function scene(){
  return {
    id:'contact',
    start:0,end:4,
    elements:[
      {type:'prop',id:'ball',kind:'ball',x:250,y:140,scale:1,motion:{type:'travel',fromX:0,toX:-40}},
      {type:'character',id:'host',characterId:'host',x:100,y:220,scale:1.2,motion:{type:'travel',fromX:0,toX:60}}
    ],
    events:[
      {id:'reach',start:1,end:2.5,action:'reach',actor:'host',target:'ball',phase:'action',interaction:{
        type:'touch',contactAt:0.5,hand:'right',causes:['react'],
        response:{type:'impulse',duration:1,vx:140,vy:-80,gravity:360,rotateSpeed:240},
        feedback:{duration:.3,radius:24,opacity:.8,color:'#E66D5A'}
      }},
      {id:'react',start:2.5,end:3.5,action:'react',actor:'host',target:'ball',phase:'reaction',causedBy:'reach'}
    ]
  };
}

test('interaction validates a causal contact contract',()=>{
  assert.equal(validateSceneInteractions(scene()),true);
});

test('character reaches target exactly at contact',()=>{
  const s=scene();
  const t=1.75;
  const i=interactionForActor(s,t,'host');
  assert.equal(i.contactReached,true);
  const event=i.event;
  const actor=s.elements.find(e=>e.id==='host');
  const ms=motionState(actor,t,s);
  const acting=actingState(event,t,s,i);
  const pose=poseState(acting,{targetPoint:acting.targetPoint,originX:actor.x+ms.dx,originY:actor.y+ms.dy,actorScale:actor.scale*ms.scale});
  const worldX=actor.x+ms.dx+pose.rightHandX*actor.scale*ms.scale;
  const worldY=actor.y+ms.dy+pose.bodyY+(pose.rightHandY*actor.scale*ms.scale);
  assert.ok(Math.hypot(worldX-i.contactPoint.x,worldY-i.contactPoint.y)<1e-6);
});

test('target stays still before contact and responds after contact',()=>{
  const s=scene();
  const before=interactionForTarget(s,1.7,'ball');
  assert.equal(before,null);
  const at=interactionForTarget(s,1.75,'ball');
  assert.equal(at.feedback>0,true);
  assert.equal(at.response.dx,0);
  const after=interactionForTarget(s,2.25,'ball');
  assert.ok(after.response.dx>0);
  assert.ok(after.response.dy!==0);
});

test('causal child cannot start before contact',()=>{
  const s=scene();
  s.events[1].start=1.5;
  assert.throws(()=>validateSceneInteractions(s),/starts before contact/);
});

test('contact must be physically reachable',()=>{
  const s=scene();
  s.elements[1].x=0;
  assert.throws(()=>validateSceneInteractions(s),/out of reach/);
});

test('contact feedback is present in rendered frame',()=>{
  const s=scene();
  const spec={schemaVersion:'0.3',width:640,height:360,fps:30,duration:4,background:'#F7F2E8',
    palette:{ink:'#17221E',accent:'#D97745',coral:'#E66D5A',blue:'#5C93B8',yellow:'#E9BE4B',green:'#719A78',paper:'#F7F2E8'},
    scenes:[s]};
  const svg=frameSvg(spec,1.75);
  assert.match(svg,/stroke="#E66D5A"/);
  assert.match(svg,/circle cx="[^"]+" cy="[^"]+" r="[^"]+"/);
});


test('causal interaction cycles are rejected',()=>{
  const s=scene();
  s.events[0].interaction.causes=[];
  s.events[0].causedBy='react';
  s.events[1].causedBy='reach';
  assert.throws(()=>validateSceneInteractions(s),/Causal interaction cycle/);
});

test('interactions require explicit element ids',()=>{
  const s=scene();
  s.elements[1].id=undefined;
  assert.throws(()=>validateSceneInteractions(s),/explicit character id/);
});
