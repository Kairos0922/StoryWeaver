import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Resvg} from '@resvg/resvg-js';
import ffmpegPath from 'ffmpeg-static';
import text2wav from 'text2wav';
import {compileContentPlan} from '../src/compiler.js';
import {renderVideo} from '../src/render.js';
import {frameSvg} from '../src/renderers/svg.js';
import {interactionForActor,interactionForTarget} from '../src/animation/interaction.js';
import {actingState,poseState} from '../src/animation/acting.js';
import {motionState} from '../src/animation/motion.js';
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
const causal=spec.scenes.find(s=>s.id==='causal');
const touch=causal.events.find(e=>e.id==='touch');
const contactTime=causal.start+touch.start+(touch.end-touch.start)*touch.interaction.contactAt;
const actor=causal.elements.find(e=>e.id==='host');
const actorStateAtContact=interactionForActor(causal,contactTime,'host');
if(!actorStateAtContact?.contactReached)throw new Error('Production interaction contract failed: contact state is not reached');
const actorMotionState=actor?motionState(actor,contactTime,causal):null;
const actingAtContact=actingState(touch,contactTime,causal,actorStateAtContact);
const poseAtContact=poseState(actingAtContact,{targetPoint:actorStateAtContact.targetPoint,originX:actor.x+actorMotionState.dx,originY:actor.y+actorMotionState.dy,actorScale:actor.scale*actorMotionState.scale,direction:actor.direction??1});
const handX=actor.x+actorMotionState.dx+poseAtContact.rightHandX*actor.scale*actorMotionState.scale;
const handY=actor.y+actorMotionState.dy+poseAtContact.bodyY+poseAtContact.rightHandY*actor.scale*actorMotionState.scale;
const contactDistance=Math.hypot(handX-actorStateAtContact.contactPoint.x,handY-actorStateAtContact.contactPoint.y);
if(contactDistance>0.01)throw new Error('Production interaction contact alignment failed: '+contactDistance);
const targetBefore=interactionForTarget(causal,contactTime-1/30,'ball');
const targetAfter=interactionForTarget(causal,contactTime+0.25,'ball');
if(targetBefore!==null||!targetAfter||targetAfter.response.dx<=0)throw new Error('Production interaction target response failed');
const base=path.join(tmp,'video.mp4');
await renderVideo(spec,base,{renderWidth:720});
const reviewDir=path.join(out,'interaction-review');
await fs.mkdir(reviewDir,{recursive:true});
for(const [label,time] of [['pre-contact',contactTime-1/spec.fps],['contact',contactTime],['post-contact',contactTime+0.25]]){
  const svg=frameSvg(spec,time);
  await fs.writeFile(path.join(reviewDir,label+'.svg'),svg);
  await fs.writeFile(path.join(reviewDir,label+'.png'),new Resvg(svg,{fitTo:{mode:'width',value:720},font:{loadSystemFonts:true}}).render().asPng());
  await fs.writeFile(path.join(reviewDir,label+'-phone.png'),new Resvg(svg,{fitTo:{mode:'width',value:390},font:{loadSystemFonts:true}}).render().asPng());
}
await fs.writeFile(path.join(reviewDir,'interaction-review.json'),JSON.stringify({
  scene:'causal',event:'touch',contactTime,contactPoint:actorStateAtContact.contactPoint,
  handPoint:{x:handX,y:handY},contactDistance,feedbackAtContact:actorStateAtContact.feedback,
  targetResponseAfter250ms:targetAfter.response,causedBy:'touch'
},null,2)+'\\n');

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

