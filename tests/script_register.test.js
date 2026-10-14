import test from 'node:test';
import assert from 'node:assert/strict';
import {lintFile, parallelClauses, normalizeLines} from '../studio/lint/lint_script.mjs';
import {loadPack} from '../studio/lint/lint_script.mjs';

const fx = v => new URL(`./fixtures/register/${v}/lines.json`, import.meta.url).pathname;
const rules = r => r.errors.map(e => e.rule);

test('EP03 v1 (host register) is blocked', async () => {
  const r = await lintFile(fx('v1'));
  assert.equal(r.ok, false);
  for (const id of ['register-we-experiment', 'parallel-clauses', 'character-sentence-length', 'written-register']) assert.ok(rules(r).includes(id), id);
});

test('EP03 v2 (tidy lines Kairos rejected) is blocked, including 没路口，没红绿灯', async () => {
  const r = await lintFile(fx('v2'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.rule === 'parallel-clauses' && e.excerpt.includes('没路口')));
  assert.ok(r.errors.some(e => e.rule === 'written-register' && e.message.includes('咱们把这条路搬进电脑')));
});

test('EP03 v3 (kids talking, accepted) passes', async () => {
  const r = await lintFile(fx('v3'));
  assert.deepEqual(r.errors, []);
});

test('parallel clauses need two short clauses with the same negation lead', async () => {
  const {parallel_clauses: rule} = await loadPack('zh');
  assert.ok(parallelClauses('没路口，没事故，只剩车。', rule));
  assert.equal(parallelClauses('前面明明啥也没有啊？没灯，也没撞——', rule), '');
  assert.equal(parallelClauses('不对不对，车明明往前开的啊！', rule), '');
});

test('written patterns: 不是…而是, 你知道吗, 其实, 总结', async () => {
  const {lintText} = await import('../studio/lint/lint_script.mjs');
  const r = await lintText(JSON.stringify({lines: [
    {speaker: '阿规', text: '堵车不是谁的错，而是车距太短。'},
    {speaker: '阿规', text: '你知道吗？'},
    {speaker: '阿规', text: '其实很简单。'},
    {speaker: '阿规', text: '总结一下。'},
  ]}), {filename: 'lines.json', language: 'zh'});
  for (const id of ['register-not-but', 'register-you-know', 'register-actually', 'register-summary']) assert.ok(rules(r).includes(id), id);
});

test('script drafts as row arrays or bare object lists normalize to speaker/text', () => {
  assert.deepEqual(normalizeLines([['S1', '等等', '啊——又堵！', 'pic']], ['等等']), [{speaker: '等等', text: '啊——又堵！'}]);
  assert.deepEqual(normalizeLines([{speaker: '嘀嗒', text: '零。'}]), [{speaker: '嘀嗒', text: '零。'}]);
});

test('TTS opens only through the lines checkpoint', async () => {
  const {openEpisodeTts} = await import('../studio/tts/interface.mjs');
  const os = await import('node:os');
  const fs = await import('node:fs/promises');
  const empty = await fs.mkdtemp(`${os.tmpdir()}/sw-tts-`);
  await assert.rejects(() => openEpisodeTts(empty, 'dry-run'), e => e.code === 'TTS_BLOCKED');
  const ok = await openEpisodeTts(new URL('./fixtures/sample-series/ep01', import.meta.url).pathname, 'dry-run');
  assert.equal(typeof ok.synthesize, 'function');
});
