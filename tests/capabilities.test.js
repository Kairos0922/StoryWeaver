import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {episodeCapabilityIssues, parseRequires} from '../studio/capabilities.mjs';

async function episode(brief, acceptance) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-cap-'));
  await fs.writeFile(path.join(dir, 'brief.md'), brief);
  if (acceptance) await fs.writeFile(path.join(dir, 'acceptance.md'), acceptance);
  return dir;
}

test('requires parses comma lists and arrays', () => {
  assert.deepEqual(parseRequires('blender-3d, foo'), ['blender-3d', 'foo']);
  assert.deepEqual(parseRequires('[blender-3d]'), ['blender-3d']);
  assert.deepEqual(parseRequires(''), []);
});

test('an acceptance standard that promises 3D without declaring it fails early', async () => {
  const dir = await episode('---\nstatus: draft\n---\n# brief\n', '8. 3D 环路要一眼看懂');
  const issues = await episodeCapabilityIssues(dir);
  assert.ok(issues.some(i => i.id === 'capability_undeclared' && i.detail.includes('acceptance.md')));
});

test('a declared capability without a working install and passing sample fails', async t => {
  const saved = {BLENDER: process.env.BLENDER, SW_CAPABILITY_DIR: process.env.SW_CAPABILITY_DIR};
  process.env.BLENDER = '/nonexistent/blender';
  process.env.SW_CAPABILITY_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-caprec-'));
  t.after(() => { for (const [k, v] of Object.entries(saved)) if (v == null) delete process.env[k]; else process.env[k] = v; });
  const dir = await episode('---\nrequires: blender-3d\n---\n# brief\n真 3D 环路\n');
  const issues = await episodeCapabilityIssues(dir);
  assert.deepEqual(issues.map(i => i.id), ['capability_missing']);
});

test('no promise, no requirement: no issues', async () => {
  const dir = await episode('---\nstatus: draft\n---\n# brief\n平面环路，2.5D 运镜\n');
  assert.deepEqual(await episodeCapabilityIssues(dir), []);
});
