import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkDirectorReview, formatDirectorReview, SCORE_KEYS} from '../studio/director_review.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = path.join(root, 'tests/fixtures/sample-series/ep01');

async function copyFixture() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-director-'));
  const dir = path.join(parent, 'ep01');
  await fs.cp(fixture, dir, {recursive: true});
  return dir;
}

async function writeReview(dir, overrides = {}) {
  const scores = Object.fromEntries(SCORE_KEYS.map(k => [k, 9]));
  const doc = {
    schema: 'storyweaver.director_review.v1',
    episode: 'ep01',
    reviewed_by: 'Director Reviewer',
    reviewed_at: '2026-10-18',
    frames: ['thumbs/S01.png', 'thumbs/S02.png', 'thumbs/S03.png'],
    scores,
    notes: 'Keyframes checked at 390x844.',
    pass: true,
    ...overrides,
  };
  await fs.writeFile(path.join(dir, 'qc', 'director_review.json'), `${JSON.stringify(doc, null, 2)}\n`);
  return doc;
}

test('a signed scorecard with every axis >= 8 passes', async () => {
  const dir = await copyFixture();
  await writeReview(dir);
  const report = await checkDirectorReview(dir);
  assert.ok(report.ok, formatDirectorReview(report));
  assert.equal(report.code, 'DIRECTOR_REVIEW_OK');
});

test('an axis below 8 blocks the pass', async () => {
  const dir = await copyFixture();
  const doc = await writeReview(dir);
  doc.scores.text_overlap = 7;
  await fs.writeFile(path.join(dir, 'qc', 'director_review.json'), JSON.stringify(doc));
  const report = await checkDirectorReview(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('text_overlap')));
});

test('an agent-looking reviewer is rejected', async () => {
  const dir = await copyFixture();
  await writeReview(dir, {reviewed_by: 'Claude Agent'});
  const report = await checkDirectorReview(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('agents cannot sign')));
});

test('fewer than three reviewed frames blocks the pass', async () => {
  const dir = await copyFixture();
  await writeReview(dir, {frames: ['thumbs/S01.png']});
  const report = await checkDirectorReview(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('at least 3')));
});

test('a missing scorecard fails closed', async () => {
  const dir = await copyFixture();
  const report = await checkDirectorReview(dir);
  assert.equal(report.ok, false);
  assert.equal(report.code, 'DIRECTOR_REVIEW_MISSING');
});
