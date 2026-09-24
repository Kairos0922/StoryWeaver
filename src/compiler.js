import Ajv from 'ajv';
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateVideoSpec} from './validate.js';

const root=path.resolve(import.meta.dirname,'..');
const planSchema=JSON.parse(await fs.readFile(path.join(root,'specs/content-plan.schema.json'),'utf8'));
const ajv=new Ajv({allErrors:true,strict:true});
const validatePlan=ajv.compile(planSchema);

export function compileContentPlan(plan){
  if(!validatePlan(plan)) throw new Error('ContentPlan validation failed:\n'+validatePlan.errors.map(e=>(e.instancePath||'/')+' '+e.message).join('\n'));
  const claimIds=new Set(plan.claims.map(c=>c.id));
  for(const scene of plan.scenes) for(const ref of scene.semanticRefs) if(!claimIds.has(ref)) throw new Error('Scene '+scene.id+' references unknown claim '+ref);
  const ids=new Set();
  for(const scene of plan.scenes){if(ids.has(scene.id))throw new Error('Duplicate scene id: '+scene.id);ids.add(scene.id);}
  for(let i=1;i<plan.scenes.length;i++) if(plan.scenes[i].start<plan.scenes[i-1].start) throw new Error('Scenes must be sorted by start time');
  const spec={
    schemaVersion:'0.3',
    width:plan.output?.width??1280,
    height:plan.output?.height??720,
    fps:plan.output?.fps??30,
    duration:plan.duration,
    background:plan.style?.background??'#F7F2E8',
    palette:plan.style?.palette??{ink:'#17221E',accent:'#D97745',secondary:'#5A8F8A',paper:'#F7F2E8',captionBg:'#17221E',white:'#fff'},
    captionStyle:plan.captionStyle??{fontSize:26},
    beats:plan.beats??[],
    scenes:plan.scenes,
    captions:plan.captions??[]
  };
  validateVideoSpec(spec);
  return spec;
}
