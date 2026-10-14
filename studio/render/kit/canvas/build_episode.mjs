#!/usr/bin/env node
// Audio-driven episode render through the shared canvas kit.
//
//   node studio/render/kit/canvas/build_episode.mjs <episode-dir> --mode preview|hook|full [options]
//
//   preview  no voice; line lengths estimated at --rate chars/s; draft only; never a deliverable
//   hook     L01–L03 from <episode>/audio/line_XX.wav; needs checkpoint hook-sample
//   full     every line from WAV; needs checkpoint render (human checks in qc/checklist.json)
//
// Line timing comes from WAV durations (decoded by ffmpeg), never from the script. The scene
// document <episode>/render/scenes.json places every visual on line cues, so new WAVs move the
// picture with them. Output goes to <episode>/out/<mode>/ (git-ignored).
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveEpisodeFonts} from '../fonts/library.mjs';
import {collectChars, embedFonts, launchBrowser, loadStyle, openPage, pageHtml, run, tmpDir, TIMELINE_JS} from './runtime.mjs';
import {parseLoudnormJson} from '../../browser/loudnorm.mjs';
import {assertRenderReview} from '../../../review.mjs';
import {acquireRenderLock, checkFullRenderCap, preflightHeavyRender, recordFullRender} from '../../../production.mjs';
import {runDoctor, formatDoctor} from '../../../doctor.mjs';
import {buildCost} from '../../../cost.mjs';
import {writeDone} from '../../../state.mjs';
import {parseFrontMatter} from '../../../brief.mjs';
import {durationWindow, checkMeasured, readSeriesDuration} from '../../../duration.mjs';
import {compareRenders, inputDigest, sampleFrames, writeDeterminism} from '../../browser/determinism.mjs';

export {parseLoudnormJson};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..', '..');
const PROBE_PY = path.join(here, '..', 'audio', 'audio_probe.py');
const MIX_PY = path.join(here, '..', 'audio', 'mix.py');
const require = createRequire(import.meta.url);
export const TL = (() => {
  const g = {};
  new Function('globalThis', 'window', require('node:fs').readFileSync(TIMELINE_JS, 'utf8'))(g, undefined);
  return g.SWTimeline;
})();

const PUNCT = /[，。？！、…“”‘’：；,.?!:;—\-\s（）()「」《》]/;
const HOOK_LINES = 3;

function parseArgs(argv) {
  const out = {mode: 'preview', rate: 4.2, workers: 0, fps: 30};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') out.mode = argv[++i];
    else if (a === '--rate') out.rate = Number(argv[++i]);
    else if (a === '--workers') out.workers = Number(argv[++i]);
    else if (a === '--audio-dir') out.audioDir = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--until') out.until = Number(argv[++i]);
    else if (a === '--no-video') out.noVideo = true;
    else if (a === '--allow-beat-gaps') out.allowBeatGaps = true;
    else if (a === '--crf') out.crf = Number(argv[++i]);
    else if (a === '--frames') out.frames = argv[++i].split(',').map(Number);
    else if (a === '--review') out.review = argv[++i];
    else if (a === '--review-only') out.reviewOnly = true;
    else rest.push(a);
  }
  out.episode = rest[0];
  return out;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function exists(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}

function spokenChars(text) {
  return [...text].filter(ch => !PUNCT.test(ch)).length;
}

// Preview only: a stand-in mouth envelope from the text, one open-close per spoken character.
function estimatedEnvelope(text, duration, fps) {
  const units = [...text].map(ch => (PUNCT.test(ch) ? {w: 0.6, open: false} : {w: 1, open: true}));
  while (units.length && !units[units.length - 1].open) units.pop();
  const total = units.reduce((n, u) => n + u.w, 0) || 1;
  const voiced = Math.max(0.1, duration - 0.2);
  const env = [];
  const n = Math.ceil(duration * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps - 0.1;
    if (t < 0 || t >= voiced) {
      env.push(0);
      continue;
    }
    let pos = (t / voiced) * total;
    let k = 0;
    while (k < units.length - 1 && pos >= units[k].w) pos -= units[k++].w;
    const u = units[k];
    const frac = pos / u.w;
    env.push(u.open ? +(0.3 + 0.7 * Math.pow(Math.sin(Math.PI * frac), 0.7) * (0.75 + 0.25 * ((k * 7919) % 13) / 13)).toFixed(3) : 0);
  }
  return env;
}

