import {clamp,lerp} from '../utils.js';

export function progressAt(t,e,scene){
  const start=e.start??scene.start;
  const end=e.end??scene.end;
  return clamp((t-start)/Math.max(0.001,end-start),0,1);
}

export function motionState(e,t,scene){
  const m=e.motion||{type:'none'};
  const start=e.start??scene.start;
  const end=e.end??scene.end;
  const span=Math.max(.001,end-start);
  const p=clamp((t-start)/span,0,1);
  const d=m.duration??Math.min(.45,span);
  const local=d===0?1:clamp(p/(d/span),0,1);
  const ease=v=>m.easing==='linear'?v:m.easing==='easeInOut'?(v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2):1-Math.pow(1-v,3);
  const q=ease(local);
  let opacity=e.opacity??1,dx=0,dy=0,scale=1,rotate=0;
  if(m.type==='fade') opacity*=q;
  if(m.type==='slide'){dx=(m.dx??0)*(1-q);dy=(m.dy??0)*(1-q);}
  if(m.type==='scale') scale=lerp(m.from??0.9,m.to??1,q);
  if(m.type==='pop') scale=lerp(m.from??0.5,m.to??1,q);
  if(m.type==='emphasis') scale=lerp(m.from??.96,m.to??1.04,Math.sin(q*Math.PI));
  if(m.type==='bob') dy=Math.sin(p*Math.PI*2*(m.cycles??1))*(m.amount??8);
  if(m.type==='shake') dx=Math.sin(p*Math.PI*2*(m.cycles??3))*(m.amount??7);
  if(m.type==='travel'){dx=lerp(m.fromX??0,m.toX??0,p);dy=lerp(m.fromY??0,m.toY??0,p);}
  if(m.type==='rotate') rotate=lerp(m.from??0,m.to??360,p);
  return {opacity,dx,dy,scale,rotate,p};
}

export function worldPosition(e,t,scene){
  const state=motionState(e,t,scene);
  return {
    x:Number.isFinite(e.x)?e.x:Number.isFinite(e.cx)?e.cx:0,
    y:Number.isFinite(e.y)?e.y:Number.isFinite(e.cy)?e.cy:0,
    scale:Number.isFinite(e.scale)?e.scale:1,
    state
  };
}
