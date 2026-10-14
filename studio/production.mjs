// Production controls for expensive renders. Three rules, enforced by the renderer itself:
//   1. Stage order: storyboard (approved brief) → stills → voice trial → full render. Each later
//      stage needs the earlier approvals recorded by a person in qc/approvals.json, bound to the
//      exact files they approved (sha256), so editing stills or re-voicing voids the approval.
//   2. Caps: <episode>/CAPS.md sets MAX_FULL_RENDERS. Every full-render start is logged in
//      state/full_renders.jsonl and counts, finished or not. Over the cap the renderer refuses.
//      Raising the cap means editing CAPS.md *with a new approval line* from a person.
//   3. One heavy render (hook or full) per episode at a time: state/render.lock holds the PID;
//      a lock whose PID is gone is stale and is replaced.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {isAgentSigner} from './brief.mjs';

const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const fail = (code, message) => Object.assign(new Error(message), {code, exit: 4});

async function readText(file) {
  try { return await fs.readFile(file, 'utf8'); } catch { return null; }
}

// ---------- caps ----------
// CAPS.md format (one value per line; prose is free around it):
//   - MAX_FULL_RENDERS: 2
//   - APPROVED: Kairos 2026-10-14 21:32
export function parseCaps(text) {
  if (text == null) return {exists: false};
  const max = /MAX_FULL_RENDERS:\s*(\d+)/.exec(text);
  const approved = /^\s*[-*]?\s*APPROVED:\s*(.+)$/m.exec(text);
  const heading = /\(([^()]+?) approved (\d{4}-\d{2}-\d{2}[^)]*)\)/i.exec(text);
  const approval = approved ? approved[1].trim() : heading ? `${heading[1].trim()} ${heading[2].trim()}` : '';
  return {exists: true, maxFull: max ? Number(max[1]) : null, approval, sha256: sha256(text)};
}

export function capsApprovalError(caps) {
  if (!caps.exists) return 'CAPS.md is missing. Write MAX_FULL_RENDERS and an APPROVED line from a person before a full render.';
  if (caps.maxFull == null) return 'CAPS.md has no MAX_FULL_RENDERS: <n>';
  if (!caps.approval) return 'CAPS.md has no "APPROVED: <person> <date>" line';
  if (isAgentSigner(caps.approval)) return 'CAPS.md approval must come from a person, not an agent';
  if (!/\d{4}-\d{2}-\d{2}/.test(caps.approval)) return 'CAPS.md approval needs a date';
  return '';
}

export async function readLedger(episodeDir) {
  const text = await readText(path.join(episodeDir, 'state', 'full_renders.jsonl'));
  return text ? text.split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
}

export function capVerdict(caps, ledger) {
  const problem = capsApprovalError(caps);
  if (problem) return {ok: false, code: 'CAPS_MISSING', detail: problem};
  const last = ledger.at(-1);
  if (last && last.caps_sha256 !== caps.sha256 && last.caps_approval === caps.approval) {
    return {ok: false, code: 'CAPS_CHANGED_UNAPPROVED', detail: `CAPS.md changed since render ${ledger.length} but carries the same approval (${caps.approval}). A cap change needs a new APPROVED line from a person.`};
  }
  if (ledger.length >= caps.maxFull) {
    return {ok: false, code: 'RENDER_CAP', detail: `${ledger.length}/${caps.maxFull} full renders used (state/full_renders.jsonl). Stop and report; a person raises MAX_FULL_RENDERS with a new APPROVED line.`};
  }
  return {ok: true, detail: `full render ${ledger.length + 1}/${caps.maxFull} (caps approved: ${caps.approval})`};
}

export async function checkFullRenderCap(episodeDir) {
  const caps = parseCaps(await readText(path.join(episodeDir, 'CAPS.md')));
  const ledger = await readLedger(episodeDir);
  return {caps, ledger, ...capVerdict(caps, ledger)};
}

export async function recordFullRender(episodeDir, {review, caps}) {
  await fs.mkdir(path.join(episodeDir, 'state'), {recursive: true});
  const entry = {at: new Date().toISOString(), pid: process.pid, host: os.hostname(), review, caps_sha256: caps.sha256, caps_approval: caps.approval};
  await fs.appendFile(path.join(episodeDir, 'state', 'full_renders.jsonl'), `${JSON.stringify(entry)}\n`);
  return entry;
}

