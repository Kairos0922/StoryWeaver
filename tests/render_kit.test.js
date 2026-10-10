import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {extractSpokenLines, loadRules} from '../studio/lint/lint_script.mjs';
import {TL, buildTiming, estimateDurations, parseLoudnormJson} from '../studio/render/kit/canvas/build_episode.mjs';
import {loadStyle} from '../studio/render/kit/canvas/runtime.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ep02 = path.join(root, 'series/invisible-rules/ep02');
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

// Records nothing; only has to accept every call the kit makes, like a real 2D context.
function fakeContext() {
  const state = {font: '10px sans-serif'};
  const gradient = {addColorStop() {}};
  return new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return text => {
          const size = Number(/(\d+(?:\.\d+)?)px/.exec(target.font)?.[1] || 10);
          return {width: [...String(text)].length * size};
        };
      }
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const kitSource = await fs.readFile(path.join(root, 'studio/render/kit/canvas/kit.js'), 'utf8');

function loadKit() {
  const context = vm.createContext({Path2D: class {}});
  vm.runInContext(kitSource, context);
  return context.SWKit;
}

async function ep02Timing(mode = 'preview') {
  const linesDoc = await readJson(path.join(ep02, 'lines.json'));
  const doc = await readJson(path.join(ep02, 'render/scenes.json'));
  let lines = linesDoc.lines;
  if (mode === 'hook') lines = lines.slice(0, doc.hook_lines);
  const timing = buildTiming(lines, estimateDurations(lines, 4.2, 30), doc, {mode, fps: 30});
  return {doc, linesDoc, timing};
}

test('cues resolve to line times, offsets and fractions', () => {
  const timing = {lines: {L01: {start: 1, end: 3}, L02: {start: 3.5, end: 7.5}}, order: ['L01', 'L02'], duration: 10};
  const scope = {start: 2, end: 6};
  assert.equal(TL.cueTime('L02', scope, timing, 't'), 3.5);
  assert.equal(TL.cueTime('L02.end+0.3', scope, timing, 't'), 7.8);
  assert.equal(TL.cueTime('L02@0.5', scope, timing, 't'), 5.5);
  assert.equal(TL.cueTime('L01.end-0.5', scope, timing, 't'), 2.5);
  assert.equal(TL.cueTime(1.25, scope, timing, 't'), 3.25);
  assert.equal(TL.cueTime('end', scope, timing, 't'), 6);
  assert.throws(() => TL.cueTime('L09', scope, timing, 't'), /not in this cut/);
  assert.throws(() => TL.cueTime('soon', scope, timing, 't'), /Bad cue/);
  assert.equal(TL.cueTime('L09', scope, Object.assign({partial: true}, timing), 't'), Infinity);
});

test('keys switch strings, interpolate numbers and record the previous value', () => {
  const keys = [{at: 1, x: 100, dur: 1, ease: 'linear'}, {at: 1.5, gesture: 'point', dur: 0}];
  const out = TL.applyKeys({x: 0, gesture: 'rest'}, keys, 1.75);
  assert.equal(out.x, 75);
  assert.equal(out.gesture, 'point');
  assert.equal(out.gesture_prev, 'rest');
  assert.equal(out.gesture_age, 0.25);
});

test('beat clock flags stretches without a new visual', () => {
  const clock = TL.beatClock([{t: 2}, {t: 4}, {t: 10}], 12, {warn_s: 2.5, fail_s: 5});
  assert.equal(clock.ok, false);
  assert.deepEqual(clock.gaps.map(g => g.level), ['fail']);
  assert.equal(TL.beatClock([{t: 2}, {t: 4}], 6).ok, true);
});

test('ep02 lines carry speaker, voice, emotion and a WAV name per line', async () => {
  const doc = await readJson(path.join(ep02, 'lines.json'));
  const scenes = await readJson(path.join(ep02, 'render/scenes.json'));
  const {speakers} = await loadRules();
  const spoken = extractSpokenLines(await fs.readFile(path.join(ep02, 'script.md'), 'utf8'), speakers);
  const names = new Set(Object.values(scenes.speakers));
  assert.equal(doc.lines.length, spoken.length);
  doc.lines.forEach((line, i) => {
    assert.equal(line.id, `L${String(i + 1).padStart(2, '0')}`);
    assert.equal(line.speaker, spoken[i].speaker);
    assert.equal(line.text, spoken[i].text);
    assert.ok(names.has(line.speaker), `${line.id}: speaker has no character id`);
    assert.equal(line.voice, doc.voices.map[line.speaker].voice, `${line.id}: voice differs from the binding`);
    assert.ok(line.emotion && line.emotion.length > 4, `${line.id}: emotion missing`);
    assert.equal(line.file, `audio/line_${line.id.slice(1)}.wav`);
  });
});

