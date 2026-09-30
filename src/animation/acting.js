import {clamp,lerp} from '../utils.js';

const EASE=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;

export function actionProgress(event,t,scene){
  if(!event) return 0;
  return clamp((t-(scene.start+event.start))/Math.max(.001,event.end-event.start),0,1);
}

export function actingState(event,t,scene){
  if(!event) return {action:'idle',phase:'idle',p:0,q:0,reach:0,recoil:0,anticipation:0,gaze:'center',expression:'neutral'};
  const p=actionProgress(event,t,scene);
  const q=EASE(p);
  const phase=event.phase||'action';
  const anticipation=phase==='anticipation'?Math.sin(p*Math.PI):0;
  const reaction=(phase==='reaction'||event.action==='react')?Math.sin(p*Math.PI):0;
  const reach=['reach','grab','lift','touch'].includes(event.action)?q:0;
  return {action:event.action||'idle',phase,p,q,anticipation,recoil:reaction,reach,gaze:event.gaze||'center',expression:event.expression||'neutral'};
}

export function poseState(state){
  const run=state.action==='run', walk=state.action==='walk';
  const cycle=(run?4:walk?2:0)*Math.PI*state.p;
  const stride=(run||walk)?Math.sin(cycle):0;
  const lift=state.recoil*10;
  const prep=state.anticipation*8;
  return {
    bodyY:-lift+prep,
    headY:-lift*.45,
    torsoRotate:state.anticipation*3-state.recoil*4,
    leftArm: run?lerp(20,-35,(stride+1)/2):state.action==='celebrate'?-55:state.action==='point'?-18:lerp(8,-48,state.reach),
    rightArm: run?lerp(-35,20,(stride+1)/2):state.action==='celebrate'?-55:state.action==='point'?-58:lerp(8,-48,state.reach),
    leftLeg:(run||walk)?28*stride:0,
    rightLeg:(run||walk)?-28*stride:0,
    reach:state.reach
  };
}
