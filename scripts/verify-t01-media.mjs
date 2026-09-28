import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const file=process.argv[2];
if(!file) throw new Error('usage: verify-t01-media.mjs <video.mp4>');
await fs.access(file);

function run(args){
  return new Promise((resolve,reject)=>{
    const p=spawn(ffmpegPath,args,{stdio:['ignore','ignore','pipe']});
    let err='';
    p.stderr.on('data',d=>err+=d);
    p.on('error',reject);
    p.on('close',code=>resolve({code,err}));
  });
}

const probe=await run(['-hide_banner','-i',file,'-f','null','-']);
const duration=probe.err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
const video=probe.err.match(/Video:.*?(\d{2,5})x(\d{2,5}).*?(\d+(?:\.\d+)?) fps/);
const audio=probe.err.match(/Audio: ([^,\s]+)/);
if(!duration||!video||!audio) throw new Error('Unable to inspect final media streams');
const seconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]);
const width=Number(video[1]),height=Number(video[2]),fps=Number(video[3]);
if(width!==1280||height!==720) throw new Error(`Unexpected video size: ${width}x${height}`);
if(Math.abs(seconds-90)>0.5) throw new Error(`Unexpected duration: ${seconds}`);
if(Math.abs(fps-30)>0.01) throw new Error(`Unexpected frame rate: ${fps}`);
if(audio[1]!=='aac') throw new Error(`Unexpected audio codec: ${audio[1]}`);

const loud=await run(['-hide_banner','-i',file,'-af','volumedetect','-f','null','-']);
const mean=loud.err.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/);
if(!mean) throw new Error('Unable to measure audio volume');
const meanDb=Number(mean[1]);
if(meanDb < -35) throw new Error(`Audio is effectively silent: ${meanDb} dB`);

const decode=await run(['-hide_banner','-loglevel','error','-i',file,'-f','null','-']);
if(decode.code!==0) throw new Error('Final MP4 failed full decode');

console.log(JSON.stringify({file,duration:seconds,width,height,fps,audioCodec:audio[1],meanVolumeDb:meanDb,decode:'ok'},null,2));
