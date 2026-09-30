import {esc,lerp,clamp} from '../utils.js';
import {actingState,poseState} from '../animation/acting.js';
import {motionState,progressAt} from '../animation/motion.js';
import {elementId,interactionForActor,interactionForTarget,contactFeedback} from '../animation/interaction.js';

const col=(p,n,f='#111')=>p?.[n]??n??f;
const num=(v,d=0)=>Number.isFinite(v)?v:d;

function progress(t,e,scene){
 const start=e.start??scene.start;
 const end=e.end??scene.end;
 return clamp((t-start)/Math.max(0.001,end-start),0,1);
}

function motionState(e,t,scene){
 const m=e.motion||{type:'none'};
 const start=e.start??scene.start,end=e.end??scene.end;
 const span=Math.max(.001,end-start),p=clamp((t-start)/span,0,1);
 const d=m.duration??Math.min(.45,span),local=d===0?1:clamp(p/(d/span),0,1);
 const q=m.easing==='linear'?local:m.easing==='easeInOut'?(local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2):1-Math.pow(1-local,3);
 let opacity=e.opacity??1,dx=0,dy=0,scale=1,rotate=0;
 if(m.type==='fade') opacity*=q;
 if(m.type==='slide'){dx=(m.dx??0)*(1-q);dy=(m.dy??0)*(1-q);}
 if(m.type==='scale'){scale=lerp(m.from??0.9,m.to??1,q);}
 if(m.type==='pop'){scale=lerp(m.from??0.5,m.to??1,q);}
 if(m.type==='emphasis'){scale=lerp(m.from??.96,m.to??1.04,Math.sin(q*Math.PI));}
 if(m.type==='bob'){dy=Math.sin(p*Math.PI*2*(m.cycles??1))*(m.amount??8);}
 if(m.type==='shake'){dx=Math.sin(p*Math.PI*2*(m.cycles??3))*(m.amount??7);}
 if(m.type==='travel'){dx=lerp(m.fromX??0,m.toX??0,p);dy=lerp(m.fromY??0,m.toY??0,p);}
 if(m.type==='rotate'){rotate=lerp(m.from??0,m.to??360,p);}
 return {opacity,dx,dy,scale,rotate,p};
}


function activeEvent(scene,t,actor){
 const events=scene.events||[];
 const matches=events.filter(e=>t>=scene.start+e.start&&t<=scene.start+e.end&&(!actor||!e.actor||e.actor===actor));
 return matches.at(-1)||null;
}
function eventProgress(scene,t,e){ return e?clamp((t-(scene.start+e.start))/Math.max(.001,e.end-e.start),0,1):0; }
function actionState(scene,t,actor){
 const e=activeEvent(scene,t,actor); if(!e)return null;
 const p=eventProgress(scene,t,e); const eased=e.easing==='linear'?p:e.easing==='easeInOut'?(p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2):1-Math.pow(1-p,3);
 return {...e,p,eased};
}
function cameraState(scene,t,spec){
 const c=scene.camera||{type:'static'};
 const start=scene.start,end=scene.end,p=clamp((t-start)/Math.max(.001,end-start),0,1);
 const ease=v=>c.easing==='linear'?v:(1-Math.pow(1-v,3));
 const q=ease(p);
 const panX=lerp(c.fromX??0,c.toX??0,q),panY=lerp(c.fromY??0,c.toY??0,q);
 const scale=lerp(c.fromScale??1,c.toScale??1,q);
 return {panX,panY,scale};
}

