#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateVideoSpec} from './validate.js';
import {renderVideo} from './render.js';
const [cmd,...args]=process.argv.slice(2);
const flag=n=>{const i=args.indexOf(n);return i<0?null:args[i+1]??null};
async function main(){
 if(cmd==='validate'){const f=args[0];const s=JSON.parse(await fs.readFile(f,'utf8'));validateVideoSpec(s);console.log('VALID '+f);return}
 if(cmd==='render'){const f=args[0],out=flag('--out')||'out/video.mp4',audio=flag('--audio');const s=JSON.parse(await fs.readFile(f,'utf8'));validateVideoSpec(s);await renderVideo(s,path.resolve(out),{audio:audio?path.resolve(audio):null});console.log('RENDERED '+path.resolve(out));return}
 if(cmd==='lint'){console.log('StoryWeaver structural lint: use npm test and npm run validate');return}
 console.log('StoryWeaver\n  validate <spec.json>\n  render <spec.json> --out <video.mp4> [--audio <audio>]\n  lint');
}
main().catch(e=>{console.error(e.message);process.exit(1)});
