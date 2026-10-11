import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkBriefAgainstLock, checkEpisodeStyle, checkSceneDoc, validateLock} from '../studio/style/style_lock.mjs';
import {evaluateCheckpoint} from '../studio/checkpoint.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const series = path.join(root, 'tests/fixtures/sample-series');
const lock = JSON.parse(await fs.readFile(path.join(series, 'series-style.json'), 'utf8'));

async function copySeries() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-style-'));
  await fs.cp(series, dir, {recursive: true});
  return dir;
}

test('fixture episode matches its series lock', async () => {
  assert.deepEqual(validateLock(lock), []);
  const r = await checkEpisodeStyle(path.join(series, 'ep01'));
  assert.ok(r.locked && r.ok, r.evidence);
});

test('lock rejects off-palette colors, unlisted fonts, new characters, camera and ease drift', () => {
  const doc = {
    palette: {ink: '#000000'},
    fonts: {family: '"Comic Sans MS", sans-serif'},
    speakers: {robo: 'Robo'},
    scenes: [{
      id: 's1',
      camera: {x: 0, y: 0, zoom: 2},
      camera_hits: [{at: 1, shake: 40}],
      layers: [
        {type: 'label', text: 'x', color: 'purple'},
        {type: 'fill', color: '#7B2FF7'},
        {type: 'character', id: 'robo'},
        {type: 'character', id: 'pebble', expr: 'furious'},
        {type: 'iris', at: 1},
        {type: 'label', text: 'y', enter: {ease: 'elastic'}},
      ],
    }],
  };
  const issues = checkSceneDoc(lock, doc, 'scenes').join('\n');
  for (const want of [/palette\.ink overrides/, /Comic Sans MS/, /speaker robo/, /zoom 2/, /shake 40/,
    /purple is not a series palette name/, /off-palette color #7B2FF7/, /character robo has no series approval/,
    /expression furious/, /transition iris/, /ease elastic/]) {
    assert.match(issues, want);
  }
});

test('brief may not override locked keys; fonts come from the lock', () => {
  const issues = checkBriefAgainstLock(lock, '---\npalette: neon\nfont_display: other\nfont_body: pebble\n---\n## Style override\n');
  assert.equal(issues.length, 3, issues.join('\n'));
});

test('a character without human series approval invalidates the lock', () => {
  const bad = structuredClone(lock);
  bad.characters.robo = {name: 'Robo', approval: {by: 'grok agent', at: '2026-10-11'}};
  assert.match(validateLock(bad).join('\n'), /robo has no human series approval/);
});

test('style deviation blocks the brief checkpoint and the qc gate', async () => {
  const dir = await copySeries();
  const scenes = path.join(dir, 'ep01/render/scenes.json');
  await fs.writeFile(scenes, (await fs.readFile(scenes, 'utf8')).replace('"color": "ink"', '"color": "#FF00FF"'));
  const r = await evaluateCheckpoint(path.join(dir, 'ep01'), 'brief');
  assert.equal(r.code, 'BRIEF_INCOMPLETE');
  assert.ok(r.issues.some(i => i.id === 'style_lock'));
  const s = await evaluateCheckpoint(path.join(dir, 'ep01'), 'stills');
  assert.ok(s.blockers.some(b => b.id === 'style_lock'));
});

test('no lock file means unlocked, not failed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-nolock-'));
  await fs.mkdir(path.join(dir, 'ep01'));
  const r = await checkEpisodeStyle(path.join(dir, 'ep01'));
  assert.equal(r.locked, false);
  assert.equal(r.ok, true);
});
