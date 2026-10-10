// Silent draft of a shot fixture. Same capture contract as an episode:
// seek(t) → snapshot the DOM stage → WebGL post → ffmpeg.
// No voice, no brief, no Three.js. Release is refused.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {formatDoctor, runDoctor} from '../../doctor.mjs';
import {DRAFT_WATERMARK} from '../../review.mjs';
import {writeDone} from '../../state.mjs';
import {collectChars, embedFonts, launchBrowser, openPage, tmpDir} from '../kit/canvas/runtime.mjs';
import {kineticBundle} from './dom/bundle.mjs';
import {assertShotDirectory} from './validate_shot.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..');
const POST_JS = path.join(here, 'post.js');
const COMPOSE_JS = path.join(here, 'compositor.js');
const PRESETS_JSON = path.join(here, 'presets.json');

function rel(file) {
  return path.relative(repo, file);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sampleTime(event, duration) {
  return Math.min(duration - 0.04, +(event.t + 0.7).toFixed(3));
}

function ffprobe(file) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'json', file,
  ], {encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || 'ffprobe failed');
  return JSON.parse(result.stdout);
}

async function pageHtml({spec, css, shot, review}) {
  const [w, h] = spec.size;
  const post = await fs.readFile(POST_JS, 'utf8');
  const compose = await fs.readFile(COMPOSE_JS, 'utf8');
  const presets = await fs.readFile(PRESETS_JSON, 'utf8');
  const bundle = await kineticBundle();
  const weights = [400, 500, 700, 900].map(weight => `${weight} 40px "SW CJK"`);
  const shotView = {id: shot.id, post: shot.post_preset};
  const sheetTitle = `${shot.id} · draft preview · ${shot.duration_s.toFixed(1)}s`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;padding:0;background:#EFE7DA;overflow:hidden}
#sw-stage{position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;background:#EFE7DA}
#c{position:absolute;left:4096px;top:0}
</style></head>
<body>
<div id="sw-stage"></div>
<canvas id="c" width="${w}" height="${h}"></canvas>
<script>window.__postPresets = ${presets};</script>
<script>
window.__rafCalls = 0;
let __rafId = 0;
window.requestAnimationFrame = function () {
  window.__rafCalls += 1;
  return ++__rafId;
};
window.cancelAnimationFrame = function () {};
</script>
<script>${post}</script>
<script>${compose}</script>
<script>${bundle}</script>
<script>
window.__shot = ${JSON.stringify(shot)};
window.__spec = ${JSON.stringify(spec)};
window.__shotView = ${JSON.stringify(shotView)};
window.__review = ${JSON.stringify(review)};
window.__t = 0;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
window.__seek = t => {
  window.__t = t;
  window.__probe = SWKinetic.seek(t);
  return window.__probe;
};
window.__readProbe = () => {
  const probe = window.__probe;
  const node = document.querySelector('[data-lottie="flourish"]');
  if (probe && node) probe.lottieHtml = node.innerHTML.length;
  if (probe) probe.text = document.getElementById('sw-stage').innerText;
  return probe;
};
window.__composite = async b64 => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  await SWCompose.presentPicture(ctx, img, window.__spec, window.__shotView, {
    t: window.__t,
    fps: window.__shot.fps,
    review: window.__review,
    presetName: window.__shot.post_preset,
    presets: window.__postPresets,
  });
  return canvas.toDataURL('image/png').slice(22);
};
window.__beginSheet = (count, cols, tw) => {
  const th = Math.round(tw * ${h} / ${w});
  const pad = 16;
  const lab = 36;
  const rows = Math.ceil(count / cols);
  const sheet = document.createElement('canvas');
  sheet.width = cols * (tw + pad) + pad;
  sheet.height = rows * (th + lab + pad) + pad + 78;
  const s = sheet.getContext('2d');
  s.fillStyle = '#101820';
  s.fillRect(0, 0, sheet.width, sheet.height);
  s.fillStyle = '#EFE7DA';
  s.font = '700 32px "SW CJK"';
  s.textBaseline = 'middle';
  s.fillText(${JSON.stringify(sheetTitle)}, pad, 40);
  window.__sheet = {sheet, s, tw, th, pad, lab, cols, i: 0};
};
window.__sheetCell = label => {
  const bag = window.__sheet;
  const col = bag.i % bag.cols;
  const row = Math.floor(bag.i / bag.cols);
  const x = bag.pad + col * (bag.tw + bag.pad);
  const y = 78 + bag.pad + row * (bag.th + bag.lab + bag.pad);
  bag.s.fillStyle = '#EFE7DA';
  bag.s.font = '500 22px "SW CJK"';
  bag.s.textBaseline = 'middle';
  bag.s.fillText(label, x, y + bag.lab / 2);
  bag.s.drawImage(canvas, x, y + bag.lab, bag.tw, bag.th);
  bag.i += 1;
};
window.__sheetPng = () => window.__sheet.sheet.toDataURL('image/png').slice(22);
async function __boot() {
  try {
    const probe = ${JSON.stringify(collectChars(shot, DRAFT_WATERMARK, '看规').slice(0, 500))};
    const faces = ${JSON.stringify(weights)};
    for (const face of faces) await document.fonts.load(face, probe);
    for (const face of faces) if (!document.fonts.check(face, '看规')) throw new Error('embedded font not usable: ' + face);
    SWKinetic.mount(document.getElementById('sw-stage'), {fps: window.__shot.fps});
    window.__ready = true;
  } catch (error) {
    window.__error = String(error && error.stack || error);
  }
}
__boot();
</script>
</body></html>`;
}

async function grab(page, t) {
  const during = await page.evaluate(time => window.__seek(time), t);
  if (!during.paused) throw new Error(`GSAP timeline was playing at t=${t}`);
  if (during.three) throw new Error('Three.js loaded in a shot that keeps it unused');
  if (Math.abs(during.gsapTime - t) > 1e-3) {
    throw new Error(`GSAP playhead ${during.gsapTime} did not follow t=${t}`);
  }
  const shot = await page.locator('#sw-stage').screenshot({type: 'png', animations: 'disabled'});
  const probe = await page.evaluate(() => window.__readProbe());
  const b64 = await page.evaluate(async png => window.__composite(png), shot.toString('base64'));
  return {png: Buffer.from(b64, 'base64'), probe};
}

async function encodeVideo(page, {frames, fps, outFile, duration}) {
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-g', String(fps * 2), outFile,
  ], {stdio: ['pipe', 'ignore', 'pipe']});
  let err = '';
  ff.stderr.on('data', chunk => {
    err += chunk;
  });
  for (let i = 0; i < frames; i++) {
    const {png} = await grab(page, i / fps);
    if (!ff.stdin.write(png)) await once(ff.stdin, 'drain');
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error(`ffmpeg failed: ${err}`);
  const probe = ffprobe(outFile);
  const got = Number(probe.format?.duration);
  if (!(Math.abs(got - duration) <= 0.15)) throw new Error(`muxed duration ${got}s does not match ${duration}s`);
  return probe;
}

export async function renderShotFixture(dir, options = {}) {
  const started = Date.now();
  const log = message => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${message}`);
  const review = options.review || 'draft';
  const cut = options.cut || 'preview';
  if (review !== 'draft' || cut !== 'preview') {
    throw Object.assign(
      new Error('This shot fixture renders only as a silent draft preview. A series episode is a different directory, outside this repo.'),
      {code: 'SHOT_DRAFT_ONLY'},
    );
  }
  const {doc, clock} = await assertShotDirectory(dir);
  const doctor = await runDoctor({episodeDir: dir, forRender: true});
  if (!doctor.render_ok) {
    throw Object.assign(new Error(`doctor blocked the render\n${formatDoctor(doctor)}`), {code: 'DOCTOR_BLOCKED', exit: 2});
  }
  log('doctor: render preflight passed');

  const duration = options.until ? Math.min(doc.duration_s, Number(options.until)) : doc.duration_s;
  const fps = doc.fps;
  const spec = {
    size: doc.size,
    safe: doc.safe || {x: 88, y: 64},
    fonts: {family: '"SW CJK", sans-serif'},
    palette: {ink: '#101820', white: '#EFE7DA'},
    hud: {ai_label: doc.copy.ai},
  };
  const outDir = path.resolve(options.out || path.join(dir, 'out', 'draft', 'preview'));
  await fs.mkdir(outDir, {recursive: true});
  const tmp = await tmpDir('sw-shot-');
  const browser = await launchBrowser();
  try {
    const chars = collectChars(doc, DRAFT_WATERMARK, '看规', 'Title card');
    const {css, report: fontReport} = await embedFonts(chars, path.join(tmp, 'fonts'));
    log(`fonts embedded: ${fontReport.fonts.map(font => `${font.weight}=${font.glyphs}`).join(', ')}`);
    const html = await pageHtml({spec, css, shot: doc, review});
    const page = await openPage(browser, html, spec);
    const samples = doc.events
      .map(event => ({...event, at: sampleTime(event, duration)}))
      .filter(event => event.at >= 0 && event.at < duration);
    await page.evaluate(([count]) => window.__beginSheet(count, Math.min(5, count), 360), [samples.length]);
    const thumbDir = path.join(outDir, 'thumbs');
    await fs.mkdir(thumbDir, {recursive: true});
    const thumbs = [];
    const probes = [];
    let coverPng = null;
    for (const sample of samples) {
      const {png, probe} = await grab(page, sample.at);
      const thumbFile = path.join(thumbDir, `${sample.id}.png`);
      await fs.writeFile(thumbFile, png);
      thumbs.push(thumbFile);
      probes.push({
        id: sample.id,
        t: sample.at,
        text: probe.text,
        frame: probe.frame,
        currentFrame: probe.currentFrame,
        gsapTime: probe.gsapTime,
        totalProgress: probe.totalProgress,
        paused: probe.paused,
        duration: probe.duration,
        rafDuringSeek: probe.rafDuringSeek,
        lottieHtml: probe.lottieHtml,
        transitionDuration: probe.transitionDuration,
        animationName: probe.animationName,
        three: probe.three,
      });
      await page.evaluate(label => window.__sheetCell(label), `${sample.at.toFixed(2)}s  ${sample.id}`);
      coverPng = png;
      log(`frame ${sample.id} @ ${sample.at.toFixed(2)}s`);
    }
    const repeat = await grab(page, samples[samples.length - 1].at);
    const repeatMatch = coverPng.equals(repeat.png);
    if (!repeatMatch) throw new Error('seeking the same t twice did not repeat the picture');
    const sheetFile = path.join(outDir, 'contact_sheet.png');
    const sheetB64 = await page.evaluate(() => window.__sheetPng());
    await fs.writeFile(sheetFile, Buffer.from(sheetB64, 'base64'));
    const coverFile = path.join(outDir, 'cover.png');
    await fs.writeFile(coverFile, coverPng);
    if (options.frames) {
      const frameDir = path.join(outDir, 'frames');
      await fs.mkdir(frameDir, {recursive: true});
      for (const t of options.frames) {
        const {png} = await grab(page, t);
        await fs.writeFile(path.join(frameDir, `t${t.toFixed(2).padStart(6, '0')}.png`), png);
      }
    }
    const frameCount = Math.round(duration * fps);
    let output = null;
    if (!options.noVideo && !options.reviewOnly) {
      const final = path.join(outDir, `${doc.id}_draft_preview.mp4`);
      const probe = await encodeVideo(page, {frames: frameCount, fps, outFile: final, duration});
      const buf = await fs.readFile(final);
      output = {file: rel(final), bytes: buf.length, sha256: sha256(buf), probe};
      log(`video encoded: ${frameCount} frames`);
    }
    const report = {
      schema: 'storyweaver.render_report.v1',
      kind: 'shot-fixture',
      episode: rel(dir),
      pipeline: 'browser-playwright-ffmpeg',
      mode: 'preview',
      review: {mode: 'draft', metadata: 'unreviewed', watermark: DRAFT_WATERMARK, signed_by: null},
      post_preset: doc.post_preset,
      created_by: 'studio/render/browser/shot_preview',
      duration_s: duration,
      fps,
      frames: frameCount,
      size: spec.size,
      beat_clock: clock,
      motion: {
        gsap: 'paused timeline, seek(t) and totalProgress',
        lottie: 'goToAndStop',
        lucide: true,
        three: false,
        repeat_hash_match: repeatMatch,
        samples: probes,
      },
      fonts: fontReport.fonts.map(font => ({weight: font.weight, glyphs: font.glyphs, subset_sha256: font.sha256})),
      contact_sheet: rel(sheetFile),
      cover: rel(coverFile),
      thumbs: thumbs.map(file => rel(file)),
      output,
      cost: null,
      note: options.reviewOnly || options.noVideo ? 'review sheets only; silent shot fixture' : 'silent draft preview',
      elapsed_s: +((Date.now() - started) / 1000).toFixed(1),
    };
    const reportFile = path.join(outDir, 'render_report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    await writeDone(dir, 'render-draft', {
      inputs: [path.join(dir, 'shot.json')],
      outputs: [reportFile, sheetFile, ...thumbs],
      extra: {review: 'draft', cut: 'preview', kind: 'shot-fixture'},
    });
    log(`review sheets written (${rel(outDir)})`);
    return {outDir, report};
  } finally {
    await browser.close();
    await fs.rm(tmp, {recursive: true, force: true});
  }
}