export function estimateDurations(lines, rate, fps) {
  const out = {};
  for (const l of lines) {
    const duration = +(spokenChars(l.tts_text || l.text) / rate + 0.2).toFixed(3);
    out[l.id] = {duration, env: estimatedEnvelope(l.text, duration, fps), source: `estimated ${rate} chars/s`};
  }
  return out;
}

async function lineDurations(lines, opts, audioDir) {
  const out = {};
  if (opts.mode === 'preview') return estimateDurations(lines, opts.rate, opts.fps);
  const files = lines.map(l => path.join(audioDir, path.basename(l.file || `line_${l.id.slice(1)}.wav`)));
  const missing = [];
  for (const f of files) if (!(await exists(f))) missing.push(path.relative(repo, f));
  if (missing.length) throw Object.assign(new Error(`Missing voice WAVs:\n  ${missing.join('\n  ')}`), {exit: 4});
  const r = run('python3', [PROBE_PY, '--fps', String(opts.fps), ...files]);
  const probe = JSON.parse(r.stdout);
  probe.files.forEach((p, i) => {
    out[lines[i].id] = {duration: +p.duration.toFixed(4), env: p.env, source: 'wav', file: files[i], probe: Object.assign({}, p, {env: undefined})};
  });
  return out;
}

export function buildTiming(lines, durations, doc, opts) {
  const lead = doc.lead_in_s ?? 0.4;
  const holds = doc.holds || {};
  const lineMap = {};
  const order = [];
  let t = lead;
  lines.forEach((l, i) => {
    const d = durations[l.id];
    lineMap[l.id] = {id: l.id, speaker: l.speaker, text: l.text, start: +t.toFixed(4), end: +(t + d.duration).toFixed(4), env: d.env, source: d.source};
    order.push(l.id);
    if (i < lines.length - 1) t += d.duration + (l.pause_after_s ?? doc.default_gap_s ?? 0.25) + (holds[l.id] ?? 0);
    else t += d.duration;
  });
  for (let i = 0; i < order.length; i++) {
    const cur = lineMap[order[i]];
    const next = lineMap[order[i + 1]];
    cur.sub_end = +(next ? Math.min(cur.end + 0.35, next.start - 0.04) : cur.end + 0.8).toFixed(4);
    cur.sub_end = Math.max(cur.sub_end, cur.end);
  }
  const lastEnd = lineMap[order[order.length - 1]].end;
  const tail = opts.mode === 'hook' ? (doc.hook_tail_s ?? 1.2) : (doc.tail_s ?? 2.5);
  const duration = +(lastEnd + tail).toFixed(4);
  return {
    lines: lineMap, order, duration, env_fps: opts.fps, partial: opts.mode === 'hook',
    timing_source: opts.mode === 'preview' ? 'estimated' : 'audio',
  };
}

function srtTime(t) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function toSrt(timing) {
  return timing.order.map((id, i) => {
    const l = timing.lines[id];
    return `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.sub_end)}\n${l.speaker}：${l.text}\n`;
  }).join('\n');
}

