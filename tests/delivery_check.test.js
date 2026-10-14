import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, judgePlayback } from '../studio/qc/delivery_check.mjs';

test('contrast ratio matches WCAG', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(0), '21');
  assert.ok(contrastRatio([19, 35, 46], [10, 10, 10]) < 4.5);
});
test('playback judge catches early end and jumps', () => {
  const ok = [{ type: 'tick', t: 0 }, { type: 'tick', t: 1 }, { type: 'ended', t: 10 }];
  assert.ok(judgePlayback(ok, 10).ok);
  const early = [{ type: 'tick', t: 0 }, { type: 'tick', t: 15 }, { type: 'ended', t: 86 }];
  assert.ok(!judgePlayback(early, 86).ok);
  assert.ok(!judgePlayback([{ type: 'ended', t: 15 }], 86).ok);
});
