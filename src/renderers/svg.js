import {esc,lerp,clamp} from '../utils.js';

const col=(p,n,f='#111')=>p?.[n]??n??f;
const num=(v,d=0)=>Number.isFinite(v)?v:d;

function progress(t,e,scene){
 const start=e.start??scene.start;
 const end=e.end??scene.end;
 return clamp((t-start)/Math.max(0.001,end-start),0,1);
}

function motionState(e,p){
 const m=e.motion||{type:'none'};
 const d=m.duration??0.35;
 const local=d===0?1:clamp(p/(d/Math.max(0.001,(e.end??1)-(e.start??0))),0,1);
 const q=m.easing==='linear'?local:m.easing==='easeInOut'?(local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2):1-Math.pow(1-local,3);
 let opacity=e.opacity??1, dx=0, dy=0, scale=1;
 if(m.type==='fade') opacity*=q;
 if(m.type==='slide'){dx=(m.dx??0)*(1-q);dy=(m.dy??0)*(1-q);}
 if(m.type==='scale'){scale=lerp(m.from??0.9,m.to??1,q);}
 if(m.type==='emphasis'){scale=lerp(m.from??0.96,m.to??1.04,Math.sin(q*Math.PI));}
 return {opacity,dx,dy,scale};
}

function renderElement(e,t,scene,palette,mult=1){
 const p=progress(t,e,scene);
 const state=motionState(e,p);
 state.opacity*=mult;
 const fill=col(palette,e.fill),stroke=col(palette,e.stroke);
 const a=' opacity="'+state.opacity+'" transform="translate('+state.dx+' '+state.dy+') scale('+state.scale+')"';
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
 if(e.type==='character'){
  const x=num(e.x),y=num(e.y),s=num(e.scale,1),skin=col(palette,e.skin||'skin','#F2C7A5'),hair=col(palette,e.hair||'ink','#17221E'),clothes=col(palette,e.clothes||'accent','#D97745');
  const pose=e.pose||'idle',expression=e.expression||'happy',dir=num(e.direction,1);
  const armY=pose==='point'?-10:pose==='open'?-18:pose==='search'?4:pose==='celebrate'?-48:pose==='drive'?0:-8;
  const armDX=pose==='point'?58:pose==='open'?48:pose==='search'?42:pose==='celebrate'?42:pose==='drive'?38:34;
  const legDX=pose==='walk'?22:pose==='drive'?18:16;
  const mouth=expression==='worried'?'M-12 6 Q0-2 12 6':expression==='surprised'?'M-7 2 A7 9 0 1 0 7 2':expression==='excited'?'M-13 0 Q0 14 13 0':'M-13 0 Q0 12 13 0';
  return '<g opacity="'+state.opacity+'" transform="translate('+x+' '+y+') scale('+(s*state.scale*dir)+' '+(s*state.scale)+')">'+
    '<circle cx="0" cy="-72" r="34" fill="'+esc(skin)+'"/>'+
    '<path d="M-34-73 Q-28-112 0-112 Q28-112 34-73 Q19-91 0-95 Q-19-91-34-73Z" fill="'+esc(hair)+'"/>'+
    '<circle cx="-13" cy="-72" r="4.5" fill="'+esc(hair)+'"/><circle cx="13" cy="-72" r="4.5" fill="'+esc(hair)+'"/>'+
    '<path d="'+mouth+'" fill="none" stroke="'+esc(hair)+'" stroke-width="3.5" stroke-linecap="round"/>'+
    '<rect x="-29" y="-35" width="58" height="82" rx="18" fill="'+esc(clothes)+'"/>'+
    '<line x1="-28" y1="-15" x2="'+(-28-armDX)+'" y2="'+armY+'" stroke="'+esc(hair)+'" stroke-width="11" stroke-linecap="round"/>'+
    '<line x1="28" y1="-15" x2="'+(28+armDX)+'" y2="'+armY+'" stroke="'+esc(hair)+'" stroke-width="11" stroke-linecap="round"/>'+
    '<circle cx="'+(-28-armDX)+'" cy="'+armY+'" r="7" fill="'+esc(skin)+'"/><circle cx="'+(28+armDX)+'" cy="'+armY+'" r="7" fill="'+esc(skin)+'"/>'+
    '<line x1="-13" y1="47" x2="'+(-13-legDX)+'" y2="96" stroke="'+esc(hair)+'" stroke-width="11" stroke-linecap="round"/>'+
    '<line x1="13" y1="47" x2="'+(13+legDX)+'" y2="96" stroke="'+esc(hair)+'" stroke-width="11" stroke-linecap="round"/>'+
    '</g>';
 }
 return '';
}

function renderScene(scene,t,spec,opacity=1){
 return scene.elements.map(e=>renderElement(e,t,scene,spec.palette,opacity)).join('');
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
 if(c)out+='<rect x="'+spec.width*.06+'" y="'+spec.height*.84+'" width="'+spec.width*.88+'" height="62" rx="10" fill="'+esc(col(spec.palette,'captionBg','#111'))+'" opacity=".78"/><text x="'+spec.width*.08+'" y="'+spec.height*.90+'" font-family="Arial,sans-serif" font-size="'+(spec.captionStyle?.fontSize||26)+'px" font-weight="700" fill="'+esc(col(spec.palette,'white','#fff'))+'">'+esc(c.text)+'</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+spec.width+'" height="'+spec.height+'" viewBox="0 0 '+spec.width+' '+spec.height+'"><rect width="100%" height="100%" fill="'+esc(col(spec.palette,spec.background,'#F7F2E8'))+'"/>'+out+'</svg>';
}
