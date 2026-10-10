#!/usr/bin/env node
// Renders review stills for one episode: <episode>/render/stills.json -> <episode>/stills/<id>.png.
// Stills only. This does not render video, call TTS, or open any gate.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const kitPath = fileURLToPath(new URL('./kit.js', import.meta.url));

function page(kit, spec, shot) {
  const [w, h] = spec.size;
  const weights = [400, 700, 900].map(wt => `${wt} 40px ${spec.fonts.family}`);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden}canvas{display:block}</style></head>
<body><canvas id="c" width="${w}" height="${h}"></canvas>
<script>${kit}</script>
<script>
(async () => {
  const spec = ${JSON.stringify(spec)};
  const shot = ${JSON.stringify(shot)};
  for (const f of ${JSON.stringify(weights)}) await document.fonts.load(f, '看不见的规则0123456789%');
  const ctx = document.getElementById('c').getContext('2d');
  try { SWKit.renderShot(ctx, spec, shot); document.title = 'ok'; }
  catch (e) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, ${w}, ${h});
    ctx.fillStyle = '#000'; ctx.font = '48px sans-serif'; ctx.fillText('KIT ERROR: ' + (e && e.message), 60, 120);
    document.title = 'error';
  }
})();
</script></body></html>`;
}

export async function renderStills(episodeDir, {chrome = process.env.CHROME || 'google-chrome-stable', only} = {}) {
  const spec = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'stills.json'), 'utf8'));
  const kit = await fs.readFile(kitPath, 'utf8');
  const outDir = path.join(episodeDir, spec.out_dir || 'stills');
  await fs.mkdir(outDir, {recursive: true});
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-stills-'));
  const written = [];
  for (const shot of spec.shots) {
    if (only && shot.id !== only) continue;
    const html = path.join(tmp, `${shot.id}.html`);
    await fs.writeFile(html, page(kit, spec, shot));
    const out = path.join(outDir, `${shot.id}.png`);
    const [w, h] = spec.size;
    const run = spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      '--force-device-scale-factor=1', `--window-size=${w},${h}`,
      `--user-data-dir=${path.join(tmp, 'profile')}`, '--no-first-run',
      '--virtual-time-budget=8000', '--run-all-compositor-stages-before-draw',
      `--screenshot=${out}`, `file://${html}`,
    ], {encoding: 'utf8', timeout: 60_000});
    if (run.status !== 0) throw new Error(`chrome failed for ${shot.id}: ${run.error?.message || run.stderr}`);
    written.push(out);
  }
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, only] = process.argv.slice(2);
  if (!dir) {
    console.error('usage: node studio/render/kit/canvas/render_stills.mjs <episode-dir> [shot-id]');
    process.exit(1);
  }
  renderStills(path.resolve(dir), {only}).then(files => {
    for (const f of files) console.log(f);
  }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