const BOOT = `
  const D = window.__data;
  const W = window.__spec.size[0], H = window.__spec.size[1];
  const presetName = D.postPreset || 'explainer';
  const frameOpts = () => ({fps: D.fps, review: D.review, presetName, presets: window.__postPresets});
  window.__frame = async t => {
    const f = SWTimeline.shotAt(D.resolved, D.timing, t, D.doc);
    await SWCompose.paintFrame(ctx, window.__spec, f, Object.assign({t}, frameOpts()));
    return png();
  };
  window.__cover = async () => {
    await SWCompose.paintStill(ctx, window.__spec, D.doc.cover, Object.assign({t: D.doc.cover.t ?? 1}, frameOpts(), {presetName: D.doc.cover.post || presetName}));
    return png();
  };
  window.__sheet = async (times, cols, tw) => {
    const th = Math.round(tw * H / W), pad = 16, lab = 34;
    const rows = Math.ceil(times.length / cols);
    const S = document.createElement('canvas');
    S.width = cols * (tw + pad) + pad; S.height = rows * (th + lab + pad) + pad + 70;
    const s = S.getContext('2d');
    s.fillStyle = '#13232E'; s.fillRect(0, 0, S.width, S.height);
    s.fillStyle = '#F6F1E7'; s.font = '700 34px "SW CJK"'; s.textBaseline = 'middle';
    s.fillText(D.sheetTitle, pad, 38);
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const f = SWTimeline.shotAt(D.resolved, D.timing, t, D.doc);
      await window.__frame(t);
      const x = pad + (i % cols) * (tw + pad), y = 70 + pad + Math.floor(i / cols) * (th + lab + pad);
      s.drawImage(document.getElementById('c'), x, y + lab, tw, th);
      s.fillStyle = '#F6F1E7'; s.font = '700 24px "SW CJK"';
      const sub = f.shot.subtitle ? ' ' + f.shot.subtitle.speaker : '';
      s.fillText(t.toFixed(1) + 's · ' + f.shot.id + sub, x, y + lab / 2);
    }
    return S.toDataURL('image/png').slice(22);
  };
`;

// Delivery profile for phones and desktop players: H.264 High@4.1, capped bitrate (CRF with a VBV ceiling).
export const DELIVERY_VIDEO = ['-profile:v', 'high', '-level:v', '4.1', '-maxrate', '5500k', '-bufsize', '11000k'];

async function renderFrames({browserPages, frames, fps, outFile, tmp, crf, onProgress}) {
  const n = browserPages.length;
  const chunk = Math.ceil(frames / n);
  let done = 0;
  const segs = await Promise.all(browserPages.map(async (page, w) => {
    const a = w * chunk, b = Math.min(frames, a + chunk);
    if (a >= b) return null;
    const seg = path.join(tmp, `seg_${String(w).padStart(2, '0')}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), ...DELIVERY_VIDEO, '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2), seg],
    {stdio: ['pipe', 'ignore', 'pipe']});
    let err = '';
    ff.stderr.on('data', d => (err += d));
    for (let i = a; i < b; i++) {
      const b64 = await page.evaluate(t => window.__frame(t), i / fps);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await once(ff.stdin, 'drain');
      done++;
      if (onProgress && done % 60 === 0) onProgress(done, frames);
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg segment ${w} failed: ${err}`);
    return seg;
  }));
  const list = path.join(tmp, 'segments.txt');
  await fs.writeFile(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outFile]);
}

