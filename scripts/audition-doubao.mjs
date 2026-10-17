// Local voice audition. This is NOT episode TTS: it does not touch lines.json or the fact-check
// gate. It spends three short synthesis calls. Set VOLC_TTS_API_KEY (or DOUBAO_TTS_API_KEY) in
// this shell, then:
//
//   node scripts/audition-doubao.mjs ../series/kitchen-science/audition
//
// Never pass a key on the command line or paste it into a chat.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAdapter} from '../studio/tts/adapters/doubao.mjs';

const outDir = path.resolve(process.argv[2] || 'audition');
const text = '奶白汤，白的不是钙。很多人以为，汤越白，钙越多。可骨头里的钙，很难溶进汤里。';
const voices = [
  ['xiaohe', 'zh_female_xiaohe_uranus_bigtts'],
  ['zhixing', 'zh_female_zhixingnv_uranus_bigtts'],
  ['jieshuo', 'zh_male_jieshuoxiaoming_uranus_bigtts'],
];

const tts = createAdapter();
await fs.mkdir(outDir, {recursive: true});
const rows = [];
for (const [slug, voice] of voices) {
  const result = await tts.synthesize({
    text,
    voice,
    emotion: 'calm',
    speechRate: -12,
    cacheDir: path.join(outDir, 'cache'),
    outFile: path.join(outDir, `${slug}.mp3`),
    usageFile: path.join(outDir, 'usage.jsonl'),
  });
  rows.push({slug, voice, ...result});
  console.log(`${slug}\t${voice}\t${result.file}\t${result.bytes}B\t${result.cached ? 'cached' : 'new'}`);
}
console.log(`\nListen: ${outDir}`);
