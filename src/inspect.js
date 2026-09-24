import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

export async function inspectVideo(file){
 await fs.access(file);
 return await new Promise((resolve,reject)=>{
  const p=spawn(ffmpegPath,['-hide_banner','-i',file,'-f','null','-'],{stdio:['ignore','ignore','pipe']});
  let err='';p.stderr.on('data',d=>err+=d);
  p.on('error',reject);
  p.on('close',code=>{
   const duration=err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
   const video=err.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
   if(!duration||!video) return reject(new Error('Unable to inspect video metadata'));
   resolve({duration:Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]),width:Number(video[1]),height:Number(video[2]),ffmpegExit:code});
  });
 });
}
