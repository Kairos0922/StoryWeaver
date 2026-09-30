import {clamp,lerp} from '../utils.js';

const EASE=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;

export function actionProgress(event,t,scene){
  if(!event)return 0;
  return clamp((t-(scene.start+event.start))/Math.max(.001,event.end-event.start),0,1);
}

export function actingState(event,t,scene,interaction=null){
  if(!event)return {action:'idle',phase:'idle',p:0,q:0,reach:0,recoil:0,anticipation:0,gaze:'center',expression:'neutral',targetPoint:null};
  const p=actionProgress(event,t,scene);
  const q=EASE(p);
  const phase=event.phase||'action';
  const anticipation=phase==='anticipation'?Math.sin(p*Math.PI):0;
  const reaction=(phase==='reaction'||event.action==='react')?Math.sin(p*Math.PI):0;
  const reachAction=['reach','grab','lift','touch'].includes(event.action);
  const reach=interaction&&reachAction?interaction.reach:(reachAction?q:0);
  const contactRecoil=interaction?.contactReached?interaction.feedback:0;
  return {
    action:event.action||'idle',
    phase,p,q,
    reach,
    recoil:Math.max(reaction,contactRecoil),
    anticipation,
    gaze:event.gaze||'center',
    expression:event.expression||'neutral',
    targetPoint:interaction?.targetPoint??null,
    hand:interaction?.event?.interaction?.hand||'right'
  };
}

export function poseState(state,{targetPoint=null,originX=0,originY=0,actorScale=1}={}){
  const run=state.action==='run',walk=state.action==='walk';
  const cycle=(run?4:walk?2:0)*Math.PI*state.p;
  const stride=(run||walk)?Math.sin(cycle):0;
  const lift=state.recoil*10;
  const prep=state.anticipation*8;
  const armY=state.action==='celebrate'?-58:state.action==='point'?-18:state.action==='crouch'?18:-8;
  const armDX=state.action==='celebrate'?48:state.action==='point'?62:35;
  const leftDefault={x:-31-armDX,y:armY};
  const rightDefault={x:31+armDX,y:armY};
  const bodyY=-lift+prep;
  const pose={
    bodyY,
    headY:-lift*.45,
    torsoRotate:state.anticipation*3-state.recoil*4,
    leftLeg:(run||walk)?28*stride:0,
    rightLeg:(run||walk)?-28*stride:0,
    leftHandX:leftDefault.x,
    leftHandY:leftDefault.y,
    rightHandX:rightDefault.x,
    rightHandY:rightDefault.y
  };
  if(targetPoint&&['reach','grab','touch'].includes(state.action)&&state.reach>0){
    const targetLocal={
      x:(targetPoint.x-originX)/Math.max(.001,actorScale),
      y:(targetPoint.y-(originY+bodyY))/Math.max(.001,actorScale)
    };
    const key=state.hand==='left'?'left':'right';
    const start=key==='left'?leftDefault:rightDefault;
    const handX=lerp(start.x,targetLocal.x,clamp(state.reach,0,1));
    const handY=lerp(start.y,targetLocal.y,clamp(state.reach,0,1));
    if(key==='left'){pose.leftHandX=handX;pose.leftHandY=handY;}
    else {pose.rightHandX=handX;pose.rightHandY=handY;}
  }
  return pose;
}
