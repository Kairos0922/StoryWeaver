import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkEpisodeStyle, checkSeriesLock, measureLock, validateLock, validateLockV2, writeLock} from '../studio/style/style_lock.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const series = path.join(root, 'tests/fixtures/sample-series');
const episode = path.join(series, 'ep01');
const v1 = JSON.parse(await fs.readFile(path.join(series, 'series-style.json'), 'utf8'));

async function copySeries() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-lock-v2-'));
  await fs.cp(series, dir, {recursive: true});
  return dir;
}

function approve(lock) {
  lock.approval = {by: 'Fixture Reviewer', at: '2026-10-17'};
  for (const character of Object.values(lock.characters)) {
    character.approval = {by: 'Fixture Reviewer', at: '2026-10-17'};
  }
  return lock;
}

test('v1 locks still validate', () => {
  assert.deepEqual(validateLock(v1), []);
});

test('measureLock builds a v2 draft from the first episode', async () => {
  const measured = await measureLock(episode);
  const lock = measured.lock;
  assert.equal(lock.schema, 'storyweaver.series_style.v2');
  assert.equal(lock.palette.ink, '#13232E');
  assert.ok(lock.fonts.families.includes('Noto Sans CJK SC'));
  assert.ok(lock.characters.pebble);
  assert.match(lock.rig.sha256, /^[0-9a-f]{64}$/);
  assert.equal(lock.voice.provider, 'dry-run');
  assert.equal(lock.voice.voice_id, 'fixture-dry-run');
  assert.equal(lock.voice.speech_rate, -12);
  assert.ok(measured.warnings.some(warning => warning.includes('approval')));

  const issues = validateLockV2(lock);
  assert.ok(issues.some(issue => issue.includes('lock has no human approval')));
  assert.ok(issues.some(issue => issue.includes('pebble has no human series approval')));
});

test('an approved v2 lock matches the first episode and the series check', async () => {
  const dir = await copySeries();
  const measured = await measureLock(path.join(dir, 'ep01'));
  const lock = approve(measured.lock);
  assert.deepEqual(validateLockV2(lock), []);
  await writeLock(dir, lock, {force: true});

  const one = await checkEpisodeStyle(path.join(dir, 'ep01'));
  assert.ok(one.locked && one.ok, one.evidence);

  const all = await checkSeriesLock(dir);
  assert.equal(all.code, 'LOCK_OK', JSON.stringify(all));
});

test('writeLock refuses to replace a lock without force', async () => {
  const dir = await copySeries();
  const measured = await measureLock(path.join(dir, 'ep01'));
  await writeLock(dir, measured.lock, {force: true});
  await assert.rejects(() => writeLock(dir, measured.lock), error => error.code === 'LOCK_EXISTS');
  const again = await writeLock(dir, measured.lock, {force: true});
  assert.equal(again.lock.schema, 'storyweaver.series_style.v2');
});

test('v2 rejects missing rig, voice and approval fields', () => {
  const base = {
    schema: 'storyweaver.series_style.v2',
    approval: {by: 'Fixture Reviewer', at: '2026-10-17'},
    palette: {ink: '#000000'},
    palette_aliases: [],
    fonts: {families: ['Noto Sans CJK SC'], library_ids: [], weights: []},
    characters: {pebble: {name: 'Pebble', colors: [], expressions: [], approval: {by: 'Fixture Reviewer', at: '2026-10-17'}}},
    camera: {zoom: [1, 1], max_rot_deg: 0, max_shake: 0, max_hit_zoom: 0, transitions: ['cut'], language: ''},
    line: {ink: '#000000', stroke_px: [1, 1], shading: ''},
    motion: {scene_eases: [], tokens: []},
  };
  const issues = validateLockV2(base);
  assert.ok(issues.includes('rig.sha256 must be a sha256 hex digest'));
  assert.ok(issues.includes('missing voice.provider'));
  assert.ok(issues.includes('missing voice.voice_id'));
  assert.ok(issues.includes('voice.speech_rate must be a number'));
});
