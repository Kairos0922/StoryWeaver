#!/usr/bin/env node
// Renders review stills for one episode: <episode>/render/stills.json -> <episode>/stills/<id>.png.
// Stills only. This does not render video, call TTS, or open any gate.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectChars, embedFonts, launchBrowser, loadStyle, openPage, pageHtml, tmpDir} from './runtime.mjs';

export async function renderStills(episodeDir, {only} = {}) {
  const {style, spec} = await loadStyle(episodeDir);
  const shots = style.shots.filter(s => !only || s.id === only);
  const outDir = path.join(episodeDir, style.out_dir || 'stills');
  await fs.mkdir(outDir, {recursive: true});
  const tmp = await tmpDir('sw-stills-');
  const {css, report} = await embedFonts(collectChars(shots, spec.hud), path.join(tmp, 'fonts'));
  const html = await pageHtml({
    spec,
    css,
    data: {shots},
    boot: `window.__still = i => { const shot = window.__data.shots[i];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      SWKit.renderShot(ctx, window.__spec, shot, {t: shot.t ?? 0});
      return png(); };`,
  });
  const browser = await launchBrowser();
  const written = [];
  try {
    const page = await openPage(browser, html, spec);
    for (let i = 0; i < shots.length; i++) {
      const b64 = await page.evaluate(k => window.__still(k), i);
      const out = path.join(outDir, `${shots[i].id}.png`);
      await fs.writeFile(out, Buffer.from(b64, 'base64'));
      written.push(out);
    }
  } finally {
    await browser.close();
  }
  return {written, fonts: report};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, only] = process.argv.slice(2);
  if (!dir) {
    console.error('usage: node studio/render/kit/canvas/render_stills.mjs <episode-dir> [shot-id]');
    process.exit(1);
  }
  renderStills(path.resolve(dir), {only}).then(({written}) => {
    for (const f of written) console.log(f);
  }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
