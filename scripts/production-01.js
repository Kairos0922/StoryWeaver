import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import text2wav from 'text2wav';
import {compileContentPlan} from '../src/compiler.js';
import {renderVideo} from '../src/render.js';
import {inspectVideo} from '../src/inspect.js';
import {validateDirectorPlan} from '../src/director.js';

const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'experiments','production-01-ai-video-is-not-ppt');
const out=path.join(root,'out','production-01');
const publicDir=path.join(root,'public','production','ai-video-is-not-ppt');
const tmp=path.join(root,'.production-01-build');
await fs.rm(tmp,{recursive:true,force:true});
await fs.rm(out,{recursive:true,force:true});
await fs.rm(publicDir,{recursive:true,force:true});
await fs.mkdir(tmp,{recursive:true});
await fs.mkdir(out,{recursive:true});
await fs.mkdir(publicDir,{recursive:true});

const plan=JSON.parse(await fs.readFile(path.join(dir,'content-plan.json'),'utf8'));
const director=JSON.parse(await fs.readFile(path.join(dir,'director-plan.json'),'utf8'));
validateDirectorPlan(director,{duration:plan.duration});
const spec=compileContentPlan(plan);
const base=path.join(tmp,'video.mp4');
await renderVideo(spec,base,{renderWidth:720});

async function run(args){await new Promise((resolve,reject)=>{const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error(err||('ffmpeg exited '+c))))})}

const narration=[
[0,'为什么很多 AI 视频，看起来像 PPT？'],
[5,'因为它做了画面，却没有真正做动作。'],
[11,'动画的最小单位，不是画面，而是变化。'],
[18,'看见，接近，触碰，反应。动作必须有因果。'],
[25,'镜头、节奏、声音，一起组织观众感受到的时间。'],
[32,'视频不是会动的 PPT，而是被时间组织的故事。']
];
const inputs=[],filters=[],labels=[];
for(let i=0;i<narration.length;i++){const start=narration[i][0],text=narration[i][1];const wav=path.join(tmp,'voice-'+i+'.wav');const bytes=await text2wav(text,{voice:'zh',speed:155,pitch:55,amplitude:100});await fs.writeFile(wav,Buffer.from(bytes));inputs.push('-i',wav);filters.push('['+i+':a]adelay='+start*1000+':all=1,volume=1.15[v'+i+']');labels.push('[v'+i+']');}
filters.push(labels.join('')+'amix=inputs='+narration.length+':duration=longest:dropout_transition=0:normalize=0[voice]');
const voice=path.join(tmp,'voice.m4a');
await run([...inputs,'-filter_complex',filters.join(';'),'-map','[voice]','-t','40','-ar','44100','-ac','2','-c:a','aac','-b:a','160k',voice]);

const music=path.join(tmp,'music.m4a');
await run(['-f','lavfi','-i','sine=frequency=130.81:sample_rate=44100:duration=40','-f','lavfi','-i','sine=frequency=164.81:sample_rate=44100:duration=40','-f','lavfi','-i','sine=frequency=196:sample_rate=44100:duration=40','-f','lavfi','-i','sine=frequency=261.63:sample_rate=44100:duration=40','-filter_complex','[0:a]volume=0.020,afade=t=in:st=0:d=2,afade=t=out:st=36:d=4[a0];[1:a]volume=0.014,afade=t=in:st=0:d=2,afade=t=out:st=36:d=4[a1];[2:a]volume=0.010,afade=t=in:st=0:d=2,afade=t=out:st=36:d=4[a2];[3:a]volume=0.007,afade=t=in:st=0:d=2,afade=t=out:st=36:d=4[a3];[a0][a1][a2][a3]amix=inputs=4:duration=longest:normalize=0,lowpass=f=1800[music]','-map','[music]','-ar','44100','-ac','2','-c:a','aac','-b:a','64k',music]);

const final=path.join(out,'ai-video-is-not-ppt.mp4');
await run(['-i',base,'-i',voice,'-i',music,'-filter_complex','[1:a]volume=1.0[v];[2:a]volume=0.32[m];[v][m]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]','-map','0:v:0','-map','[aout]','-t','40','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',final]);
const meta=await inspectVideo(final);
if(meta.ffmpegExit!==0||Math.abs(meta.duration-40)>0.1||meta.width!==1280||meta.height!==720||meta.fps<29)throw new Error('Production media contract failed: '+JSON.stringify(meta));

const index='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>为什么很多 AI 视频看起来像 PPT？</title><style>body{margin:0;background:#17332E;color:#F7F1E3;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans CJK SC",sans-serif}main{max-width:980px;margin:0 auto;padding:32px 20px 48px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1;margin:0 0 12px}p{color:#C9D6CF;font-size:16px}video{width:100%;display:block;border-radius:18px;background:#000;box-shadow:0 18px 60px #0006}.meta{margin-top:18px;padding:16px 18px;border:1px solid #35534B;border-radius:14px}</style></head><body><main><h1>为什么很多 AI 视频，看起来像 PPT？</h1><p>StoryWeaver 第一条生产级成片：用连续动作、因果链、镜头、节奏和声音来组织时间。</p><video controls playsinline preload="metadata" src="./ai-video-is-not-ppt.mp4"></video><div class="meta">40s · 1280×720 · 30fps · 中文旁白 · 程序化动画渲染</div></main></body></html>';
await fs.writeFile(path.join(publicDir,'index.html'),index);
await fs.copyFile(final,path.join(publicDir,'ai-video-is-not-ppt.mp4'));
await fs.writeFile(path.join(out,'production-manifest.json'),JSON.stringify({project:'production-01-ai-video-is-not-ppt',duration:meta.duration,width:meta.width,height:meta.height,fps:meta.fps,audio:'zh-TTS + synthesized music',status:'PASS'},null,2)+'\n');
console.log('PRODUCTION 01: PASS',JSON.stringify(meta));