test('ep02 timeline resolves, keeps the beat clock and only uses rig expressions', async () => {
  const {doc, timing} = await ep02Timing();
  const {spec} = await loadStyle(ep02);
  const SWKit = loadKit();
  const components = new Set(SWKit.components);
  const gestures = new Set(SWKit.gestures);
  const resolved = TL.resolveScenes(doc, timing);
  const clock = TL.beatClock(resolved.events, timing.duration, doc.beat_clock);
  assert.ok(clock.ok, JSON.stringify(clock.gaps));
  assert.ok(timing.duration <= 90, `preview runs ${timing.duration} s, over the 90 s cap`);
  const check = (L, where) => {
    assert.ok(components.has(L.type), `${where}: unknown component ${L.type}`);
    if (L.type === 'character') {
      const rig = spec.rig.characters[L.id];
      assert.ok(rig, `${where}: no rig for ${L.id}`);
      for (const k of [L, ...(L.key || [])]) {
        if (k.expr) assert.ok(rig.expressions[k.expr], `${where}: ${L.id} has no expression ${k.expr}`);
        if (k.gesture) assert.ok(gestures.has(k.gesture), `${where}: unknown gesture ${k.gesture}`);
      }
    }
    (L.layers || []).forEach((c, i) => check(c, `${where}.layers[${i}]`));
  };
  for (const s of doc.scenes) [...(s.layers || []), ...(s.overlay || [])].forEach((L, i) => check(L, `${s.id}[${i}]`));
  doc.cover.layers.forEach((L, i) => check(L, `cover[${i}]`));
});

test('every ep02 frame draws through the kit without errors', async () => {
  const {doc, timing} = await ep02Timing();
  const {spec} = await loadStyle(ep02);
  const SWKit = loadKit();
  const resolved = JSON.parse(JSON.stringify(TL.resolveScenes(doc, timing)));
  const [W, H] = spec.size;
  const ctx = fakeContext();
  for (let t = 0; t < timing.duration; t += 0.5) {
    const f = TL.shotAt(resolved, timing, t, doc);
    if (f.transition) {
      SWKit.drawScene(fakeContext(), spec, f.prev, {t});
      SWKit.drawScene(fakeContext(), spec, f.shot, {t});
      SWKit.transition(ctx, {}, {}, f.transition.type, f.transition.p, W, H, f.transition);
    } else {
      SWKit.drawScene(ctx, spec, f.shot, {t});
    }
    SWKit.hud(ctx, f.shot, spec, W, H);
  }
  SWKit.renderShot(ctx, spec, doc.cover, {t: 1});
});

test('hook cut resolves with only the first lines', async () => {
  const {doc, timing} = await ep02Timing('hook');
  assert.deepEqual(timing.order, ['L01', 'L02', 'L03']);
  const resolved = TL.resolveScenes(doc, timing);
  assert.deepEqual(resolved.scenes.map(s => s.id), ['s01_hook', 's02_pick_shortest']);
  assert.ok(TL.beatClock(resolved.events, timing.duration, doc.beat_clock).ok);
});

test('series rig is up to date with the character sheets', () => {
  const r = spawnSync('python3', ['series/invisible-rules/ip/build_rig.py', '--check'], {cwd: root, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('loudnorm parser keeps only the JSON object when ffmpeg trails text', () => {
  const trailer = '[out#0/null @ 0x1] video:0KiB audio:123KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: unknown\n';
  const block = [
    '{',
    '\t"input_i" : "-19.12",',
    '\t"input_tp" : "-1.80",',
    '\t"input_lra" : "7.40",',
    '\t"input_thresh" : "-29.50",',
    '\t"output_i" : "-16.01",',
    '\t"output_tp" : "-1.50",',
    '\t"output_lra" : "7.20",',
    '\t"output_thresh" : "-26.80",',
    '\t"normalization_type" : "dynamic",',
    '\t"target_offset" : "3.11"',
    '}',
  ].join('\n');
  const parsed = parseLoudnormJson(`Parsed_loudnorm_0 @ 0xabc\n${block}\n${trailer}`);
  assert.equal(parsed.input_i, '-19.12');
  assert.equal(parsed.target_offset, '3.11');
  assert.throws(() => JSON.parse(`${block}\n${trailer}`), SyntaxError);
  assert.throws(() => parseLoudnormJson('no json here'), /no JSON object/);
});
