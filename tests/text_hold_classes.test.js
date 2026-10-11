import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTextHold, minHold, SUB_TAIL_MAX_S} from '../studio/qc/motion_qc.mjs';
import {subtitleText, textsFromScenes} from '../studio/qc/measure_motion.mjs';

const sub = (o) => ({id: 'sub:L1', kind: 'subtitle', text: '这是一句很长很长很长很长的旁白字幕', audio_start: 1, audio_end: 3, shown_start: 1, shown_end: 3.3, ...o});

test('subtitle over its audio line passes even when shorter than the read-alone rule', () => {
  const r = checkTextHold([sub()], 'zh');
  assert.ok(minHold(sub().text, 'zh') > 2.3);
  assert.equal(r.ok, true);
});
test('subtitle cut before its audio ends fails', () => {
  assert.equal(checkTextHold([sub({shown_end: 2.9})], 'zh').ok, false);
});
test('subtitle appearing late fails; long tail fails', () => {
  assert.equal(checkTextHold([sub({shown_start: 1.2})], 'zh').ok, false);
  assert.equal(checkTextHold([sub({shown_end: 3 + SUB_TAIL_MAX_S + 0.1})], 'zh').ok, false);
});
test('subtitle missing audio timing throws instead of guessing', () => {
  assert.throws(() => checkTextHold([{id: 'sub:x', kind: 'subtitle', text: 'a'}], 'zh'));
});
test('cards and labels keep the 0.27 s/char + 0.5 s rule', () => {
  const text = '十个字的卡片内容在这里';
  const need = minHold(text, 'zh');
  assert.equal(checkTextHold([{id: 'c', kind: 'card', text, hold_s: need - 0.1}], 'zh').ok, false);
  assert.equal(checkTextHold([{id: 'c', kind: 'card', text, hold_s: need}], 'zh').ok, true);
});
test('subtitleText maps timeline line timing to subtitle fields', () => {
  const t = subtitleText('L1', {text: '你好', start: 1, end: 2, sub_end: 2.35});
  assert.deepEqual([t.kind, t.audio_start, t.audio_end, t.shown_start, t.shown_end], ['subtitle', 1, 2, 1, 2.35]);
  assert.equal(checkTextHold([t], 'zh').ok, true);
});
test('textsFromScenes classifies by element type and clips hold to enter/exit', () => {
  const spec = {palette: {ink: '#111111', white: '#FFFFFF', wall_top: '#FFFFFF'}};
  const resolved = {scenes: [{id: 's1', start: 0, end: 10, chips: [{text: '模拟结果'}], layers: [
    {type: 'fill', color: '#FFFFFF'},
    {type: 'card', text: ['甲', '乙'], header: '头', enter: {at: 2}},
    {type: 'label', text: '标签', enter: {at: 1}, exit: {at: 4, dur: 0.5}},
  ]}]};
  const {texts, contrast} = textsFromScenes(resolved, spec);
  const by = Object.fromEntries(texts.map(t => [t.id, t]));
  assert.equal(by['s1:layers[1]'].kind, 'card');
  assert.equal(by['s1:layers[1]'].hold_s, 8);
  assert.equal(by['s1:layers[2]'].kind, 'label');
  assert.equal(by['s1:layers[2]'].hold_s, 3.5);
  assert.equal(by['s1:chip'].kind, 'chip');
  assert.equal(texts.length, contrast.length);
});
