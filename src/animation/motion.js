import {clamp,lerp} from '../utils.js';

const TAU=Math.PI*2;

export function easing(name,v){
  const x=clamp(v,0,1);
  switch(name){
    case 'linear': return x;
    case 'easeIn': return x*x;
    case 'easeOut': return 1-Math.pow(1-x,3);
    case 'easeInOut': return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
    case 'sineInOut': return -(Math.cos(Math.PI*x)-1)/2;
    case 'backOut': { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2); }
    case 'backIn': { const c1=1.70158,c3=c1+1; return c3*x*x*x-c1*x*x; }
    case 'expoOut': return x===1?1:1-Math.pow(2,-10*x);
    case 'expoIn': return x===0?0:Math.pow(2,10*x-10);
    default: return 1-Math.pow(1-x,3);
  }
}

export function springAt(t,{mass=1,stiffness=180,damping=18,velocity=0}={}){
  const z=damping/(2*Math.sqrt(stiffness*mass));
  const w0=Math.sqrt(stiffness/mass);
  const wd=w0*Math.sqrt(Math.max(0,1-z*z));
  if(z<1){
    const A=1;
    const B=(z*w0-velocity)/Math.max(.001,wd);
    return 1-Math.exp(-z*w0*t)*(A*Math.cos(wd*t)+B*Math.sin(wd*t));
  }
  return 1-Math.exp(-w0*t)*(1+(w0-velocity)*t);
}

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
  const delay=Math.max(0,m.delay??0);
  const elapsed=t-start-delay;
  const p=clamp(elapsed/span,0,1);
  const duration=Math.max(0,m.duration??Math.min(.45,span));
  const local=duration===0?1:clamp(elapsed/duration,0,1);
  const q=m.easing==='spring'
    ?clamp(springAt(Math.max(0,elapsed),m.spring||{}),0,1.16)
    :easing(m.easing,local);
  let opacity=e.opacity??1,dx=0,dy=0,scale=1,rotate=0;
  if(m.type==='fade') opacity*=q;
  if(m.type==='slide'){dx=(m.dx??0)*(1-q);dy=(m.dy??0)*(1-q);}
  if(m.type==='scale') scale=lerp(m.from??0.9,m.to??1,q);
  if(m.type==='pop') scale=lerp(m.from??0.5,m.to??1,q);
  if(m.type==='emphasis') scale=lerp(m.from??.96,m.to??1.04,Math.sin(clamp(p,0,1)*Math.PI));
  if(m.type==='bob') dy=Math.sin(p*TAU*(m.cycles??1))*(m.amount??8);
  if(m.type==='shake') dx=Math.sin(p*TAU*(m.cycles??3))*(m.amount??7);
  if(m.type==='travel'){dx=lerp(m.fromX??0,m.toX??0,p);dy=lerp(m.fromY??0,m.toY??0,p);}
  if(m.type==='rotate') rotate=lerp(m.from??0,m.to??360,p);
  return {opacity,dx,dy,scale,rotate,p,q};
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