function loudnorm(input, output, target) {
  const pass1 = run('ffmpeg', ['-hide_banner', '-i', input, '-af', `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`, '-f', 'null', '-']);
  const m = parseLoudnormJson(pass1.stderr);
  run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-af',
    `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    '-ar', '48000', '-c:a', 'pcm_s24le', output]);
  return m;
}

function measureLoudness(file) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const tail = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const I = tail.match(/I:\s+(-?[\d.]+) LUFS/);
  const LRA = tail.match(/LRA:\s+(-?[\d.]+) LU/);
  const peak = tail.match(/Peak:\s+(-?[\d.]+) dBFS/);
  return {integrated_lufs: I ? Number(I[1]) : null, lra_lu: LRA ? Number(LRA[1]) : null, true_peak_dbfs: peak ? Number(peak[1]) : null};
}

function ffprobe(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', file]);
  return JSON.parse(r.stdout);
}

export async function buildEpisode(episodeDir, opts) {
  const t0 = Date.now();
  const log = msg => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);
  const rel = f => path.relative(repo, f);
  if (!['preview', 'hook', 'full'].includes(opts.mode)) throw new Error(`--cut must be preview, hook or full (got ${opts.mode})`);
  const reviewMode = opts.review || 'draft';
  opts.fps = opts.fps || 30;
  opts.rate = opts.rate || 4.2;

  const doctor = await runDoctor({episodeDir, forRender: true});
  if (!doctor.render_ok) {
    throw Object.assign(new Error(`doctor blocked the render\n${formatDoctor(doctor)}`), {code: 'DOCTOR_BLOCKED', exit: 2});
  }
  log('doctor: render preflight passed');

  const review = await assertRenderReview(episodeDir, {review: reviewMode, cut: opts.mode});
  log(`review ${review.review}: ${review.metadata}`);
  if (opts.mode === 'preview') return renderUnlocked(episodeDir, opts, {review, log, rel, t0});

  // Hook and full cuts cost real time and quota: stage order, caps and one-at-a-time are enforced here.
  await preflightHeavyRender(episodeDir, opts.mode);
  const lock = await acquireRenderLock(episodeDir, {cut: opts.mode, review: review.review});
  try {
    if (opts.mode === 'full') {
      const cap = await checkFullRenderCap(episodeDir); // re-read under the lock
      if (!cap.ok) throw Object.assign(new Error(cap.detail), {code: cap.code, exit: 4});
      await recordFullRender(episodeDir, {review: review.review, caps: cap.caps});
      log(`caps: ${cap.detail}`);
    }
    return await renderUnlocked(episodeDir, opts, {review, log, rel, t0});
  } finally {
    await lock.release();
  }
}

async function renderUnlocked(episodeDir, opts, {review, log, rel, t0}) {

  if (opts.mode === 'full') {
    const predPath = path.join(episodeDir, 'state', 'duration_prediction.json');
    if (!(await exists(predPath))) {
      throw Object.assign(new Error('Full render needs predict-duration from the first 3 recorded hook lines.'), {code: 'PREDICT_NEEDS_HOOK', exit: 3});
    }
    const prediction = JSON.parse(await fs.readFile(predPath, 'utf8'));
    if (prediction.over) {
      throw Object.assign(new Error(`Predicted duration ${prediction.duration_s}s exceeds the brief limit ${prediction.limit_s}s. Revise the script before a full render.`), {code: 'PREDICT_OVER_LIMIT', exit: 3});
    }
  }

  const linesDoc = JSON.parse(await fs.readFile(path.join(episodeDir, 'lines.json'), 'utf8'));
  const doc = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'scenes.json'), 'utf8'));
  const {spec} = await loadStyle(episodeDir);
  let lines = linesDoc.lines;
  if (opts.mode === 'hook') lines = lines.slice(0, doc.hook_lines ?? HOOK_LINES);
  const audioDir = path.resolve(opts.audioDir || path.join(episodeDir, 'audio'));
  const durations = await lineDurations(lines, opts, audioDir);
  log(`line durations from ${opts.mode === 'preview' ? `estimate (${opts.rate} chars/s)` : rel(audioDir)}`);

  const timing = buildTiming(lines, durations, doc, opts);
  if (opts.until) timing.duration = Math.min(timing.duration, opts.until);
  const resolved = JSON.parse(JSON.stringify(TL.resolveScenes(doc, timing), (k, v) => (v === Infinity ? 1e9 : v)));
  const clock = TL.beatClock(resolved.events, timing.duration, doc.beat_clock);
  const outDir = path.resolve(opts.out || path.join(episodeDir, 'out', review.review, opts.mode));
  await fs.mkdir(outDir, {recursive: true});
  const plainTiming = Object.assign({}, timing, {lines: Object.fromEntries(Object.entries(timing.lines).map(([k, v]) => [k, Object.assign({}, v, {env: undefined})]))});
  await fs.writeFile(path.join(outDir, 'timeline.json'), JSON.stringify({timing: plainTiming, scenes: resolved.scenes.map(s => ({id: s.id, start: +s.start.toFixed(3), end: +s.end.toFixed(3)})), sfx: resolved.sfx, beat_clock: clock}, null, 2));
  await fs.writeFile(path.join(outDir, 'subtitles.srt'), toSrt(timing));
  let durationCheck = null;
  if (opts.mode === 'full') {
    const briefData = parseFrontMatter(await fs.readFile(path.join(episodeDir, 'brief.md'), 'utf8')).data;
    durationCheck = checkMeasured(timing.duration, durationWindow(briefData, await readSeriesDuration(episodeDir)));
    log(`duration ${durationCheck.measured_s} s vs approved ${durationCheck.window.approved_s ?? 'none'} s ±${Math.round(durationCheck.window.tolerance * 100)}%: ${durationCheck.ok ? 'ok' : durationCheck.detail}`);
    if (!durationCheck.ok) throw Object.assign(new Error(`Measured duration ${durationCheck.measured_s}s is ${durationCheck.detail} the approved window ${durationCheck.window.min_s}–${durationCheck.window.max_s}s.`), {code: 'DURATION_OUT_OF_WINDOW', exit: 3});
  }
  log(`timeline ${timing.duration.toFixed(2)} s, ${resolved.scenes.length} scenes, ${resolved.events.length} visible events, longest gap ${clock.max_gap_s} s`);
  for (const g of clock.gaps) log(`  beat clock ${g.level}: ${g.from}–${g.to} s (${g.gap} s without a new visual)`);
  if (!clock.ok && !opts.allowBeatGaps) throw Object.assign(new Error('beat clock failed: a stretch longer than fail_s has no new visual'), {exit: 5});

  const tmp = await tmpDir('sw-episode-');
  const chars = collectChars(doc, linesDoc.lines.map(l => [l.text, l.speaker]), spec.hud, '0123456789.s· ');
  const {overrides: fontOverrides} = await resolveEpisodeFonts(episodeDir);
  const {css, report: fontReport} = await embedFonts(chars, path.join(tmp, 'fonts'), fontOverrides);
  log(`fonts embedded (woff2 subsets): ${fontReport.fonts.map(f => `${f.weight}=${f.library_id || 'noto'} ${f.glyphs} glyphs ${(f.bytes / 1024).toFixed(0)} KB`).join(', ')}; ${fontReport.chars} chars covered`);

  const fps = opts.fps;
  const includeThree = JSON.stringify(doc).includes('"kind":"three"');
  const data = {
    doc, resolved, timing,
    review: review.review,
    fps,
    postPreset: doc.post_preset || 'explainer',
    sheetTitle: `${spec.hud.series} · ${review.review} ${opts.mode} · ${timing.duration.toFixed(1)} s · one frame / 2.5s`,
  };
  const html = await pageHtml({spec, css, data, boot: BOOT, includeThree});
  const frames = Math.round(timing.duration * fps);
  const workers = Math.max(1, Math.min(opts.workers || Math.max(1, (await import('node:os')).cpus().length), 8));
  const browsers = [];
  const pages = [];
  try {
    for (let i = 0; i < (opts.noVideo ? 1 : workers); i++) {
      const b = await launchBrowser();
      browsers.push(b);
      pages.push(await openPage(b, html, spec, {includeThree}));
    }
    const thumbDir = path.join(outDir, 'thumbs');
    await fs.mkdir(thumbDir, {recursive: true});
    const thumbFiles = [];
    for (const scene of resolved.scenes) {
      const t = Math.min(scene.end - 0.04, Math.max(scene.start, scene.start + 0.35));
      const b64 = await pages[0].evaluate(tt => window.__frame(tt), Math.max(0, t));
      const thumbFile = path.join(thumbDir, `${scene.id}.png`);
      await fs.writeFile(thumbFile, Buffer.from(b64, 'base64'));
      thumbFiles.push(thumbFile);
    }
    log(`shot thumbnails: ${thumbFiles.length}`);
    const sheetTimes = [];
    for (let t = 0; t < timing.duration - 0.05; t += 2.5) sheetTimes.push(+t.toFixed(2));
    const sheet = await pages[0].evaluate(([ts]) => window.__sheet(ts, 6, 440), [sheetTimes]);
    const sheetFile = path.join(outDir, 'contact_sheet.png');
    await fs.writeFile(sheetFile, Buffer.from(sheet, 'base64'));
    const cover = await pages[0].evaluate(() => window.__cover());
    const coverFile = path.join(outDir, 'cover.png');
    await fs.writeFile(coverFile, Buffer.from(cover, 'base64'));
    log(`cover + contact sheet (${sheetTimes.length} frames) written`);
    const detInputs = await inputDigest(episodeDir);
    const detIndices = sampleFrames({frames, fps, boundaries: resolved.scenes.map(s => s.start), seed: JSON.stringify(detInputs)});
    const detResult = await compareRenders({
      indices: detIndices,
      fps,
      openPass: () => openPage(browsers[0], html, spec, {includeThree}),
      frameAt: (page, t) => page.evaluate(tt => window.__frame(tt), t),
    });
    const {file: detFile, report: detReport} = await writeDeterminism(episodeDir, {
      result: detResult, inputs: detInputs, size: spec.size, fps, frames, mode: opts.mode, review: review.review,
    });
    log(`determinism: ${detResult.frames.length} frames x2 fresh contexts, ${detResult.ok ? 'identical' : `MISMATCH at ${detReport.mismatches.join(', ')}`} (${detResult.elapsed_s} s)`);
    const cost = await buildCost(episodeDir);
    const reviewMeta = {
      mode: review.review,
      metadata: review.metadata,
      file_suffix: review.file_suffix,
      signed_by: review.signed_by || null,
    };
    async function writeReport(extra) {
      const report = {
        schema: 'storyweaver.render_report.v1',
        episode: rel(episodeDir),
        pipeline: 'browser-playwright-ffmpeg',
        mode: opts.mode,
        review: reviewMeta,
        post_preset: data.postPreset,
        created_by: 'studio/render/browser',
        gate: {stage: review.stage, code: review.gate},
        durations: Object.fromEntries(timing.order.map(id => [id, {start: timing.lines[id].start, end: timing.lines[id].end, seconds: durations[id].duration, source: durations[id].source, probe: durations[id].probe}])),
        duration_s: timing.duration, duration_check: durationCheck, fps, frames, size: spec.size,
        beat_clock: clock,
        fonts: fontReport.fonts.map(f => ({weight: f.weight, library_id: f.library_id || null, license: f.license || null, license_file: f.license_file || null, subset: f.subset, bytes: f.bytes, source: f.source, source_index: f.source_index, source_sha256: f.source_sha256, subset_sha256: f.sha256, glyphs: f.glyphs})),
        glyph_coverage: {chars: fontReport.chars, missing: fontReport.missing},
        cost,
        contact_sheet: rel(sheetFile),
        cover: rel(coverFile),
        thumbs: thumbFiles.map(file => rel(file)),
        determinism: {file: rel(detFile), ok: detReport.ok, sample: detReport.sample, mismatches: detReport.mismatches, elapsed_s: detReport.elapsed_s},
        elapsed_s: +((Date.now() - t0) / 1000).toFixed(1),
        ...extra,
      };
      const reportFile = path.join(outDir, 'render_report.json');
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      await writeDone(episodeDir, review.review === 'release' ? 'render-release' : 'render-draft', {
        inputs: ['render/scenes.json', 'lines.json', 'brief.md'].map(file => path.join(episodeDir, file)),
        outputs: [reportFile, sheetFile, detFile, ...thumbFiles],
        extra: {review: review.review, cut: opts.mode},
      });
      return {report, reportFile};
    }
    if (opts.frames) {
      const dir = path.join(outDir, 'frames');
      await fs.mkdir(dir, {recursive: true});
      for (const t of opts.frames) {
        const b64 = await pages[0].evaluate(tt => window.__frame(tt), t);
        await fs.writeFile(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(b64, 'base64'));
      }
      log(`${opts.frames.length} review frames in ${rel(dir)}`);
    }
    if (opts.noVideo || opts.reviewOnly) {
      const {report} = await writeReport({output: null, audio: null, note: opts.reviewOnly ? 'review sheets only' : 'video skipped'});
      log(`review sheets written (${rel(outDir)})`);
      return {outDir, report};
    }

    const videoOnly = path.join(tmp, 'video.mp4');
    await renderFrames({browserPages: pages, frames, fps, outFile: videoOnly, tmp, crf: opts.crf ?? 18,
      onProgress: (d, n) => (d % 300 === 0 ? log(`frames ${d}/${n}`) : null)});
    log(`video encoded: ${frames} frames @ ${fps} fps`);

    const plan = {
      duration: timing.duration,
      lines: timing.order.map(id => ({id, start: timing.lines[id].start, end: timing.lines[id].end, file: durations[id].file || null})),
      sfx: resolved.sfx.filter(e => e.t >= 0 && e.t < timing.duration),
      bgm: Object.assign({}, doc.bgm, {
        sections: (doc.bgm?.sections || []).map(s => ({t: TL.cueTime(s.at, {start: 0, end: timing.duration}, timing, 'bgm'), style: s.style, level: s.level ?? 1}))
          .filter(s => Number.isFinite(s.t)),
        end_t: doc.bgm?.end_at ? TL.cueTime(doc.bgm.end_at, {start: 0, end: timing.duration}, timing, 'bgm.end_at') : null,
      }),
      sfx_level: doc.sfx_level ?? 1,
    };
    if (!Number.isFinite(plan.bgm.end_t)) plan.bgm.end_t = null;
    const planFile = path.join(outDir, 'mix_plan.json');
    await fs.writeFile(planFile, JSON.stringify(plan, null, 2));
    const rawMix = path.join(tmp, 'mix_raw.wav');
    const mixStats = JSON.parse(run('python3', [MIX_PY, '--plan', planFile, '--out', rawMix]).stdout);
    const target = {I: -16, TP: -1.5, LRA: 11};
    const mixFile = path.join(outDir, 'mix.wav');
    let loud;
    if (opts.mode === 'preview') {
      run('ffmpeg', ['-y', '-v', 'error', '-i', rawMix, '-ar', '48000', '-c:a', 'pcm_s24le', mixFile]);
      loud = {normalized: false, note: 'preview has no voice; loudness is not normalised and is not a deliverable value', measured: measureLoudness(mixFile)};
    } else {
      const first = loudnorm(rawMix, mixFile, target);
      loud = {normalized: true, target, pass1: {input_i: Number(first.input_i), input_tp: Number(first.input_tp)}, measured: measureLoudness(mixFile)};
    }
    log(`audio mixed: ${loud.measured.integrated_lufs} LUFS integrated${loud.normalized ? ` (target ${target.I})` : ' (preview, not normalised)'}`);

    const name = `${path.basename(path.dirname(episodeDir))}_${path.basename(episodeDir)}_${opts.mode}${review.file_suffix}.mp4`;
    const final = path.join(outDir, name);
    const srt = path.join(outDir, 'subtitles.srt');
    const captionLang = linesDoc.language === 'en' ? 'eng' : linesDoc.language === 'zh' ? 'chi' : 'und';
    const comment = review.review === 'draft' ? 'draft: not human-reviewed' : 'release: human-signed';
    // No soft subtitle track: captions are burned in and shipped as a sidecar .srt. A mov_text track
    // stalled some phone and desktop players after the first seconds (EP03 v2 playback report).
    run('ffmpeg', ['-y', '-v', 'error', '-i', videoOnly, '-i', mixFile,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-metadata', `comment=${comment}`,
      '-metadata', `review_status=${review.metadata}`,
      '-movflags', '+faststart', '-t', timing.duration.toFixed(3), final]);
    const probe = ffprobe(final);
    const got = Number(probe.format?.duration);
    if (!(Math.abs(got - timing.duration) <= 0.1)) throw new Error(`muxed duration ${got} s does not match timeline ${timing.duration} s`);
    const buf = await fs.readFile(final);
    const {report} = await writeReport({
      audio: {mix: mixStats, loudness: loud},
      subtitles: {burned_in: true, sidecar: rel(srt), soft_track: null, language: captionLang},
      output: {file: rel(final), bytes: buf.length, sha256: sha256(buf), probe},
    });
    log(`done: ${rel(final)} (${(buf.length / 1e6).toFixed(1)} MB)`);
    return {outDir, final, report};
  } finally {
    await Promise.all(browsers.map(b => b.close()));
    await fs.rm(tmp, {recursive: true, force: true});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.episode) {
    console.error('usage: node studio/render/kit/canvas/build_episode.mjs <episode-dir> --mode preview|hook|full --review draft|release [--review-only] [--no-video] [--frames t1,t2]');
    process.exit(1);
  }
  buildEpisode(path.resolve(opts.episode), opts).catch(err => {
    console.error(err.message);
    process.exit(err.exit || 1);
  });
}
