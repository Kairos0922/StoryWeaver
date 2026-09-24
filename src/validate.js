import Ajv from 'ajv';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const schema=JSON.parse(await fs.readFile(path.join(root,'specs/video.schema.json'),'utf8'));
const ajv=new Ajv({allErrors:true,strict:true});
const validate=ajv.compile(schema);

export function validateVideoSpec(spec){
 if(!validate(spec)) throw new Error('VideoSpec validation failed:\n'+validate.errors.map(e=>(e.instancePath||'/')+' '+e.message).join('\n'));
 const ids=new Set();
 for(const s of spec.scenes){
  if(ids.has(s.id))throw new Error('Duplicate scene id: '+s.id);
  ids.add(s.id);
  if(s.end<=s.start)throw new Error('Scene '+s.id+' must have positive duration');
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
