import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const schema=JSON.parse(await fs.readFile(path.join(root,'specs/video.schema.json'),'utf8'));
const ajv=new Ajv2020({allErrors:true,strict:true});
const validate=ajv.compile(schema);

export function validateVideoSpec(spec){
 if(!validate(spec)) throw new Error('VideoSpec validation failed:\n'+validate.errors.map(e=>(e.instancePath||'/')+' '+e.message).join('\n'));
 const ids=new Set();
 for(const s of spec.scenes){
  if(ids.has(s.id))throw new Error('Duplicate scene id: '+s.id);
  ids.add(s.id);
  if(s.end<=s.start)throw new Error('Scene '+s.id+' must have positive duration');
  if(s.reads!=null&&!Array.isArray(s.reads))throw new Error('Scene '+s.id+' reads must be an array');
  const keyPoseIds=new Set();
  for(const p of s.keyPoses??[]){if(keyPoseIds.has(p.id))throw new Error('Duplicate key pose '+p.id+' in '+s.id);keyPoseIds.add(p.id);if(p.time<0||p.time>s.end-s.start)throw new Error('Key pose '+p.id+' is outside scene '+s.id);}
  const eventIds=new Set();
  for(const e of s.events??[]){if(eventIds.has(e.id))throw new Error('Duplicate event '+e.id+' in '+s.id);eventIds.add(e.id);if(e.end<=e.start)throw new Error('Event '+e.id+' must have positive duration');if(e.start<0||e.end>s.end-s.start)throw new Error('Event '+e.id+' is outside scene '+s.id);}
  if(s.start>spec.duration||s.end>spec.duration)throw new Error('Scene '+s.id+' exceeds duration');
  const transition=s.transition?.duration??0;
  if(transition>(s.end-s.start)/2)throw new Error('Scene '+s.id+' transition is too long');
 }
 for(let i=1;i<spec.scenes.length;i++){
  if(spec.scenes[i].start<spec.scenes[i-1].start) throw new Error('Scenes must be sorted by start time');
  if(spec.scenes[i].start>spec.scenes[i-1].end+1e-6) throw new Error('Scene timeline gap between '+spec.scenes[i-1].id+' and '+spec.scenes[i].id);
  if(spec.scenes[i].start<spec.scenes[i-1].end-1e-6) throw new Error('Scene timeline overlap between '+spec.scenes[i-1].id+' and '+spec.scenes[i].id);
 }
 if(Math.abs(spec.scenes.at(-1).end-spec.duration)>1e-6) throw new Error('Last scene end must equal duration');
 for(const c of spec.captions??[]) if(c.start<0||c.end>spec.duration||c.end<=c.start) throw new Error('Invalid caption timing');
 for(let i=1;i<(spec.beats??[]).length;i++) if(spec.beats[i].time<spec.beats[i-1].time) throw new Error('Beats must be sorted by time');
 return true;
}
