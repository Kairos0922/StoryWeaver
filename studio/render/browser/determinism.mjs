// Built-in re-render check. The render pipeline calls this; nobody writes qc/determinism.json by hand.
//
// A deterministic sample of frames (first, last, every scene start, plus N frames picked by a PRNG
// seeded from the render inputs) is rendered twice, each pass in a fresh browser context, at the
// render's own resolution. The sha256 of every frame PNG must match across passes.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DETERMINISM_SCHEMA = 'storyweaver.determinism.v1';
export const DETERMINISM_CREATED_BY = 'studio/render/browser/determinism';
export const DETERMINISM_INPUTS = ['render/scenes.json', 'lines.json'];
export const RANDOM_FRAMES = 4;

export function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Hash of the inputs that decide every frame; a stale qc/determinism.json fails the gate. */
export async function inputDigest(episodeDir) {
  const out = {};
  for (const rel of DETERMINISM_INPUTS) {
    try {
      out[rel] = sha256(await fs.readFile(path.join(episodeDir, rel)));
    } catch {
      out[rel] = null;
    }
  }
  return out;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Frame indices to compare: first, last, scene starts, and `random` seeded picks. Sorted, unique. */
export function sampleFrames({frames, fps, boundaries = [], seed = '', random = RANDOM_FRAMES}) {
  if (!(frames > 0)) return [];
  const last = frames - 1;
  const set = new Set([0, last]);
  for (const t of boundaries) {
    const i = Math.round(t * fps);
    if (i >= 0 && i <= last) set.add(i);
  }
  const rand = mulberry32(parseInt(sha256(String(seed)).slice(0, 8), 16));
  const target = Math.min(frames, set.size + random);
  for (let guard = 0; set.size < target && guard < 1000; guard++) set.add(Math.floor(rand() * frames));
  return [...set].sort((a, b) => a - b);
}

/**
 * Render `indices` twice, each pass in a new browser context, and compare PNG hashes.
 * `openPass()` must return a freshly booted page in a new context; `frameAt(page, t)` returns PNG base64.
 */
export async function compareRenders({indices, fps, openPass, frameAt, closePass = page => page.context().close(), warm = true}) {
  const passes = [];
  const started = Date.now();
  for (let p = 0; p < 2; p++) {
    const page = await openPass();
    try {
      // Warm-up: draw every sampled frame once and discard it. A sequential render has already
      // drawn each glyph and path many frames earlier; a sparse sample would otherwise compare a
      // first-use rasterisation (which Chromium may anti-alias a pixel differently) against a warm one.
      if (warm) for (const i of indices) await frameAt(page, i / fps);
      const hashes = [];
      for (const i of indices) hashes.push(sha256(Buffer.from(await frameAt(page, i / fps), 'base64')));
      passes.push(hashes);
    } finally {
      await closePass(page);
    }
  }
  const frames = indices.map((i, k) => ({frame: i, t: +(i / fps).toFixed(4), first: passes[0][k], second: passes[1][k], match: passes[0][k] === passes[1][k]}));
  return {frames, ok: frames.length > 0 && frames.every(f => f.match), elapsed_s: +((Date.now() - started) / 1000).toFixed(2)};
}

export async function writeDeterminism(episodeDir, {result, inputs, size, fps, frames, mode, review}) {
  const report = {
    schema: DETERMINISM_SCHEMA,
    created_by: DETERMINISM_CREATED_BY,
    method: 'two passes, fresh browser context each, every sampled frame drawn once to warm caches, then captured at full render resolution; sha256 of frame PNG',
    render: {mode, review, size, fps, frames},
    inputs,
    sample: result.frames.length,
    mismatches: result.frames.filter(f => !f.match).map(f => f.frame),
    ok: result.ok,
    elapsed_s: result.elapsed_s,
    frames: result.frames,
  };
  await fs.mkdir(path.join(episodeDir, 'qc'), {recursive: true});
  const file = path.join(episodeDir, 'qc', 'determinism.json');
  await fs.writeFile(file, JSON.stringify(report, null, 2));
  return {file, report};
}

/** Gate evaluation for `quality`: missing, foreign, stale, empty, or mismatched → fail. */
export async function evaluateDeterminism(episodeDir) {
  const file = path.join(episodeDir, 'qc', 'determinism.json');
  let doc;
  try {
    doc = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {ok: false, evidence: 'missing qc/determinism.json (render the episode; the pipeline writes it)'};
  }
  if (doc.schema !== DETERMINISM_SCHEMA || doc.created_by !== DETERMINISM_CREATED_BY) {
    return {ok: false, evidence: 'qc/determinism.json was not written by the render pipeline'};
  }
  const now = await inputDigest(episodeDir);
  const stale = DETERMINISM_INPUTS.filter(rel => !now[rel] || doc.inputs?.[rel] !== now[rel]);
  if (stale.length) return {ok: false, evidence: `qc/determinism.json is stale (${stale.join(', ')} changed since render)`};
  const frames = Array.isArray(doc.frames) ? doc.frames : [];
  if (!frames.length) return {ok: false, evidence: 'qc/determinism.json compared no frames'};
  const bad = frames.filter(f => !f.first || f.first !== f.second);
  if (bad.length) return {ok: false, evidence: `re-render differs at frame(s) ${bad.map(f => f.frame).join(', ')}`};
  return {ok: true, evidence: `${frames.length} sampled frames identical across two fresh browser contexts`};
}