function renderProp(e,state,palette,interaction=null){
 const x=num(e.x),y=num(e.y),s=num(e.scale,1),fill=col(palette,e.fill,'#EF8067'),ink=col(palette,e.stroke,'#26352F');
 const response=interaction?.response||{dx:0,dy:0,rotate:0,scale:1};
 const feedback=interaction?.feedback??0;
 const squash=e.kind==='ball'?1+feedback*.08:1;
 const stretch=e.kind==='ball'?1-feedback*.06:1;
 const tr='translate('+(x+state.dx+response.dx)+' '+(y+state.dy+response.dy)+') rotate('+(state.rotate+response.rotate)+') scale('+(s*state.scale*response.scale*squash)+' '+(s*state.scale*response.scale*stretch)+')';
 if(e.kind==='ball') return '<g opacity="'+state.opacity+'" transform="'+tr+'"><circle r="42" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="4"/><path d="M-28-28 Q0-8 28-28" fill="none" stroke="#fff" stroke-width="5" opacity=".65"/><circle cx="-13" cy="-14" r="7" fill="#fff" opacity=".7"/></g>';
 if(e.kind==='box'){
  const open=clamp(e.openAt==null?0:((state.p-e.openAt)/Math.max(.001,1-e.openAt)),0,1);
  const lidY=-75-open*48, lidR=-12*open;
  return '<g opacity="'+state.opacity+'" transform="'+tr+'"><rect x="-120" y="-75" width="240" height="150" rx="20" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="5"/><path d="M-120-45 L0-5 L120-45" fill="none" stroke="'+esc(ink)+'" stroke-width="4"/><g transform="rotate('+lidR+' 0 -75)"><rect x="-120" y="'+lidY+'" width="240" height="30" rx="12" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="5"/></g><path d="M0-75 L0 75" stroke="'+esc(ink)+'" stroke-width="4" opacity=".35"/><ellipse cx="0" cy="-58" rx="55" ry="18" fill="#fff" opacity="'+(.10+open*.25)+'"/></g>';
 }
 if(e.kind==='umbrella') return '<g opacity="'+state.opacity+'" transform="'+tr+'"><path d="M-115 0 Q0-115 115 0 Z" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="5"/><path d="M-80 0 Q-70 24 -52 0 M-26 0 Q-15 24 0 0 M26 0 Q40 24 52 0 M80 0 Q92 24 115 0" fill="none" stroke="'+esc(ink)+'" stroke-width="4"/><path d="M0 0 L0 145 Q0 170 25 170" fill="none" stroke="'+esc(ink)+'" stroke-width="6" stroke-linecap="round"/></g>';
 if(e.kind==='car'){
  const spin=(state.p*(e.motion?.wheelTurns??3)*360)%360;
  return '<g opacity="'+state.opacity+'" transform="'+tr+'"><rect x="-120" y="-35" width="240" height="75" rx="24" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="5"/><path d="M-70-35 L-35-82 L55-82 L88-35" fill="'+esc(fill)+'" stroke="'+esc(ink)+'" stroke-width="5"/><path d="M-25-72 L-5-43 M15-72 L50-43" stroke="#fff" stroke-width="5" opacity=".7"/><g transform="rotate('+spin+' -70 45)"><circle cx="-70" cy="45" r="25" fill="#26352F"/><path d="M-70 25V65 M-90 45H-50" stroke="#F8E8C8" stroke-width="5"/></g><g transform="rotate('+spin+' 70 45)"><circle cx="70" cy="45" r="25" fill="#26352F"/><path d="M70 25V65 M50 45H90" stroke="#F8E8C8" stroke-width="5"/></g><circle cx="108" cy="-5" r="7" fill="#FFE8A8"/></g>';
 }
 if(e.kind==='track') return '<g opacity="'+state.opacity+'" transform="'+tr+'"><ellipse cx="-25" cy="0" rx="18" ry="34" fill="'+esc(fill)+'" transform="rotate(-20)"/><ellipse cx="25" cy="0" rx="18" ry="34" fill="'+esc(fill)+'" transform="rotate(20)"/></g>';
 return '';
}