const index='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>为什么很多 AI 视频看起来像 PPT？</title><style>body{margin:0;background:#17332E;color:#F7F1E3;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans CJK SC",sans-serif}main{max-width:980px;margin:0 auto;padding:32px 20px 48px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1;margin:0 0 12px}p{color:#C9D6CF;font-size:16px}video{width:100%;display:block;border-radius:18px;background:#000;box-shadow:0 18px 60px #0006}.meta{margin-top:18px;padding:16px 18px;border:1px solid #35534B;border-radius:14px}</style></head><body><main><h1>为什么很多 AI 视频，看起来像 PPT？</h1><p>StoryWeaver 第一条生产级成片：用连续动作、因果链、镜头、节奏和声音来组织时间。</p><video controls playsinline preload="metadata" src="./ai-video-is-not-ppt.mp4"></video><div class="meta">40s · 1280×720 · 30fps · 中文旁白 · 程序化动画渲染 · <a href="./review.html">逐帧交互审查</a></div></main></body></html>';
const reviewHtml=\`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>StoryWeaver Production-01 Review</title><style>body{margin:0;background:#101915;color:#f7f1e3;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1100px;margin:auto;padding:28px 18px 60px}h1{margin:0 0 8px;font-size:clamp(26px,4vw,42px)}p{color:#bfcac4}.panel{background:#17241f;border:1px solid #34483f;border-radius:16px;padding:16px;margin:16px 0}video{width:100%;display:block;border-radius:14px;background:#000}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.row button{padding:8px 12px;border-radius:9px;border:1px solid #50665b;background:#21332c;color:#fff;cursor:pointer}input[type=range]{width:100%}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.meta div{padding:10px 12px;background:#20302a;border-radius:10px}pre{white-space:pre-wrap;word-break:break-word}</style></head><body><main><h1>Production-01 · Interaction Review</h1><p>Frame-step review: approach → contact → feedback → target response → character reaction.</p><div class="panel"><video id="video" controls playsinline preload="metadata" src="./ai-video-is-not-ppt.mp4"></video><div class="row" style="margin-top:10px"><button id="prev">−1 frame</button><button id="next">+1 frame</button><button id="jump">jump to contact</button><span id="time">0.000s</span></div><input id="scrub" type="range" min="0" max="40" step="0.033333" value="0"></div><div class="panel"><h2>Contact diagnostics</h2><div class="meta"><div><strong>Contact</strong><br>\${contactTime.toFixed(3)}s</div><div><strong>Contact distance</strong><br>\${contactDistance.toFixed(3)} px</div><div><strong>Target Δx @ +250ms</strong><br>\${targetAfter.response.dx.toFixed(2)} px</div><div><strong>Feedback at contact</strong><br>\${actorStateAtContact.feedback.toFixed(2)}</div></div></div><div class="panel"><h2>Manual checks</h2><pre>1. Step one frame before contact.
2. Confirm hand and ball meet at the contact frame.
3. Confirm feedback appears on/after contact.
4. Confirm the ball begins its impulse response only after contact.
5. Confirm the character reaction starts immediately after the contact handoff.
6. Check that camera motion does not hide the causal event.</pre></div><script>const video=document.querySelector('#video');const scrub=document.querySelector('#scrub');const time=document.querySelector('#time');const fps=30;const contact=\${contactTime};function sync(){scrub.value=video.currentTime;time.textContent=video.currentTime.toFixed(3)+'s'}video.addEventListener('timeupdate',sync);scrub.addEventListener('input',()=>{video.currentTime=Number(scrub.value)});document.querySelector('#prev').addEventListener('click',()=>{video.pause();video.currentTime=Math.max(0,video.currentTime-1/fps)});document.querySelector('#next').addEventListener('click',()=>{video.pause();video.currentTime=Math.min(video.duration||40,video.currentTime+1/fps)});document.querySelector('#jump').addEventListener('click',()=>{video.pause();video.currentTime=contact});</script></main></body></html>\`;
await fs.writeFile(path.join(publicDir,'review.html'),reviewHtml);
await fs.writeFile(path.join(publicDir,'index.html'),index);
await fs.copyFile(final,path.join(publicDir,'ai-video-is-not-ppt.mp4'));
await new Promise((resolve,reject)=>{const p=spawn(ffmpegPath,['-y','-i',final,'-vf','fps=1,scale=320:-1,tile=5x8','-frames:v','1',path.join(reviewDir,'contact-sheet.png')],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(err||('contact sheet ffmpeg exited '+code))))});
await fs.writeFile(path.join(out,'production-manifest.json'),JSON.stringify({project:'production-01-ai-video-is-not-ppt',duration:meta.duration,width:meta.width,height:meta.height,fps:meta.fps,audio:'zh-TTS + synthesized music',status:'PASS',interaction:{event:'touch',contactTime,contactDistance,targetDxAfter250ms:targetAfter.response.dx}},null,2)+'\n');
console.log('PRODUCTION 01: PASS',JSON.stringify(meta));