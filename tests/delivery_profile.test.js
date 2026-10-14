import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DELIVERY_VIDEO} from '../studio/render/kit/canvas/build_episode.mjs';

test('delivery profile: H.264 High@4.1 with a bitrate ceiling of at most 6 Mbps', () => {
  const at = k => DELIVERY_VIDEO[DELIVERY_VIDEO.indexOf(k) + 1];
  assert.equal(at('-profile:v'), 'high');
  assert.equal(at('-level:v'), '4.1');
  assert.ok(parseInt(at('-maxrate'), 10) <= 6000);
});

test('final mux carries no soft subtitle track', () => {
  const src = fs.readFileSync(new URL('../studio/render/kit/canvas/build_episode.mjs', import.meta.url), 'utf8');
  assert.ok(!src.includes("'-c:s', 'mov_text'"));
  assert.ok(!/'-map', '2:s'/.test(src));
});
