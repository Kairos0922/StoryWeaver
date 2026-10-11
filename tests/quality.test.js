import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {humanReviewErrors, runQuality} from '../studio/quality.mjs';
import {evaluateProfile, loadProfile, listProfiles} from '../studio/profiles.mjs';
import {checkShots} from '../studio/qc/motion_qc.mjs';

const fixture = fileURLToPath(new URL('./fixtures/sample-series/ep01', import.meta.url));

async function copyFixture() {
  const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'sw-q-')), 'ep01');
  await fs.cp(fixture, dir, {recursive: true});
  return dir;
}

test('fixture passes machine gates and waits for a person', async () => {
  const r = await runQuality(fixture);
  assert.equal(r.standard, 'v1');
  assert.deepEqual(r.machine.filter(g => !g.ok), []);
  assert.equal(r.humanOk, false);
  assert.equal(r.ok, false);
});

test('human questions reject agent signers and accept a person', async () => {
  const yes = by => ({answer: 'yes', checked_by: by});
  assert.ok(humanReviewErrors({quality_review: {hook_5s: yes('Grok Bot'), key_still: yes('Ana'), takeaway: yes('Ana')}})[0].ok === false);
  const dir = await copyFixture();
  const file = path.join(dir, 'qc', 'release.json');
  const rel = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const k of ['hook_5s', 'key_still', 'takeaway']) rel.quality_review[k] = yes('Ana');
  await fs.writeFile(file, JSON.stringify(rel));
  assert.equal((await runQuality(dir)).ok, true);
});

test('missing motion spec fails motion gates', async () => {
  const dir = await copyFixture();
  await fs.rm(path.join(dir, 'qc', 'motion.json'));
  const r = await runQuality(dir);
  assert.equal(r.machineOk, false);
  assert.ok(r.machine.find(g => g.id === 'contrast').evidence.includes('missing'));
});

test('one hero move per shot and no banned kinds', () => {
  assert.equal(checkShots([{id: 'a', moves: [{kind: 'push', role: 'hero'}]}]).ok, true);
  assert.equal(checkShots([{id: 'a', moves: [{kind: 'push', role: 'hero'}, {kind: 'cut', role: 'hero'}]}]).ok, false);
  assert.equal(checkShots([{id: 'a', moves: [{kind: 'fade-slide-up', role: 'hero'}]}]).ok, false);
  assert.equal(checkShots([]).ok, false);
});

test('children-education profile is optional and pluggable', async () => {
  assert.ok((await listProfiles()).includes('children-education'));
  const p = await loadProfile('children-education');
  const brief = '## Guess before reveal\n\nL02 guess, L04 reveal\n\n## Try it at home\n\nSort socks by color.\n';
  const lines = [{id: 'L01', beat: 'hook', text: 'Why?'}, {id: 'L02', beat: 'guess', text: 'Guess!'}, {id: 'L04', beat: 'reveal', text: 'Here it is.'}];
  assert.ok(evaluateProfile(p, {brief, lines}).every(c => c.ok));
  const bad = evaluateProfile(p, {brief: '', lines: [{id: 'L1', beat: 'reveal', text: "Don't fall behind"}]});
  assert.deepEqual(bad.filter(c => !c.ok).map(c => c.id).sort(), ['profile_guess_order', 'profile_no_anxiety', 'profile_try_it_at_home', 'profile_guess_before_reveal'].sort());
  await assert.rejects(loadProfile('nope'));
  const dir = await copyFixture();
  const bf = path.join(dir, 'brief.md');
  await fs.writeFile(bf, (await fs.readFile(bf, 'utf8')).replace('language: en', 'language: en\naudience_profile: children-education'));
  const r = await runQuality(dir);
  assert.equal(r.profile, 'children-education');
  assert.ok(r.machine.some(g => g.source === 'profile:children-education' && !g.ok));
});
