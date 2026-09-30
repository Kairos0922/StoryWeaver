import fs from 'node:fs/promises';
import path from 'node:path';
import {validateDirectorPlan} from '../src/director.js';

const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'experiments','production-01-ai-video-is-not-ppt');
const plan=JSON.parse(await fs.readFile(path.join(dir,'content-plan.json'),'utf8'));
const director=JSON.parse(await fs.readFile(path.join(dir,'director-plan.json'),'utf8'));
validateDirectorPlan(director,{duration:plan.duration});
console.log('PRODUCTION PROTOCOL: PASS',JSON.stringify({
  beats:director.beatSheet.length,
  shots:director.shotList.length,
  timelineEvents:director.timeline.events.length
}));
