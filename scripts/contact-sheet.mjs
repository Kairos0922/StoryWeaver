import {spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import ffmpegPath from 'ffmpeg-static';

const input=process.argv[2];
const output=process.argv[3]||'out/contact-sheet.png';
if(!input) throw new Error('Usage: npm run contact-sheet -- <video.mp4> [output.png]');
await fs.mkdir(path.dirname(output),{recursive:true});
await new Promise((resolve,reject)=>{
 const p=spawn(ffmpegPath,['-y','-i',input,'-vf','fps=1,scale=320:-1,tile=5x4','-frames:v','1',output],{stdio:['ignore','ignore','pipe']});
 let err=''; p.stderr.on('data',d=>err+=d); p.on('error',reject);
 p.on('close',c=>c===0?resolve():reject(new Error(err||('ffmpeg exited '+c))));
});
console.log('CONTACT_SHEET_READY',output);
