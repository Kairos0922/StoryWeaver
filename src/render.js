import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import {Resvg} from '@resvg/resvg-js';
import {frameSvg} from './renderers/svg.js';

export async function renderVideo(spec,output,{audio=null}={}){
 await fs.mkdir(path.dirname(output),{recursive:true});
 const args=['-y','-f','image2pipe','-vcodec','png','-r',String(spec.fps),'-i','pipe:0'];
 if(audio)args.push('-i',audio);
 args.push('-c:v','libx264','-pix_fmt','yuv420p');
 if(audio)args.push('-shortest','-c:a','aac','-b:a','192k');
 args.push('-movflags','+faststart',output);
 const p=spawn(ffmpegPath,args,{stdio:['pipe','ignore','pipe']});
 let err='';
 p.stderr.on('data',d=>err+=d);
 const done=new Promise((resolve,reject)=>{p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error('ffmpeg exited '+c+'\n'+err)))});
 const pngCache=new Map();
 for(let i=0;i<Math.round(spec.duration*spec.fps);i++){
  const svg=frameSvg(spec,i/spec.fps);
  let png=pngCache.get(svg);
  if(!png){
   png=new Resvg(svg,{fitTo:{mode:'width',value:spec.width},font:{loadSystemFonts:true}}).render().asPng();
   pngCache.set(svg,png);
  }
  if(!p.stdin.write(png))await new Promise(r=>p.stdin.once('drain',r));
 }
 p.stdin.end();
 await done;
 return output;
}
