// Cover readability, measured on rendered glyph pixels at phone-thumbnail size (320 px wide).
//
// Declared colors lie: EP03's first cover declared an ink title, compared that against a
// background patch and passed (4.85:1), while the real glyphs were ink fill inside an ink outline
// over red cars, an unreadable blob. So we render the cover doc through the same kit, four ways
// per text layer, and measure what a viewer sees:
//   K1 / K2  layer fill painted in two key colors, outline removed → pixels that differ are the
//            glyph fill (coverage = |K1−K2| / |key1−key2|), no guessing about fonts or AA;
//   full     the real cover;
//   bare     the cover without the layer → what sits behind the text.
// At 320 px: F = real color over fully covered glyph pixels; edge = pixels the layer paints that
// are not glyph (outline or plate), else the background right around the glyphs; B = bare pixels
// there. A layer passes when fill vs edge contrast meets the bar (titles 4.5:1, other text 3:1;
// a percentile over edge pixels, not a declared color) and the whole text block still separates from what is behind it.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {resolveEpisodeFonts} from '../render/kit/fonts/library.mjs';
import {collectChars, embedFonts, launchBrowser, loadStyle, openPage, pageHtml, tmpDir} from '../render/kit/canvas/runtime.mjs';

export const THUMB_WIDTH = 320;
// Text-bearing layer types: which field holds the glyph fill color and which the outline width.
export const TEXT_LAYERS = {label: {fill: 'color', outline: 'outline'}, tag: {fill: 'text_color'}};
const KEY1 = '#FF00FF', KEY2 = '#00FF00';

export function contrastRatio(a, b) {
  const lum = ([r, g, bl]) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export async function coverDoc(episodeDir) {
  try {
    return JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'cover.json'), 'utf8'));
  } catch {
    const scenes = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'scenes.json'), 'utf8'));
    if (!scenes.cover) throw Object.assign(new Error('no cover: add render/cover.json or scenes.json "cover"'), {code: 'COVER_MISSING'});
    return scenes.cover;
  }
}

function variants(doc) {
  const out = [{name: 'full', doc}];
  doc.layers.forEach((layer, i) => {
    const t = TEXT_LAYERS[layer.type];
    if (!t || !layer.text) return;
    const without = {...doc, layers: doc.layers.filter((_, j) => j !== i)};
    const keyed = color => ({...doc, layers: doc.layers.map((l, j) => (j === i ? {...l, [t.fill]: color, ...(t.outline ? {[t.outline]: 0} : {})} : l))});
    out.push({name: `bare_${i}`, doc: without}, {name: `k1_${i}`, doc: keyed(KEY1)}, {name: `k2_${i}`, doc: keyed(KEY2)});
  });
  return out;
}

// Paint the variants with the episode's own kit, style, fonts and post preset.
export async function renderCoverVariants(episodeDir, doc, outDir) {
  const {spec} = await loadStyle(episodeDir);
  const tmp = await tmpDir('sw-cover-');
  const {overrides} = await resolveEpisodeFonts(episodeDir);
  const {css} = await embedFonts(collectChars(doc, spec.hud), path.join(tmp, 'fonts'), overrides);
  const list = variants(doc);
  const html = await pageHtml({spec, css, data: {docs: list.map(v => v.doc)}, boot: `window.__paint = async i => {
    const d = window.__data.docs[i];
    await SWCompose.paintStill(ctx, window.__spec, d, {t: d.t ?? 1, fps: 30, review: 'release', presetName: d.post || 'explainer', presets: window.__postPresets});
    return png();
  };`});
  const browser = await launchBrowser();
  const files = {};
  try {
    const page = await openPage(browser, html, spec);
    for (let i = 0; i < list.length; i++) {
      const file = path.join(outDir, `${list[i].name}.png`);
      await fs.writeFile(file, Buffer.from(await page.evaluate(k => window.__paint(k), i), 'base64'));
      files[list[i].name] = file;
    }
  } finally {
    await browser.close();
    await fs.rm(tmp, {recursive: true, force: true});
  }
  return {files, width: spec.size[0], height: spec.size[1]};
}

function thumbPixels(png, width = THUMB_WIDTH) {
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', png]).toString().trim().split(',').map(Number);
  const height = Math.round(probe[1] * width / probe[0]);
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', png, '-vf', `scale=${width}:${height}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 64 * 1024 * 1024});
  return {buf, width, height};
}

