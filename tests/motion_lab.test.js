import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EASINGS, beatFrame, cueFrames, ease, easingFor, exitDuration, spring, springFor} from '../studio/motion/tokens.js';
import {lintPins, lintSource} from '../studio/lint/render_contract.mjs';
import {checkContrast, checkFlashes, checkSfxSync, checkTextHold, hardStops, minHold, runMotionQc} from '../studio/qc/motion_qc.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('render-contract lint catches banned calls and ignores comments', () => {
  const src = 'const a = Date.now();\nrequestAnimationFrame(f);\nsetTimeout(f, 1);\nMath.random();\nfetch("https://x.y");\nel.style.cssText = "transition: opacity 0.3s";\n// Math.random() in a comment\nconst o = {transition: tr};';
  assert.deepEqual(lintSource(src).map(f => f.rule), ['no-date', 'no-raf', 'no-timers', 'no-unseeded-random', 'no-network', 'no-css-motion']);
  assert.equal(lintPins({dependencies: {a: '^1.0.0', b: '1.2.3'}}).length, 1);
});

test('five named easings hit their endpoints', () => {
  assert.equal(Object.keys(EASINGS).length, 5);
  for (const name of Object.keys(EASINGS)) {
    assert.equal(ease(name, 0), 0);
    assert.equal(ease(name, 1), 1);
  }
  assert.ok(ease('outExpo', 0.2) > 0.6);
  assert.ok(ease('inExpo', 0.2) < 0.05);
});

test('opacity and color never bounce', () => {
  assert.throws(() => easingFor('opacity', 'outBack'));
  assert.doesNotThrow(() => easingFor('x', 'outBack'));
  for (let t = 0; t <= 2; t += 1 / 30) assert.ok(springFor('opacity', t, 0.3) <= 1 + 1e-9);
  const peak = Math.max(...Array.from({length: 60}, (_, i) => spring(i / 30, 0.3)));
  assert.ok(peak > 1.2);
});

test('springs are closed-form and seekable', () => {
  assert.equal(spring(0.42, 0.8), spring(0.42, 0.8));
  for (const z of [0.25, 0.5, 0.8, 1, 1.5]) assert.ok(Math.abs(spring(5, z) - 1) < 1e-3);
});

test('exits are 40-50% shorter', () => {
  assert.equal(exitDuration(1), 0.55);
  assert.throws(() => exitDuration(1, 0.9));
});

test('beat grid rounds per beat and does not drift', () => {
  const fps = 30, bpm = 112;
  let acc = 0;
  for (let n = 1; n <= 400; n++) acc += Math.round((60 * fps) / bpm);
  assert.equal(beatFrame(400, bpm, fps), Math.round((400 * 60 * fps) / bpm));
  assert.notEqual(acc, beatFrame(400, bpm, fps));
  assert.deepEqual(cueFrames([0, 1.016, 2.5]), [0, 30, 75]);
});

test('text hold, contrast, flashes, sfx sync', () => {
  assert.equal(minHold('one two three', 'en'), 1.4);
  // 6 chars × 0.27 s/char + 0.5 s = 2.12 s; rate from zh pack comfortable_per_s 3.7
  assert.equal(minHold('排队为什么慢', 'zh'), 2.12);
  const zh = checkTextHold([{id: 'a', text: '排队为什么慢', hold_s: 2.12}], 'zh');
  assert.equal('provisional' in zh, false);
  assert.equal(zh.ok, true);
  assert.equal(zh.rule, '0.27s/char + 0.5s');
  assert.equal(checkTextHold([{id: 'a', text: '排队为什么慢', hold_s: 1.5}], 'zh').ok, false);
  assert.equal(checkContrast([{id: 'x', fg: '#777777', bg: '#888888'}]).ok, false);
  assert.equal(checkContrast([{id: 'x', fg: '#ffffff', bg: '#000000'}]).ok, true);
  const strobe = Array.from({length: 30}, (_, i) => (i % 2 ? 0.9 : 0.1));
  assert.equal(checkFlashes(strobe, 30).ok, false);
  const calm = Array.from({length: 60}, (_, i) => (Math.floor(i / 20) % 2 ? 0.6 : 0.2));
  assert.equal(checkFlashes(calm, 30).ok, true);
  assert.equal(checkSfxSync([{id: 'hit', frame: 30}], [31 / 30]).ok, true);
  assert.equal(checkSfxSync([{id: 'hit', frame: 30}], [27 / 30]).ok, false);
});

test('motion-qc writes onion skin and speed graph', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'mqc-'));
  const report = await runMotionQc(path.join(root, 'tests/fixtures/motion-qc/spec.json'), out);
  assert.equal(report.ok, true);
  for (const f of ['hero.onion.svg', 'hero.speed.svg', 'report.json']) assert.ok((await fs.stat(path.join(out, f))).size > 0);
  const jerk = [0, 1, 2, 3].map(f => ({frame: f, x: f < 3 ? f * 100 : 200, y: 0}));
  assert.deepEqual(hardStops(jerk), [3]);
});