function renderElement(e,t,scene,palette,mult=1){
 const p=progressAt(t,e,scene);
 const state=motionState(e,t,scene);
 state.opacity*=mult;
 const fill=col(palette,e.fill),stroke=col(palette,e.stroke);
 const a=' opacity="'+state.opacity+'" transform="translate('+state.dx+' '+state.dy+') rotate('+state.rotate+') scale('+state.scale+')"';
 if(e.type==='rect') return '<rect x="'+num(e.x)+'" y="'+num(e.y)+'" width="'+num(e.width)+'" height="'+num(e.height)+'" rx="'+num(e.radius)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'"'+a+'/>';
 if(e.type==='circle') return '<circle cx="'+num(e.cx)+'" cy="'+num(e.cy)+'" r="'+num(e.r)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'"'+a+'/>';
 if(e.type==='line'){
  const q=e.motion?.type==='draw'?p:1;
  return '<line x1="'+num(e.x1)+'" y1="'+num(e.y1)+'" x2="'+lerp(num(e.x1),num(e.x2),q)+'" y2="'+lerp(num(e.y1),num(e.y2),q)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,2)+'" stroke-linecap="round"'+a+'/>';
 }
 if(e.type==='arrow'){
  const q=e.motion?.type==='draw'?p:1,x1=num(e.x1),y1=num(e.y1),x2=lerp(x1,num(e.x2),q),y2=lerp(y1,num(e.y2),q),ang=Math.atan2(y2-y1,x2-x1),s=12;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'" opacity="'+state.opacity+'"/><path d="M '+(x2-s*Math.cos(ang-.52))+','+(y2-s*Math.sin(ang-.52))+' L '+x2+','+y2+' L '+(x2-s*Math.cos(ang+.52))+','+(y2-s*Math.sin(ang+.52))+'" fill="none" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'" stroke-linecap="round" opacity="'+state.opacity+'"/>';
 }
 if(e.type==='path') return '<path d="'+esc(e.d||'')+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,2)+'"'+a+'/>';
 if(e.type==='text'||e.type==='caption') return '<text x="'+num(e.x)+'" y="'+num(e.y)+'" text-anchor="'+esc(e.anchor||'start')+'" font-family="'+esc(e.fontFamily||'Arial,sans-serif')+'" font-size="'+num(e.fontSize,32)+'px" font-weight="'+esc(e.fontWeight||600)+'" fill="'+esc(fill)+'"'+a+'>'+esc(e.text||'')+'</text>';
 if(e.type==='group') return '<g'+a+'>'+((e.children||[]).map(c=>renderElement(c,t,scene,palette,mult)).join(''))+'</g>';
 if(e.type==='prop') return renderProp(e,state,palette,interactionForTarget(scene,t,elementId(e)));
 if(e.type==='character'){
  const actingEvent=activeEvent(scene,t,e.characterId);
  const interaction=interactionForActor(scene,t,e.characterId);
  const acting=actingState(actingEvent,t,scene,interaction);
  const pose=poseState(acting,{targetPoint:acting.targetPoint,originX:num(e.x)+state.dx,originY:num(e.y)+state.dy,actorScale:num(e.scale,1)*state.scale});
  const expression=acting.expression==='neutral'?(e.expression||'happy'):acting.expression;
  const gaze=acting.gaze||'center';
  const headTurn=gaze==='left'?-7:gaze==='right'?7:0;
  const dir=num(e.direction,1);
  const blink=((t*3.7)%1)>.94?0.35:1;
  const eyeScale=expression==='surprised'?1.35:1;
  const mouth=expression==='worried'?'M-12 7 Q0-1 12 7':expression==='surprised'?'M-8 0 A8 10 0 1 0 8 0':expression==='excited'?'M-13 0 Q0 15 13 0':'M-13 0 Q0 11 13 0';
  const skin=col(palette,e.skin||'skin','#F2C7A5'),hair=col(palette,e.hair||'ink','#17221E'),clothes=col(palette,e.clothes||'accent','#D97745');
  const x=num(e.x),y=num(e.y),s=num(e.scale,1);
  const walk=(acting.action==='walk'||acting.action==='run');
  const leftArm=pose.leftArm,rightArm=pose.rightArm;
  const leftLeg=pose.leftLeg,rightLeg=pose.rightLeg;
  const handReach=acting.reach*10;
  const reactionScale=1+acting.recoil*.035;
  const tr='translate('+(x+state.dx)+' '+(y+state.dy+pose.bodyY)+') scale('+(s*state.scale*dir*reactionScale)+' '+(s*state.scale/reactionScale)+') rotate('+(state.rotate+pose.torsoRotate)+')'';
  return '<g opacity="'+state.opacity+'" transform="'+tr+'">'+
    '<ellipse cx="0" cy="55" rx="42" ry="10" fill="#26352F" opacity=".12"/>'+
    '<circle cx="'+headTurn+'" cy="'+(-72+pose.headY)+'" r="38" fill="'+esc(skin)+'"/>'+
    '<path d="M-38-72 Q-34-120 0-120 Q34-120 38-72 Q20-96 0-101 Q-20-96-38-72Z" fill="'+esc(hair)+'" transform="translate('+headTurn+' '+pose.headY+')"/>'+
    '<ellipse cx="'+(-14+headTurn)+'" cy="'+(-72+pose.headY)+'" rx="'+(5*eyeScale)+'" ry="'+(5*eyeScale*blink)+'" fill="'+esc(hair)+'"/><ellipse cx="'+(14+headTurn)+'" cy="'+(-72+pose.headY)+'" rx="'+(5*eyeScale)+'" ry="'+(5*eyeScale*blink)+'" fill="'+esc(hair)+'"/>'+
    '<path d="'+mouth+'" fill="none" stroke="'+esc(hair)+'" stroke-width="4" stroke-linecap="round" transform="translate('+headTurn+' '+pose.headY+')"/>'+
    '<rect x="-34" y="-34" width="68" height="86" rx="20" fill="'+esc(clothes)+'" stroke="'+esc(hair)+'" stroke-width="3"/>'+
    '<line x1="-31" y1="-10" x2="'+(-31-leftArm-handReach)+'" y2="'+(leftArm)+'" stroke="'+esc(hair)+'" stroke-width="12" stroke-linecap="round"/>'+
    '<line x1="31" y1="-10" x2="'+(31+rightArm+handReach)+'" y2="'+(rightArm)+'" stroke="'+esc(hair)+'" stroke-width="12" stroke-linecap="round"/>'+
    '<circle cx="'+(-31-leftArm-handReach)+'" cy="'+leftArm+'" r="8" fill="'+esc(skin)+'"/><circle cx="'+(31+rightArm+handReach)+'" cy="'+rightArm+'" r="8" fill="'+esc(skin)+'"/>'+
    '<line x1="-15" y1="52" x2="'+(-15-leftLeg*.45)+'" y2="108" stroke="'+esc(hair)+'" stroke-width="12" stroke-linecap="round"/>'+
    '<line x1="15" y1="52" x2="'+(15+rightLeg*.45)+'" y2="108" stroke="'+esc(hair)+'" stroke-width="12" stroke-linecap="round"/>'+
    (walk?'<path d="M-8 116 Q0 124 8 116" fill="none" stroke="'+esc(hair)+'" stroke-width="6" stroke-linecap="round"/>':'')+
  '</g>';

 
 }
 return '';
}

