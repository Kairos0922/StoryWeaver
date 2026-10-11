import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {humanReviewErrors, runQuality} from '../studio/quality.mjs';
import {evaluateProfile, loadProfile, listProfiles} from '../studio/profiles.mjs';
import {checkShots} from '../studio/qc/motion_qc.mjs';
import {renderEpisode} from '../studio/render/browser/pipeline.mjs';
import {DETERMINISM_INPUTS, compareRenders, evaluateDeterminism, sampleFrames} from '../studio/render/browser/determinism.mjs';

const fixture = fileURLToPath(new URL('./fixtures/sample-series/ep01', import.meta.url));

async function copyFrom(src) {
  const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'sw-q-')), 'ep01');
  await fs.cp(src, dir, {recursive: true});
  return dir;
}

// The deterministic gate needs qc/determinism.json, which only the render pipeline writes.
let rendered;
function renderedFixture() {
  rendered ||= (async () => {
    const dir = await copyFrom(fixture);
    await renderEpisode(dir, {review: 'draft', cut: 'preview', reviewOnly: true, noVideo: true, until: 1.2, workers: 1});
    return dir;
  })();
  return rendered;
}

async function copyFixture() {
  return copyFrom(await renderedFixture());
}

test('fixture passes machine gates and waits for a person', async () => {
  const r = await runQuality(await renderedFixture());
  assert.equal(r.standard, 'v1');
  assert.deepEqual(r.machine.filter(g => !g.ok), []);
  assert.equal(r.humanOk, false);
  assert.equal(r.ok, false);
});

test('human questions reject agent signers and accept a person', async () => {
  const yes = by => ({answer: 'yes', checked_by: by});
  assert.ok(humanReviewErrors({quality_review: {hook_5s: yes('Grok Bot'), key_still: yes('Ana'), takeaway: yes('Ana'), whole_piece: yes('Ana')}})[0].ok === false);
  const dir = await copyFixture();
  const file = path.join(dir, 'qc', 'release.json');
  const rel = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const k of ['hook_5s', 'key_still', 'takeaway', 'whole_piece']) rel.quality_review[k] = yes('Ana');
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

test('render pipeline writes qc/determinism.json from two fresh-context passes', async () => {
  const doc = JSON.parse(await fs.readFile(path.join(await renderedFixture(), 'qc', 'determinism.json'), 'utf8'));
  assert.equal(doc.created_by, 'studio/render/browser/determinism');
  assert.equal(doc.ok, true);
  assert.ok(doc.frames.length >= 2);
  assert.equal(doc.frames[0].frame, 0);
  assert.equal(doc.frames.at(-1).frame, doc.render.frames - 1);
  for (const rel of DETERMINISM_INPUTS) assert.match(doc.inputs[rel], /^[0-9a-f]{64}$/);
});

test('sample is first, last, scene starts and seeded picks; same seed same sample', () => {
  const a = sampleFrames({frames: 300, fps: 30, boundaries: [0, 2, 5.5], seed: 'x'});
  assert.deepEqual(a, sampleFrames({frames: 300, fps: 30, boundaries: [0, 2, 5.5], seed: 'x'}));
  for (const i of [0, 60, 165, 299]) assert.ok(a.includes(i));
  assert.equal(a.length, 8);
  assert.deepEqual(sampleFrames({frames: 2, fps: 30, seed: 'y'}), [0, 1]);
});

test('compareRenders flags a frame that differs between passes', async () => {
  let pass = 0;
  const r = await compareRenders({
    indices: [0, 3], fps: 30,
    openPass: async () => ++pass,
    frameAt: async (p, t) => Buffer.from(p === 2 && t > 0 ? 'b' : 'a').toString('base64'),
    closePass: async () => {},
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.frames.map(f => f.match), [true, false]);
});

test('deterministic gate fails when the report is missing, hand-written, stale, or mismatched', async () => {
  const gate = async dir => (await runQuality(dir)).machine.find(g => g.id === 'deterministic');
  const missing = await copyFrom(fixture);
  assert.match((await gate(missing)).evidence, /missing qc\/determinism\.json/);

  const hand = await copyFrom(fixture);
  await fs.writeFile(path.join(hand, 'qc', 'determinism.json'), JSON.stringify({first: ['a'], second: ['a']}));
  assert.equal((await evaluateDeterminism(hand)).ok, false);

  const stale = await copyFixture();
  const lines = path.join(stale, 'lines.json');
  await fs.writeFile(lines, (await fs.readFile(lines, 'utf8')) + '\n');
  assert.match((await gate(stale)).evidence, /stale/);

  const bad = await copyFixture();
  const file = path.join(bad, 'qc', 'determinism.json');
  const doc = JSON.parse(await fs.readFile(file, 'utf8'));
  doc.frames[0].second = '0'.repeat(64);
  await fs.writeFile(file, JSON.stringify(doc));
  const g = await gate(bad);
  assert.equal(g.ok, false);
  assert.match(g.evidence, /differs at frame/);
});

test('v1.1: whole_piece is required and agent-proof', async () => {
  const yes = by => ({answer: 'yes', checked_by: by});
  const three = {hook_5s: yes('Ana'), key_still: yes('Ana'), takeaway: yes('Ana')};
  const r = humanReviewErrors({quality_review: three});
  assert.equal(r.length, 4);
  assert.equal(r.find(x => x.id === 'whole_piece').ok, false);
  assert.equal(humanReviewErrors({quality_review: {...three, whole_piece: yes('Grok Bot')}}).find(x => x.id === 'whole_piece').ok, false);
  assert.ok(humanReviewErrors({quality_review: {...three, whole_piece: yes('Ana')}}).every(x => x.ok));
});
