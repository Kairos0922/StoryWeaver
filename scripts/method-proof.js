import fs from 'node:fs/promises';
import path from 'node:path';
import {validateVideoSpec} from '../src/validate.js';
import {renderVideo} from '../src/render.js';
import {inspectVideo} from '../src/inspect.js';

const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'experiments','method-proof');
const out=path.join(root,'out','method-proof');
await fs.mkdir(out,{recursive:true});

async function load(name){
  return JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
}
const r0=await load('revision-0.json');
const r1=await load('revision-1.json');
validateVideoSpec(r0);
validateVideoSpec(r1);

const metrics=s=>({
  scenes:s.scenes.length,
  keyPoses:s.scenes.reduce((n,x)=>n+(x.keyPoses?.length??0),0),
  events:s.scenes.reduce((n,x)=>n+(x.events?.length??0),0),
  phases:s.scenes.flatMap(x=>x.events??[]).map(x=>x.phase)
});
const a=metrics(r0),b=metrics(r1);
if(b.keyPoses<=a.keyPoses||b.events<=a.events) throw new Error('Revision 1 did not increase explicit action/state detail');

for(const [label,spec] of [['revision-0',r0],['revision-1',r1]]){
  const file=path.join(out,label+'.mp4');
  await renderVideo(spec,file,{renderWidth:640});
  const meta=await inspectVideo(file);
  if(meta.ffmpegExit!==0) throw new Error(label+' media inspection failed');
  if(Math.abs(meta.duration-12)>0.1||meta.width!==1280||meta.height!==720) throw new Error(label+' media contract failed: '+JSON.stringify(meta));
}
await fs.writeFile(path.join(out,'review-manifest.json'),JSON.stringify({
  experiment:'method-proof',
  revision0:a,
  revision1:b,
  requiredLoop:['plan','render','inspect','critique','structured-repair','rerender'],
  status:'PASS'
},null,2)+'\n');
console.log('METHOD PROOF: PASS');
console.log(JSON.stringify({revision0:a,revision1:b},null,2));