// ---------- stage approvals ----------
// qc/approvals.json, filled by a person:
//   {"stills": {"by": "...", "at": "YYYY-MM-DD", "sha256": "<stillsDigest>"},
//    "voice_trial": {"by": "...", "at": "YYYY-MM-DD", "file": "audio/trial.mp3", "sha256": "<file sha256>"}}
export async function stillsDigest(episodeDir) {
  const dir = path.join(episodeDir, 'stills');
  let names = [];
  try { names = (await fs.readdir(dir)).filter(n => n.endsWith('.png')).sort(); } catch { return ''; }
  if (!names.length) return '';
  const h = crypto.createHash('sha256');
  for (const n of names) h.update(n).update(await fs.readFile(path.join(dir, n)));
  return h.digest('hex');
}

function signerError(entry, label) {
  if (!entry || typeof entry !== 'object') return `${label}: no approval in qc/approvals.json`;
  const by = String(entry.by || '').trim();
  if (!by || isAgentSigner(by)) return `${label}: approval.by must be a person`;
  if (!/\d{4}-\d{2}-\d{2}/.test(String(entry.at || ''))) return `${label}: approval.at needs a date`;
  return '';
}

export async function stageApprovals(episodeDir) {
  const text = await readText(path.join(episodeDir, 'qc', 'approvals.json'));
  const data = text ? JSON.parse(text) : {};
  const stills = {stage: 'stills', error: signerError(data.stills, 'stills')};
  if (!stills.error) {
    const digest = await stillsDigest(episodeDir);
    if (!digest) stills.error = 'stills: no stills/*.png to approve';
    else if (digest !== data.stills.sha256) stills.error = `stills: approved sha256 does not match current stills/ (now ${digest.slice(0, 12)}…)`;
  }
  const voice = {stage: 'voice_trial', error: signerError(data.voice_trial, 'voice_trial')};
  if (!voice.error) {
    const file = path.resolve(episodeDir, String(data.voice_trial.file || ''));
    try {
      const digest = sha256(await fs.readFile(file));
      if (digest !== data.voice_trial.sha256) voice.error = `voice_trial: ${data.voice_trial.file} changed since approval`;
    } catch {
      voice.error = `voice_trial: approved file ${data.voice_trial.file || '(none)'} not found`;
    }
  }
  return {stills, voice_trial: voice};
}

// Which approvals a cut needs, in stage order.
export const STAGE_NEEDS = {stills: [], hook: ['stills'], full: ['stills', 'voice_trial']};

export async function assertStageOrder(episodeDir, cut) {
  const needs = STAGE_NEEDS[cut] || [];
  if (!needs.length) return [];
  const approvals = await stageApprovals(episodeDir);
  const open = needs.map(n => approvals[n]).filter(a => a.error);
  if (open.length) {
    throw fail('STAGE_ORDER', `${cut} render needs, in order, storyboard → stills → voice trial approvals:\n${open.map(a => `- ${a.error}`).join('\n')}`);
  }
  return needs;
}

// ---------- run lock ----------
export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

const lockFile = episodeDir => path.join(episodeDir, 'state', 'render.lock');

export async function readLock(episodeDir) {
  const text = await readText(lockFile(episodeDir));
  if (!text) return null;
  try {
    const lock = JSON.parse(text);
    return {...lock, alive: lock.host === os.hostname() ? pidAlive(lock.pid) : true};
  } catch {
    return {corrupt: true, alive: false};
  }
}

export async function acquireRenderLock(episodeDir, info = {}) {
  await fs.mkdir(path.join(episodeDir, 'state'), {recursive: true});
  const file = lockFile(episodeDir);
  const body = JSON.stringify({pid: process.pid, host: os.hostname(), started: new Date().toISOString(), ...info});
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await fs.writeFile(file, body, {flag: 'wx'});
      return {file, release: async () => {
        const now = await readLock(episodeDir);
        if (now?.pid === process.pid) await fs.rm(file, {force: true});
      }};
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const held = await readLock(episodeDir);
      if (held?.alive) throw fail('RENDER_LOCKED', `another render is running for this episode (pid ${held.pid}, ${held.cut || ''} since ${held.started}). Wait for it: studio render-status ${episodeDir}`);
      await fs.rm(file, {force: true}); // stale: its process is gone
    }
  }
  throw fail('RENDER_LOCKED', 'could not take the render lock');
}

// Everything a heavy render must pass before it may start (used before detaching, and again
// inside the worker under the lock).
export async function preflightHeavyRender(episodeDir, cut) {
  await assertStageOrder(episodeDir, cut);
  const held = await readLock(episodeDir);
  if (held?.alive) throw fail('RENDER_LOCKED', `another render is running (pid ${held.pid}, since ${held.started})`);
  if (cut !== 'full') return {cap: null};
  const cap = await checkFullRenderCap(episodeDir);
  if (!cap.ok) throw fail(cap.code, cap.detail);
  return {cap};
}
