// Motion QC. Input is a JSON spec measured from a draft (see docs/motion-tokens.md#motion-qc).
// Checks: text hold time, contrast, flash rate, SFX sync. Outputs: onion-skin and speed-graph SVGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';

const require = createRequire(import.meta.url);
const zhPack = require('../lint/packs/zh.json');

// Minimum on-screen hold for readable text.
// zh per-char time is 1 / pace.comfortable_per_s from the language pack (single source).
const HOLD_BASE_S = 0.5;
const ZH_COMFORTABLE_PER_S = zhPack.pace.comfortable_per_s;

export const HOLD_RULES = Object.freeze({
  en: Object.freeze({perUnit: 0.3, unit: 'word', base: HOLD_BASE_S}),
  zh: Object.freeze({
    comfortablePerS: ZH_COMFORTABLE_PER_S,
    perUnit: +(1 / ZH_COMFORTABLE_PER_S).toFixed(2),
    unit: 'char',
    base: HOLD_BASE_S,
  }),
});

export function countUnits(text, language) {
  if (language === 'zh') return [...String(text).replace(/[\s\p{P}]/gu, '')].length;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function minHold(text, language = 'en') {
  const rule = HOLD_RULES[language];
  if (!rule) throw new Error(`No hold rule for language: ${language}`);
  // perUnit is derived from pace.comfortable_per_s for zh; explicit for en.
  return +(countUnits(text, language) * rule.perUnit + rule.base).toFixed(3);
}

export function checkTextHold(texts = [], language = 'en') {
  const rule = HOLD_RULES[language];
  const items = texts.map(t => {
    const need = minHold(t.text, language);
    return {id: t.id, hold_s: t.hold_s, need_s: need, ok: Number(t.hold_s) >= need};
  });
  return {ok: items.every(i => i.ok), rule: `${rule.perUnit}s/${rule.unit} + ${rule.base}s`, items};
}

function channel(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`Bad color: ${hex}`);
  const [r, g, b] = m.slice(1).map(h => channel(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Each pair is text color vs the worst background it sits on in any frame.
export function checkContrast(pairs = [], min = 4.5) {
  const items = pairs.map(p => {
    const ratio = +contrastRatio(p.fg, p.bg).toFixed(2);
    return {id: p.id, ratio, ok: ratio >= min};
  });
  return {ok: items.every(i => i.ok), min, items};
}

// WCAG general flash: a flash is a pair of opposing relative-luminance changes of at least 10%
// where the darker state is below 0.80. Fail when any one-second window holds more than maxPerSecond.
export function checkFlashes(lum = [], fps = 30, maxPerSecond = 3) {
  const edges = [];
  let anchor = 0;
  let dir = 0;
  for (let i = 1; i < lum.length; i++) {
    const d = lum[i] - lum[anchor];
    const nd = Math.sign(d);
    if (Math.abs(d) >= 0.1 && Math.min(lum[i], lum[anchor]) < 0.8) {
      if (nd !== dir) edges.push(i);
      dir = nd;
      anchor = i;
    } else if (nd !== 0 && nd !== dir) anchor = i;
  }
  const flashes = [];
  for (let k = 1; k < edges.length; k += 2) flashes.push(edges[k]);
  let worst = 0, worstAt = null;
  for (let i = 0; i < flashes.length; i++) {
    let n = 0;
    for (let j = i; j < flashes.length && flashes[j] - flashes[i] < fps; j++) n++;
    if (n > worst) { worst = n; worstAt = flashes[i]; }
  }
  return {ok: worst <= maxPerSecond, maxPerSecond, worstPerSecond: worst, worstAtFrame: worstAt, flashes: flashes.length};
}

// SFX sync: the hit should land one frame after the picture event (light before sound).
// peaks are measured seconds from the decoded mix; allowed lag is 0..2 frames, target +1.
export function checkSfxSync(events = [], peaks = [], fps = 30, {minLag = 0, maxLag = 2} = {}) {
  const items = events.map(e => {
    const near = peaks.reduce((best, p) => (Math.abs(p * fps - e.frame) < Math.abs(best * fps - e.frame) ? p : best), Infinity);
    const lag = Number.isFinite(near) ? +(near * fps - e.frame).toFixed(2) : null;
    return {id: e.id, frame: e.frame, peak_s: Number.isFinite(near) ? +near.toFixed(4) : null, lag_frames: lag, ok: lag != null && lag >= minLag - 0.5 && lag <= maxLag + 0.5};
  });
  return {ok: items.every(i => i.ok), target_lag_frames: 1, items};
}

// Decode audio to mono float32 and find the loudest sample near each event.
export async function measurePeaks(audioFile, events, fps = 30, sampleRate = 48000) {
  const pcm = await new Promise((resolve, reject) => {
    const chunks = [];
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', audioFile, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-']);
    ff.stdout.on('data', c => chunks.push(c));
    ff.on('error', reject);
    ff.on('close', code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited ${code}`))));
  });
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  return events.map(e => {
    const from = Math.max(0, Math.floor(((e.frame - 3) / fps) * sampleRate));
    const to = Math.min(samples.length, Math.ceil(((e.frame + 6) / fps) * sampleRate));
    let best = from, max = -1;
    for (let i = from; i < to; i++) if (Math.abs(samples[i]) > max) { max = Math.abs(samples[i]); best = i; }
    return best / sampleRate;
  });
}

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#111"/>${body}</svg>\n`;
}

// Onion skin: one ghost per frame. Tight spacing near keys means the easing is working.
export function onionSkinSvg(samples, {width = 1920, height = 1080, scale = 0.5} = {}) {
  const w = Math.round(width * scale), h = Math.round(height * scale);
  const n = samples.length;
  const dots = samples.map((s, i) => {
    const r = 6 * (s.scale ?? 1);
    const o = (0.15 + 0.85 * (i / Math.max(1, n - 1))).toFixed(2);
    return `<circle cx="${(s.x * scale).toFixed(1)}" cy="${(s.y * scale).toFixed(1)}" r="${r.toFixed(1)}" fill="#ffd166" fill-opacity="${o}"><title>frame ${s.frame}</title></circle>`;
  });
  return svg(w, h, dots.join(''));
}

export function speeds(samples) {
  return samples.slice(1).map((s, i) => {
    const p = samples[i];
    return {frame: s.frame, speed: Math.hypot(s.x - p.x, s.y - p.y) / Math.max(1, s.frame - p.frame), scaleRate: ((s.scale ?? 1) - (p.scale ?? 1)) / Math.max(1, s.frame - p.frame)};
  });
}

// Speed graph: flat lines are linear motion, sharp corners are hard starts or stops.
export function speedGraphSvg(samples, {width = 960, height = 320} = {}) {
  const sp = speeds(samples);
  if (!sp.length) return svg(width, height, '');
  const pad = 30;
  const f0 = sp[0].frame, f1 = sp[sp.length - 1].frame || f0 + 1;
  const vmax = Math.max(1e-6, ...sp.map(s => s.speed));
  const pts = sp.map(s => `${(pad + ((s.frame - f0) / Math.max(1, f1 - f0)) * (width - 2 * pad)).toFixed(1)},${(height - pad - (s.speed / vmax) * (height - 2 * pad)).toFixed(1)}`).join(' ');
  const axis = `<line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#555"/><text x="${pad}" y="18" fill="#aaa" font-size="12" font-family="sans-serif">speed px/frame (max ${vmax.toFixed(1)}), frames ${f0}-${f1}</text>`;
  return svg(width, height, `${axis}<polyline fill="none" stroke="#06d6a0" stroke-width="2" points="${pts}"/>`);
}

// Hard stop: speed falls from high to near zero in one frame.
export function hardStops(samples, ratio = 0.5) {
  const sp = speeds(samples);
  const vmax = Math.max(0, ...sp.map(s => s.speed));
  const out = [];
  for (let i = 1; i < sp.length; i++) {
    if (Math.abs(sp[i].speed - sp[i - 1].speed) > vmax * ratio) out.push(sp[i].frame);
  }
  return out;
}

// Motion kinds that are banned by default (docs/quality-standard.md). A spec can add more in `banned`.
export const BANNED_KINDS = Object.freeze(['gradient-glow', 'lens-flare', 'decorative-particles', 'all-fade-in', 'fade-slide-up', 'text-move-while-read', 'opacity-bounce', 'color-bounce']);

// Each shot has exactly one hero move; no move uses a banned kind.
export function checkShots(shots = [], extraBanned = []) {
  const banned = new Set([...BANNED_KINDS, ...extraBanned]);
  const items = shots.map(shot => {
    const moves = shot.moves || [];
    const heroes = moves.filter(m => m.role === 'hero').length;
    const bannedUsed = moves.map(m => m.kind).filter(k => banned.has(k));
    return {id: shot.id, heroes, banned: bannedUsed, ok: heroes === 1 && bannedUsed.length === 0};
  });
  return {ok: items.length > 0 && items.every(i => i.ok), items};
}

export async function runMotionQc(specFile, outDir) {
  const spec = JSON.parse(await fs.readFile(specFile, 'utf8'));
  const fps = spec.fps ?? 30;
  const base = path.dirname(specFile);
  const out = outDir || path.join(base, 'motion-qc');
  await fs.mkdir(out, {recursive: true});
  const report = {fps, checks: {}, outputs: []};
  if (spec.texts) report.checks.text_hold = checkTextHold(spec.texts, spec.language || 'en');
  if (spec.contrast) report.checks.contrast = checkContrast(spec.contrast);
  if (spec.luminance) report.checks.flashes = checkFlashes(spec.luminance, fps);
  if (spec.sfx?.events) {
    const peaks = spec.sfx.peaks_s ?? (spec.sfx.audio ? await measurePeaks(path.resolve(base, spec.sfx.audio), spec.sfx.events, fps) : []);
    report.checks.sfx_sync = checkSfxSync(spec.sfx.events, peaks, fps);
  }
  if (spec.shots) report.checks.shots = checkShots(spec.shots, spec.banned);
  for (const [id, samples] of Object.entries(spec.tracks || {})) {
    const onion = path.join(out, `${id}.onion.svg`);
    const graph = path.join(out, `${id}.speed.svg`);
    await fs.writeFile(onion, onionSkinSvg(samples, spec.frame || {}));
    await fs.writeFile(graph, speedGraphSvg(samples));
    report.outputs.push(onion, graph);
    report.checks[`hard_stops_${id}`] = {ok: true, advisory: true, frames: hardStops(samples)};
  }
  report.ok = Object.values(report.checks).every(c => c.ok);
  await fs.writeFile(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function formatMotionQc(report) {
  const lines = [report.ok ? 'MOTION_QC_OK' : 'MOTION_QC_FAIL'];
  for (const [name, c] of Object.entries(report.checks)) {
    const note = c.advisory ? ` (advisory: ${c.frames.length} sharp speed changes)` : '';
    lines.push(`${c.ok ? 'pass' : 'FAIL'} ${name}${note}`);
    for (const i of c.items || []) if (!i.ok) lines.push(`  - ${i.id}: ${JSON.stringify(i)}`);
  }
  for (const o of report.outputs) lines.push(`wrote ${o}`);
  return lines.join('\n');
}