function renderScene(scene,t,spec,opacity=1){
 const cam=cameraState(scene,t,spec);
 const cx=spec.width/2,cy=spec.height/2;
 const camera='<g transform="translate('+cx+' '+cy+') scale('+cam.scale+') translate('+(-cx+cam.panX)+' '+(-cy+cam.panY)+')">';
 return camera+scene.elements.map(e=>renderElement(e,t,scene,spec.palette,opacity)).join('')+contactFeedback(scene,t,spec.palette)+'</g>';
}

export function frameSvg(spec,t){
 const index=Math.max(0,spec.scenes.findIndex(s=>t>=s.start&&t<s.end));
 const scene=spec.scenes[index]||spec.scenes.at(-1);
 let out=renderScene(scene,t,spec);
 const transition=scene.transition?.type==='fade'?Math.min(scene.transition.duration??0,scene.end-scene.start):0;
 const next=spec.scenes[index+1];
 if(next&&transition>0&&t>=scene.end-transition){
   const q=clamp((t-(scene.end-transition))/transition,0,1);
   out=renderScene(scene,t,spec,1-q)+renderScene(next,next.start+q*transition,spec,q);
 }
 const c=(spec.captions||[]).find(x=>t>=x.start&&t<x.end);
 if(c)out+='<rect x="'+spec.width*.06+'" y="'+spec.height*.84+'" width="'+spec.width*.88+'" height="62" rx="10" fill="'+esc(col(spec.palette,'captionBg','#111'))+'" opacity=".78"/><text x="'+spec.width*.08+'" y="'+spec.height*.90+'" font-family="'+esc(spec.captionStyle?.fontFamily||"Arial,sans-serif")+'" font-size="'+(spec.captionStyle?.fontSize||26)+'px" font-weight="700" fill="'+esc(col(spec.palette,'white','#fff'))+'">'+esc(c.text)+'</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+spec.width+'" height="'+spec.height+'" viewBox="0 0 '+spec.width+' '+spec.height+'"><rect width="100%" height="100%" fill="'+esc(col(spec.palette,spec.background,'#F7F2E8'))+'"/>'+out+'</svg>';
}