const px = (buf, i) => [buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mean = list => list.length ? [0, 1, 2].map(c => list.reduce((s, p) => s + p[c], 0) / list.length) : null;
const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

// Pure measurement on thumbnail buffers, so it is unit-testable.
export function measureLayer({full, bare, k1, k2, width, height}, {minRatio}) {
  const keyDist = dist([255, 0, 255], [0, 255, 0]);
  const n = width * height;
  const coverage = new Float32Array(n);
  for (let i = 0; i < n; i++) coverage[i] = Math.min(1, dist(px(k1, i), px(k2, i)) / keyDist);
  const core = [], edge = [], behind = [];
  const near = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (coverage[i] < 0.15) continue;
    const x = i % width, y = (i / width) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < width && yy < height) near[yy * width + xx] = 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (coverage[i] >= 0.8) core.push(i);
    else if (coverage[i] < 0.15) {
      const painted = dist(px(full, i), px(bare, i)) > 24; // outline / plate pixels of this layer
      if (painted) edge.push(i);
      if (near[i]) behind.push(i);
    }
  }
  if (!core.length) return {ok: false, detail: 'no glyph pixels survive at thumbnail size (text too small)', core: 0};
  const F = mean(core.map(i => px(full, i)));
  const outline = edge.filter(i => near[i]);
  const usesOutline = outline.length >= core.length * 0.15;
  const edgePixels = usesOutline ? outline.map(i => px(full, i)) : behind.map(i => px(bare, i));
  const ratios = edgePixels.map(p => contrastRatio(F, p));
  // Outline/plate: median (its thumbnail pixels blend with the glyph and the page at the edges).
  // Background: 20th percentile, so a busy patch behind part of the word is not averaged away.
  const q = usesOutline ? 0.5 : 0.2;
  const fillVsEdge = pct(ratios, q);
  const E = mean(edgePixels);
  const B = mean(behind.map(i => px(bare, i)));
  const block = mean([...core.map(i => px(full, i)), ...outline.map(i => px(full, i))]);
  const silhouette = B && usesOutline ? Math.max(contrastRatio(E, B), contrastRatio(F, B)) : fillVsEdge;
  const problems = [];
  if (fillVsEdge < minRatio) problems.push(`glyph fill vs ${usesOutline ? 'its outline/plate' : 'background'} ${fillVsEdge.toFixed(2)}:1 < ${minRatio}:1 (fill ${F.map(Math.round)} vs ${usesOutline ? 'outline' : 'bg'} ${E.map(Math.round)})`);
  if (usesOutline && silhouette < 1.5) problems.push(`text block does not separate from what is behind it (${silhouette.toFixed(2)}:1)`);
  return {
    ok: problems.length === 0,
    detail: problems.join('; ') || `fill vs ${usesOutline ? 'outline' : 'bg'} ${fillVsEdge.toFixed(2)}:1 (p${q * 100}) ≥ ${minRatio}:1`,
    fill: F.map(Math.round), edge: E && E.map(Math.round), behind: B && B.map(Math.round), block: block && block.map(Math.round),
    edge_kind: usesOutline ? 'outline_or_plate' : 'background',
    fill_vs_edge: +fillVsEdge.toFixed(2), percentile: q * 100, silhouette: +silhouette.toFixed(2), glyph_pixels: core.length,
  };
}

export async function checkCover(episodeDir, outDir, {thumbWidth = THUMB_WIDTH} = {}) {
  await fs.mkdir(outDir, {recursive: true});
  const doc = await coverDoc(episodeDir);
  const work = path.join(outDir, '.cover-variants');
  await fs.mkdir(work, {recursive: true});
  const {files} = await renderCoverVariants(episodeDir, doc, work);
  const cover = path.join(outDir, 'cover.png');
  await fs.copyFile(files.full, cover);
  const thumb = path.join(outDir, `cover_${thumbWidth}.png`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', cover, '-vf', `scale=${thumbWidth}:-2:flags=area`, thumb]);
  const full = thumbPixels(files.full, thumbWidth);
  const texts = doc.layers.map((l, i) => ({l, i})).filter(({l}) => TEXT_LAYERS[l.type] && l.text);
  if (!texts.length) {
    await fs.rm(work, {recursive: true, force: true});
    return {ok: false, cover, thumb, layers: [], detail: 'cover has no text layer (label/tag) to read'};
  }
  const title = texts.reduce((a, b) => ((b.l.size ?? 0) > (a.l.size ?? 0) ? b : a));
  const layers = texts.map(({l, i}) => {
    const minRatio = i === title.i ? 4.5 : 3;
    const m = measureLayer({full: full.buf, bare: thumbPixels(files[`bare_${i}`], thumbWidth).buf, k1: thumbPixels(files[`k1_${i}`], thumbWidth).buf, k2: thumbPixels(files[`k2_${i}`], thumbWidth).buf, width: full.width, height: full.height}, {minRatio});
    return {layer: i, text: l.text, role: i === title.i ? 'title' : 'text', min_ratio: minRatio, ...m};
  });
  await fs.rm(work, {recursive: true, force: true});
  const ok = layers.every(l => l.ok);
  return {ok, cover, thumb, thumb_width: thumbWidth, layers, detail: layers.map(l => `${l.role}「${l.text}」: ${l.ok ? 'ok' : 'FAIL'} ${l.detail}`).join('\n')};
}
