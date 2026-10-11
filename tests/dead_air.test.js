import test from 'node:test';
import assert from 'node:assert/strict';
import {checkStatic, checkSilence} from '../studio/qc/motion_qc.mjs';
import {diffsFromGray, parseSilences} from '../studio/qc/measure_motion.mjs';

test('static picture over 5 s fails, motion breaks the run', () => {
  const still = Array(24).fill(0);           // 6 s at 4 fps
  assert.equal(checkStatic(still, 4).ok, false);
  assert.equal(checkStatic(still.slice(0, 19), 4).ok, true); // 4.75 s
  const broken = [...Array(12).fill(0), 0.01, ...Array(12).fill(0)];
  assert.equal(checkStatic(broken, 4).ok, true);
  const r = checkStatic(still, 4);
  assert.deepEqual([r.items[0].from_s, r.items[0].still_s], [0, 6]);
});
test('diffsFromGray counts changed pixels per step', () => {
  const px = 10;
  const buf = Buffer.from([...Array(10).fill(100), ...Array(10).fill(100), ...Array(5).fill(100), ...Array(5).fill(200)]);
  assert.deepEqual(diffsFromGray(buf, px, 16), [0, 0.5]);
});
test('silence over 2 s outside silent_beats fails; inside passes', () => {
  const s = [{from_s: 10, to_s: 13}];
  assert.equal(checkSilence(s, []).ok, false);
  assert.equal(checkSilence(s, [{from_s: 9.5, to_s: 13.5}]).ok, true);
  assert.equal(checkSilence([{from_s: 1, to_s: 2.5}], []).ok, true);
});
test('parseSilences reads ffmpeg silencedetect output', () => {
  const err = '[silencedetect @ 0x1] silence_start: 4.5\n[silencedetect @ 0x1] silence_end: 7.25 | silence_duration: 2.75\n';
  assert.deepEqual(parseSilences(err), [{from_s: 4.5, to_s: 7.25}]);
});
