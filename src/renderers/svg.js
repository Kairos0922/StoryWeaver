import {esc,lerp,clamp} from '../utils.js';
const col=(p,n,f='#111')=>p?.[n]??n??f;
const num=(v,d=0)=>Number.isFinite(v)?v:d;
export function frameSvg(spec,t){
 const scene=spec.scenes.find(s=>t>=s.start&&t<s.end)||spec.scenes.at(-1);
 const out=[];
 for(const e of scene.elements){
  const p=clamp((t-(e.start??scene.start))/((e.end??scene.end)-(e.start??scene.start)),0,1);
  const fill=col(spec.palette,e.fill),stroke=col(spec.palette,e.stroke);
  if(e.type==='rect') out.push('<rect x="'+num(e.x)+'" y="'+num(e.y)+'" width="'+num(e.width)+'" height="'+num(e.height)+'" rx="'+num(e.radius)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'" opacity="'+(e.opacity??1)+'"/>');
  else if(e.type==='circle') out.push('<circle cx="'+num(e.cx)+'" cy="'+num(e.cy)+'" r="'+num(e.r)+'" fill="'+esc(fill)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth)+'" opacity="'+(e.opacity??1)+'"/>');
  else if(e.type==='line') out.push('<line x1="'+num(e.x1)+'" y1="'+num(e.y1)+'" x2="'+num(e.x2)+'" y2="'+num(e.y2)+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,2)+'" stroke-linecap="round"/>');
  else if(e.type==='arrow'){const x1=num(e.x1),y1=num(e.y1),x2=lerp(x1,num(e.x2),p),y2=lerp(y1,num(e.y2),p),a=Math.atan2(y2-y1,x2-x1),s=12;out.push('<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'"/><path d="M '+(x2-s*Math.cos(a-.52))+','+(y2-s*Math.sin(a-.52))+' L '+x2+','+y2+' L '+(x2-s*Math.cos(a+.52))+','+(y2-s*Math.sin(a+.52))+'" fill="none" stroke="'+esc(stroke)+'" stroke-width="'+num(e.strokeWidth,4)+'" stroke-linecap="round"/>');}
  else if(e.type==='text') out.push('<text x="'+num(e.x)+'" y="'+num(e.y)+'" text-anchor="'+esc(e.anchor||'start')+'" font-family="'+esc(e.fontFamily||'Arial,sans-serif')+'" font-size="'+num(e.fontSize,32)+'px" font-weight="'+esc(e.fontWeight||600)+'" fill="'+esc(fill)+'" opacity="'+(e.opacity??1)+'">'+esc(e.text)+'</text>');
 }
 const c=(spec.captions||[]).find(x=>t>=x.start&&t<x.end);
 if(c)out.push('<rect x="'+spec.width*.06+'" y="'+spec.height*.84+'" width="'+spec.width*.88+'" height="62" rx="10" fill="'+esc(col(spec.palette,'captionBg','#111'))+'" opacity=".78"/><text x="'+spec.width*.08+'" y="'+spec.height*.90+'" font-family="Arial,sans-serif" font-size="'+(spec.captionStyle?.fontSize||26)+'px" font-weight="700" fill="'+esc(col(spec.palette,'white','#fff'))+'">'+esc(c.text)+'</text>');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+spec.width+'" height="'+spec.height+'" viewBox="0 0 '+spec.width+' '+spec.height+'"><rect width="100%" height="100%" fill="'+esc(col(spec.palette,spec.background,'#F7F2E8'))+'"/>'+out.join('')+'</svg>';
}
