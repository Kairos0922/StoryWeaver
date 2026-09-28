import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import text2wav from 'text2wav';
import {compileContentPlan} from '../src/compiler.js';
import {renderVideo} from '../src/render.js';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'public','experiments','t01-english-colors');
const tmp=path.join(root,'.t01-vercel-build');
await fs.rm(tmp,{recursive:true,force:true});
await fs.mkdir(tmp,{recursive:true});
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});

const plan=JSON.parse(await fs.readFile(path.join(root,'experiments/t01-english-colors/content-plan.json'),'utf8'));
const spec=compileContentPlan(plan);
const base=path.join(tmp,'video.mp4');
await renderVideo(spec,base);

const lines=[
  [0,"Oh! My little car is gone."],
  [10,"Milo looks under the red cushion."],
  [14,"Is it here? No. A red ball."],
  [22,"Look! A blue box."],
  [26,"It's blue. Open, open..."],
  [30,"No car."],
  [34,"What's that? A yellow umbrella."],
  [40,"It's yellow. Hmm..."],
  [46,"Wait! Look! Little tracks."],
  [50,"Let's follow them."],
  [58,"A red ball! It's red."],
  [63,"But where is my car?"],
  [70,"There it is!"],
  [73,"My red car! I found it!"],
  [82,"Let's go!"],
  [86,"Zoom!"]
];

async function run(args){
  await new Promise((resolve,reject)=>{
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err='';
    p.stderr.on('data',d=>err+=d);
    p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(new Error(err||('ffmpeg exited '+code))));
  });
}

const voiceInputs=[];
const voiceFilters=[];
const labels=[];
for(let i=0;i<lines.length;i++){
  const [start,text]=lines[i];
  const wav=path.join(tmp,String(i).padStart(2,'0')+'.wav');
  const outWav=await text2wav(text,{voice:'en',speed:135,pitch:58,amplitude:100});
  await fs.writeFile(wav,Buffer.from(outWav));
  voiceInputs.push('-i',wav);
  voiceFilters.push(`[${i}:a]adelay=${start*1000}:all=1[a${i}]`);
  labels.push(`[a${i}]`);
}
voiceFilters.push(`${labels.join('')}amix=inputs=${lines.length}:duration=longest:dropout_transition=0:normalize=0[voice]`);
const voice=path.join(tmp,'voice.m4a');
await run([...voiceInputs,'-filter_complex',voiceFilters.join(';'),'-map','[voice]','-t','90','-ar','44100','-ac','2','-c:a','aac','-b:a','160k',voice]);

const music=path.join(tmp,'music.m4a');
await run([
  '-f','lavfi','-i','sine=frequency=261.63:sample_rate=44100:duration=90',
  '-f','lavfi','-i','sine=frequency=329.63:sample_rate=44100:duration=90',
  '-f','lavfi','-i','sine=frequency=392:sample_rate=44100:duration=90',
  '-filter_complex','[0:a]volume=0.010[a0];[1:a]volume=0.008[a1];[2:a]volume=0.006[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,afade=t=in:st=0:d=2,afade=t=out:st=86:d=4[music]',
  '-map','[music]','-ar','44100','-ac','2','-c:a','aac','-b:a','64k',music
]);

const final=path.join(out,'milos-color-hunt.mp4');
await run([
  '-i',base,'-i',voice,'-i',music,
  '-filter_complex','[1:a]volume=1.0[v];[2:a]volume=0.45[m];[v][m]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]',
  '-map','0:v:0','-map','[aout]','-t','90',
  '-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',final
]);

await fs.copyFile(path.join(root,'experiments/t01-english-colors/index.html'),path.join(out,'index.html'));
await fs.rm(tmp,{recursive:true,force:true});
console.log('VERCEL_T01_READY',final);
