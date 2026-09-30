import {clamp} from '../utils.js';
import {motionState,worldPosition} from './motion.js';

const DEFAULT_REACH=100;
const CONTACT_ACTIONS=new Set(['touch','grab','hit','push','tap','kick']);

export function elementId(e){
  return e.id??e.characterId??e.role??e.kind??null;
}

export function resolveElement(scene,ref){
  if(!ref)return null;
  return (scene.elements||[]).find(e=>e.id===ref)
    ??(scene.elements||[]).find(e=>e.characterId===ref)
    ??(scene.elements||[]).find(e=>e.role===ref)
    ??(scene.elements||[]).find(e=>e.type==='prop'&&e.kind===ref)
    ??null;
}

function basePoint(e,t,scene){
  const p=worldPosition(e,t,scene);
  return {x:p.x+p.state.dx,y:p.y+p.state.dy,scale:p.scale*p.state.scale};
}

function eventContactTime(scene,event){
  const at=event.interaction?.contactAt??1;
  return scene.start+event.start+(event.end-event.start)*at;
}

function responseAt(interaction,dt){
  const response=interaction.response;
  if(!response||response.type==='none')return {dx:0,dy:0,rotate:0,scale:1};
  const t=clamp(dt,0,response.duration??1);
  if(response.type==='impulse'){
    const gravity=response.gravity??0;
    return {
      dx:(response.vx??0)*t,
      dy:(response.vy??0)*t+0.5*gravity*t*t,
      rotate:(response.rotateSpeed??0)*t,
      scale:1
    };
  }
  return {
    dx:(response.dx??0)*clamp(t/Math.max(.001,response.duration??1),0,1),
    dy:(response.dy??0)*clamp(t/Math.max(.001,response.duration??1),0,1),
    rotate:(response.rotate??0)*clamp(t/Math.max(.001,response.duration??1),0,1),
    scale:response.scale??1
  };
}

export function validateSceneInteractions(scene){
  const elements=scene.elements||[];
  const ids=new Set();
  for(const e of elements){
    if(!e.id)continue;
    if(ids.has(e.id))throw new Error('Duplicate interactive element id '+e.id+' in '+scene.id);
    ids.add(e.id);
  }
  const events=scene.events||[];
  const eventMap=new Map(events.map(e=>[e.id,e]));
  const graph=new Map(events.map(e=>[e.id,[]]));
  for(const event of events){
    for(const child of event.interaction?.causes||[]){
      if(!graph.has(event.id)||!graph.has(child))continue;
      graph.get(event.id).push(child);
    }
    if(event.causedBy&&graph.has(event.causedBy)&&graph.has(event.id)){
      graph.get(event.causedBy).push(event.id);
    }
  }
  const visit=(id,stack=[])=>{
    if(stack.includes(id))throw new Error('Causal interaction cycle: '+[...stack,id].join(' -> '));
    const event=eventMap.get(id); if(!event)return;
    for(const child of new Set(graph.get(id)||[]))visit(child,[...stack,id]);
  };
  for(const event of events){
    visit(event.id);
    if(event.causedBy){
      const parent=eventMap.get(event.causedBy);
      if(!parent)throw new Error('Event '+event.id+' references unknown causedBy '+event.causedBy);
      if(event.start+scene.start < eventContactTime(scene,parent)-1e-6) throw new Error('Event '+event.id+' starts before cause '+parent.id+' contact');
    }
    const interaction=event.interaction;
    if(!interaction)continue;
    if(!event.actor||!event.target)throw new Error('Interaction '+event.id+' requires actor and target');
    if(!CONTACT_ACTIONS.has(interaction.type))throw new Error('Unsupported interaction type '+interaction.type);
    if(!Number.isFinite(interaction.contactAt)||interaction.contactAt<0||interaction.contactAt>1)throw new Error('Interaction '+event.id+' contactAt must be in [0,1]');
    const actor=resolveElement(scene,event.actor);
    const target=resolveElement(scene,event.target);
    if(!actor||actor.type!=='character')throw new Error('Interaction '+event.id+' actor not found as character: '+event.actor);
    if(!target||target.type!=='prop')throw new Error('Interaction '+event.id+' target not found as prop: '+event.target);
    const contactTime=eventContactTime(scene,event);
    const a=basePoint(actor,contactTime,scene);
    const b=basePoint(target,contactTime,scene);
    const targetRadius=(target.kind==='ball'?42:24)*(target.scale??1);
    const maxReach=(actor.scale??1)*DEFAULT_REACH+targetRadius;
    const distance=Math.hypot(b.x-a.x,b.y-a.y);
    if(distance>maxReach+1e-6)throw new Error('Interaction '+event.id+' contact is out of reach: '+distance.toFixed(2)+' > '+maxReach.toFixed(2));
    const caused=interaction.causes||[];
    for(const id of caused){
      const child=eventMap.get(id);
      if(!child)throw new Error('Interaction '+event.id+' causes unknown event '+id);
      if(child.causedBy!==event.id)throw new Error('Causal link mismatch: '+id+' must set causedBy '+event.id);
      if(child.start+scene.start<contactTime-1e-6)throw new Error('Caused event '+id+' starts before contact');
    }
  }
  return true;
}

