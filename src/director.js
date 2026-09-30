import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const schema=JSON.parse(await fs.readFile(path.join(root,'specs/director-plan.schema.json'),'utf8'));
const ajv=new Ajv2020({allErrors:true,strict:true});
const validate=ajv.compile(schema);

export function validateDirectorPlan(plan,{duration=null}={}){
  if(!validate(plan)) throw new Error('DirectorPlan validation failed:\n'+validate.errors.map(e=>(e.instancePath||'/')+' '+e.message).join('\n'));
  const beats=plan.beatSheet, shots=plan.shotList;
  const beatIds=new Set(beats.map(b=>b.id));
  if(new Set(beats.map(b=>b.id)).size!==beats.length) throw new Error('Duplicate beat id');
  if(new Set(shots.map(s=>s.id)).size!==shots.length) throw new Error('Duplicate shot id');
  for(let i=1;i<beats.length;i++) if(beats[i].start<beats[i-1].start) throw new Error('Beat sheet must be sorted');
  for(let i=1;i<shots.length;i++) if(shots[i].start<shots[i-1].start) throw new Error('Shot list must be sorted');
  for(const b of beats){
    if(b.end<=b.start) throw new Error('Beat '+b.id+' has invalid duration');
    if(duration!=null && b.end>duration) throw new Error('Beat '+b.id+' exceeds duration');
  }
  for(let i=0;i<shots.length;i++){
    const s=shots[i];
    if(!beatIds.has(s.beatId)) throw new Error('Shot '+s.id+' references unknown beat '+s.beatId);
    if(s.end<=s.start) throw new Error('Shot '+s.id+' has invalid duration');
    if(i && s.start>shots[i-1].end+1e-6) throw new Error('Shot gap before '+s.id);
    if(i && s.start<shots[i-1].end-1e-6) throw new Error('Shot overlap at '+s.id);
    if(s.startState.trim()===s.endState.trim()) throw new Error('Shot '+s.id+' has no state change');
  }
  for(const b of beats) if(!shots.some(s=>s.beatId===b.id && s.start>=b.start-1e-6 && s.end<=b.end+1e-6)) throw new Error('Beat '+b.id+' has no covered shot');
  if(duration!=null && Math.abs(shots[0].start)>1e-6) throw new Error('Shot list must start at 0');
  if(duration!=null && Math.abs(shots.at(-1).end-duration)>1e-6) throw new Error('Shot list must end at duration');
  return true;
}
