import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import {frameSvg} from './renderers/svg.js';
export async function renderVideo(spec,output,{audio=null}={}){
 await fs.mkdir(new URL('.',new URL('file://'+output)).pathname,{recursive:true});
 const args=['-y','-f','image2pipe','-vcodec','png','-r',String(spec.fps),'-i','pipe:0'];
 if(audio)args.push('-i',audio);
 args.push('-c:v','libx264','-pix_fmt','yuv420p');
 if(audio)args.push('-shortest','-c:a','aac','-b:a','192k');
 args.push('-movflags','+faststart',output);
 const p=spawn(ffmpegPath,args,{stdio:['pipe','ignore','pipe']});let err='';
 p.stderr.on('data',d=>err+=d);
 const done=new Promise((res,rej)=>{p.on('error',rej);p.on('close',c=>c===0?res():rej(new Error('ffmpeg exited '+c+'\n'+err)))});
 for(let i=0;i<Math.round(spec.duration*spec.fps);i++){const png=await sharp(Buffer.from(frameSvg(spec,i/spec.fps))).png().toBuffer();if(!p.stdin.write(png))await new Promise(r=>p.stdin.once('drain',r));}
 p.stdin.end();await done;return output;
}