export function interactionForActor(scene,t,actorRef){
  const actor=resolveElement(scene,actorRef);
  if(!actor)return null;
  const events=(scene.events||[]).filter(e=>e.interaction&&e.actor===actorRef&&t>=scene.start+e.start&&t<=scene.start+e.end);
  const event=events.at(-1);
  if(!event)return null;
  const target=resolveElement(scene,event.target);
  if(!target)return null;
  const contactTime=eventContactTime(scene,event);
  const preContact=clamp((t-(scene.start+event.start))/Math.max(.001,contactTime-(scene.start+event.start)),0,1);
  const afterContact=Math.max(0,t-contactTime);
  const targetContact=basePoint(target,contactTime,scene);
  const targetCurrent=basePoint(target,t,scene);
  const point=event.interaction.type==='grab'&&t>=contactTime?targetCurrent:basePoint(target,t,scene);
  const feedbackDuration=event.interaction.feedback?.duration??.28;
  const feedback=t>=contactTime?clamp(1-(t-contactTime)/Math.max(.001,feedbackDuration),0,1):0;
  return {
    event,
    target,
    contactAt:event.interaction.contactAt,
    contactTime,
    contactReached:t>=contactTime,
    reach:preContact,
    targetPoint:point,
    contactPoint:targetContact,
    feedback,
    afterContact
  };
}

export function interactionForTarget(scene,t,targetRef){
  const target=resolveElement(scene,targetRef);
  if(!target)return null;
  const candidates=(scene.events||[]).filter(e=>e.interaction&&e.target===targetRef&&t>=eventContactTime(scene,e));
  const event=candidates.at(-1);
  if(!event)return null;
  const dt=t-eventContactTime(scene,event);
  const response=responseAt(event.interaction,dt);
  const contactPoint=basePoint(target,eventContactTime(scene,event),scene);
  const feedbackDuration=event.interaction.feedback?.duration??.28;
  const feedback=t>=eventContactTime(scene,event)?clamp(1-dt/Math.max(.001,feedbackDuration),0,1):0;
  return {event,contactTime:eventContactTime(scene,event),dt,response,contactPoint,feedback};
}

export function contactFeedback(scene,t,palette){
  const items=[];
  for(const event of scene.events||[]){
    const interaction=event.interaction;
    if(!interaction)continue;
    const contactTime=eventContactTime(scene,event);
    const duration=interaction.feedback?.duration??.28;
    const age=t-contactTime;
    if(age<0||age>duration)continue;
    const q=clamp(age/Math.max(.001,duration),0,1);
    const point=basePoint(resolveElement(scene,event.target),contactTime,scene);
    const radius=(interaction.feedback?.radius??28)*(1+q*1.8);
    const opacity=(interaction.feedback?.opacity??.75)*(1-q);
    const color=palette?.[interaction.feedback?.color]??interaction.feedback?.color??palette?.accent??'#E66D5A';
    items.push('<g opacity="'+opacity+'"><circle cx="'+point.x+'" cy="'+point.y+'" r="'+radius+'" fill="none" stroke="'+color+'" stroke-width="'+(4-2*q)+'"/><path d="M '+(point.x-radius*.7)+' '+(point.y-radius*.1)+' L '+(point.x-radius*.95)+' '+(point.y-radius*.25)+' M '+(point.x+radius*.7)+' '+(point.y-radius*.1)+' L '+(point.x+radius*.95)+' '+(point.y-radius*.25)+' M '+point.x+' '+(point.y-radius*.7)+' L '+point.x+' '+(point.y-radius*.95)+'" stroke="'+color+'" stroke-width="3" stroke-linecap="round"/></g>');
  }
  return items.join('');
}
