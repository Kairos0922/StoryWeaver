import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkFactCheck, formatFactCheck} from '../studio/fact_check.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = path.join(root, 'tests/fixtures/sample-series/ep01');

async function copyFixture() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-fact-'));
  const dir = path.join(parent, 'ep01');
  await fs.cp(fixture, dir, {recursive: true});
  return dir;
}

async function readLedger(dir) {
  return JSON.parse(await fs.readFile(path.join(dir, 'qc', 'fact_check.json'), 'utf8'));
}

async function writeLedger(dir, doc) {
  await fs.writeFile(path.join(dir, 'qc', 'fact_check.json'), `${JSON.stringify(doc, null, 2)}\n`);
}

test('the fixture ledger is signed and passes', async () => {
  const dir = await copyFixture();
  const report = await checkFactCheck(dir);
  assert.ok(report.ok, formatFactCheck(report));
  assert.equal(report.code, 'FACT_CHECK_OK');
});

test('a missing human review blocks the ledger', async () => {
  const dir = await copyFixture();
  const doc = await readLedger(dir);
  doc.review = {by: '', at: '', statement: doc.review.statement};
  await writeLedger(dir, doc);
  const report = await checkFactCheck(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('review.by')));
});

test('an agent-looking reviewer is rejected', async () => {
  const dir = await copyFixture();
  const doc = await readLedger(dir);
  doc.review.by = 'Claude Agent';
  await writeLedger(dir, doc);
  const report = await checkFactCheck(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('agents cannot sign')));
});

test('editing lines makes the ledger stale', async () => {
  const dir = await copyFixture();
  const linesFile = path.join(dir, 'lines.json');
  const lines = JSON.parse(await fs.readFile(linesFile, 'utf8'));
  lines.lines[0].text = `${lines.lines[0].text} (edited)`;
  await fs.writeFile(linesFile, `${JSON.stringify(lines, null, 2)}\n`);
  const report = await checkFactCheck(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('lines_sha256 is stale')));
});

test('an unsupported claim blocks the ledger', async () => {
  const dir = await copyFixture();
  const doc = await readLedger(dir);
  doc.claims[0].status = 'unsupported';
  await writeLedger(dir, doc);
  const report = await checkFactCheck(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('unsupported')));
});

test('a key-number line without a claim blocks the ledger', async () => {
  const dir = await copyFixture();
  const doc = await readLedger(dir);
  doc.claims = [{
    id: 'F1',
    claim: 'A claim on another line.',
    kind: 'fact',
    line_ids: ['L01'],
    source: {type: 'primary', title: 'Fixture source', citation: 'fixture'},
    status: 'verified',
  }];
  await writeLedger(dir, doc);
  const report = await checkFactCheck(dir);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some(issue => issue.includes('key number line L02')));
});
