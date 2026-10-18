import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {acquireRenderLock, assertStageOrder, capVerdict, parseCaps, readLock, stillsDigest} from '../studio/production.mjs';

const tmp = () => fs.mkdtemp(path.join(os.tmpdir(), 'sw-prod-'));

test('EP03 CAPS.md heading approval and cap parse', () => {
  const caps = parseCaps('# EP03 finish caps (Kairos approved 2026-10-14 21:32 Asia/Shanghai)\n\n- MAX_FULL_RENDERS: 2\n');
  assert.equal(caps.maxFull, 2);
  assert.match(caps.approval, /^Kairos 2026-10-14/);
});

test('caps: missing, agent-approved, at cap, and changed without new approval all refuse', () => {
  assert.equal(capVerdict(parseCaps(null), []).code, 'CAPS_MISSING');
  assert.equal(capVerdict(parseCaps('- MAX_FULL_RENDERS: 2\n- APPROVED: Grok Bot 2026-10-14'), []).code, 'CAPS_MISSING');
  const caps = parseCaps('- MAX_FULL_RENDERS: 2\n- APPROVED: Kairos 2026-10-14');
  const entry = {caps_sha256: caps.sha256, caps_approval: caps.approval};
  assert.equal(capVerdict(caps, []).ok, true);
  assert.equal(capVerdict(caps, [entry, entry]).code, 'RENDER_CAP');
  const raised = parseCaps('- MAX_FULL_RENDERS: 3\n- APPROVED: Kairos 2026-10-14');
  assert.equal(capVerdict(raised, [entry, entry]).code, 'CAPS_CHANGED_UNAPPROVED');
  const approved = parseCaps('- MAX_FULL_RENDERS: 3\n- APPROVED: Kairos 2026-10-15 (one more for the subtitle fix)');
  assert.equal(capVerdict(approved, [entry, entry]).ok, true);
});

test('render lock: one holder at a time; a dead PID is stale and replaced', async () => {
  const dir = await tmp();
  const lock = await acquireRenderLock(dir, {cut: 'full'});
  await assert.rejects(() => acquireRenderLock(dir), e => e.code === 'RENDER_LOCKED');
  await lock.release();
  await fs.writeFile(path.join(dir, 'state', 'render.lock'), JSON.stringify({pid: 2 ** 22 + 12345, host: os.hostname(), started: 'x'}));
  assert.equal((await readLock(dir)).alive, false);
  const again = await acquireRenderLock(dir);
  assert.equal((await readLock(dir)).pid, process.pid);
  await again.release();
});

test('stage order: full needs stills then voice trial approvals bound to the files', async () => {
  const dir = await tmp();
  await fs.mkdir(path.join(dir, 'stills'));
  await fs.mkdir(path.join(dir, 'qc'));
  await fs.mkdir(path.join(dir, 'audio'));
  await fs.writeFile(path.join(dir, 'stills', 'k01.png'), 'a');
  await fs.writeFile(path.join(dir, 'audio', 'trial.mp3'), 'v');
  await assert.rejects(() => assertStageOrder(dir, 'hook'), e => e.code === 'STAGE_ORDER');
  const stills = {by: 'Kairos', at: '2026-10-15', sha256: await stillsDigest(dir)};
  await fs.writeFile(path.join(dir, 'qc', 'approvals.json'), JSON.stringify({stills}));
  await assertStageOrder(dir, 'hook');
  await assert.rejects(() => assertStageOrder(dir, 'full'), /voice_trial/);
  const voice = {by: 'Kairos', at: '2026-10-15', file: 'audio/trial.mp3', sha256: crypto.createHash('sha256').update('v').digest('hex')};
  await fs.writeFile(path.join(dir, 'qc', 'approvals.json'), JSON.stringify({stills, voice_trial: voice}));
  await assertStageOrder(dir, 'full');
  await fs.writeFile(path.join(dir, 'stills', 'k01.png'), 'changed');
  await assert.rejects(() => assertStageOrder(dir, 'full'), /stills: approved sha256/);
  await fs.writeFile(path.join(dir, 'qc', 'approvals.json'), JSON.stringify({stills: {...stills, by: 'cursor agent'}, voice_trial: voice}));
  await assert.rejects(() => assertStageOrder(dir, 'full'), /must be a person/);
});

test('detached job: worker gets --foreground, logs to out/logs, job recorded', async () => {
  const {startDetachedRender, renderStatus} = await import('../studio/jobs.mjs');
  const dir = await tmp();
  const job = await startDetachedRender(dir, ['help']);
  for (let i = 0; i < 50 && !(await renderStatus(dir)).tail.length; i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 300));
  const status = await renderStatus(dir);
  assert.equal(status.job.pid, job.pid);
  const log = await fs.readFile(status.job.log, 'utf8');
  assert.ok(log.startsWith('knowledge-video-studio'));
  assert.ok(log.includes('render-status'));
});
