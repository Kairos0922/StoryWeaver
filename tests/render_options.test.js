import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFps, normalizeMotionBlur, subframeTimes} from '../studio/render/options.mjs';

test('fps defaults to 30 and accepts 24/30/60', () => {
  assert.equal(normalizeFps(), 30);
  assert.equal(normalizeFps(24), 24);
  assert.equal(normalizeFps(30), 30);
  assert.equal(normalizeFps(60), 60);
  assert.equal(normalizeFps('60'), 60);
});

test('fps rejects out-of-range and non-numeric values', () => {
  for (const value of [0, 61, -1, 'fast', NaN]) {
    assert.throws(() => normalizeFps(value), /--fps/);
  }
});

test('motion blur defaults to off and accepts 1–8 samples', () => {
  assert.equal(normalizeMotionBlur(), 1);
  assert.equal(normalizeMotionBlur(1), 1);
  assert.equal(normalizeMotionBlur(4), 4);
  assert.equal(normalizeMotionBlur('8'), 8);
  for (const value of [0, 9, -1, 'blur', NaN]) {
    assert.throws(() => normalizeMotionBlur(value), /--motion-blur/);
  }
});

test('subframe times are centred on t, sorted, and stay inside a half-frame shutter', () => {
  const t = 5;
  const fps = 30;
  const times = subframeTimes(t, fps, 3);
  assert.equal(times.length, 3);
  assert.deepEqual([...times].sort((a, b) => a - b), times);
  assert.ok(Math.abs(times[1] - t) < 1e-9);
  for (const x of times) assert.ok(Math.abs(x - t) <= 0.5 / fps + 1e-9);
});

test('subframe times clamp the first frame at t=0 and return one value when blur is off', () => {
  assert.deepEqual(subframeTimes(0, 30, 3).every(x => x >= 0), true);
  assert.deepEqual(subframeTimes(5, 30, 1), [5]);
});
