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
 const d=clamp(m.duration??0.35,0,2);
 const local=d===0?1:clamp(p/(d/Math.max(0.001,(e.end??1)-(e.start??0))),0,1);
 const q=m.easing==='linear'?local:m.easing==='easeInOut'?(local<.5?2*local*local:1-Math.pow(-2*local+2,2)/2):1-Math.pow(1-local,3);
 let opacity=e.opacity??1, dx=0, dy=0, scale=1;
 if(m.type==='fade') opacity*=q;
 if(m.type==='slide'){dx=(m.dx??0)*(1-q);dy=(m.dy??0)*(1-q);}
 if(m.type==='scale'){const from=m.from??0.9;scale=lerp(from,m.to??1,q);}
 if(m.type==='emphasis'){const from=m.from??0.96;const to=m.to??1.04;scale=lerp(from,to,Math.sin(q*Math.PI));}
 return {opacity,dx,dy,scale};
}

function attrs(e,state){
 return ' opacity="'+state.opacity+'" transform="translate('+state.dx+' '+state.dy+') scale('+state.scale+')"';
}

function renderElement(e,t,scene,palette){
 const p=progress(t,e,scene);
 const state=motionState(e,p);
 const fill=col(palette,e.fill),stroke=col(palette,e.stroke);
 const a=attrs(e,state);
 if(e.type==='rect') return '<rect x="'+num(e.x)+'" y="'+num(e.y)+'" width="'+num(e.width)+'" height="'+num(e.height)+'" rx="'+num(e.radius)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'"'+a+'/>';
 if(e.type==='circle') return '<circle cx="'+num(e.cx)+'" cy="'+num(e.cy)+'" r="'+num(e.r)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'"'+a+'/>';
 if(e.type==='line'){
  const q=e.motion?.type==='draw'?p:1;
  const x2=lerp(num(e.x1),num(e.x2),q),y2=lerp(num(e.y1),num(e.y2),q);
  return '<line x1="'+num(e.x1)+'" y1="'+num(e.y1)+'" x2="'+x2+'" y2="'+y2+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,2)+'" stroke-linecap="round"'+a+'/>';
 }
 if(e.type==='arrow'){
  const q=e.motion?.type==='draw'?p:1;
  const x1=num(e.x1),y1=num(e.y1),x2=lerp(x1,num(e.x2),q),y2=lerp(y1,num(e.y2),q),ang=Math.atan2(y2-y1,x2-x1),s=12;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'"/><path d="M '+(x2-s*Math.cos(ang-.52))+','+(y2-s*Math.sin(ang-.52))+' L '+x2+','+y2+' L '+(x2-s*Math.cos(ang+.52))+','+(y2-s*Math.sin(ang+.52))+'" fill="none" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'" stroke-linecap="round"'+a+'/>';
 }
 if(e.type==='path') return '<path d="'+esc(e.d||'')+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,2)+'"'+a+'/>';
 if(e.type==='text'||e.type==='caption') return '<text x="'+num(e.x)+'" y="'+num(e.y)+'" text-anchor="'+esc(e.anchor||'start')+'" font-family="'+esc(e.fontFamily||'Arial,sans-serif')+'" font-size="'+num(e.fontSize,32)+'px" font-weight="'+esc(e.fontWeight||600)+'" fill="'+esc(fill)+'"'+a+'>'+esc(e.text||'')+'</text>';
 if(e.type==='group') return '<g'+a+'>'+((e.children||[]).map(c=>renderElement(c,t,scene,palette)).join(''))+'</g>';
 if(e.type==='character'){
  const x=num(e.x),y=num(e.y),s=num(e.scale,1),skin=col(palette,e.skin||'skin','#F2C7A5'),hair=col(palette,e.hair||'ink','#17221E'),clothes=col(palette,e.clothes||'accent','#D97745');
  return '<g transform="translate('+x+' '+y+') scale('+s+')">'+
    '<circle cx="0" cy="-70" r="28" fill="'+esc(skin)+'"/>'+
    '<path d="M-27-74 Q0-108 27-74 Q18-98 0-102 Q-18-98-27-74Z" fill="'+esc(hair)+'"/>'+
    '<rect x="-24" y="-40" width="48" height="72" rx="14" fill="'+esc(clothes)+'"/>'+
    '<line x1="-24" y1="-20" x2="-52" y2="8" stroke="'+esc(hair)+'" stroke-width="10" stroke-linecap="round"/>'+
    '<line x1="24" y1="-20" x2="52" y2="8" stroke="'+esc(hair)+'" stroke-width="10" stroke-linecap="round"/>'+
    '<line x1="-12" y1="32" x2="-18" y2="82" stroke="'+esc(hair)+'" stroke-width="10" stroke-linecap="round"/>'+
    '<line x1="12" y1="32" x2="18" y2="82" stroke="'+esc(hair)+'" stroke-width="10" stroke-linecap="round"/>'+
    '</g>';
 }
 return '';
}

function renderScene(scene,t,spec,opacity=1){
 return scene.elements.map(e=>{
   const x=renderElement(e,t,scene,spec.palette);
   return opacity===1?x:x.replaceAll(' opacity="',' opacity="'+opacity+'*');
 }).join('');
}

export function frameSvg(spec,t){
 const index=spec.scenes.findIndex(s=>t>=s.start&&t<s.end);
 const scene=index<0?spec.scenes.at(-1):spec.scenes[index];
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
