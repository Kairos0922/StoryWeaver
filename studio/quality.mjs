import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {isAgentSigner} from './brief.mjs';
import {fileExists} from './qc/checks.mjs';
import {runQc} from './qc/run_qc.mjs';
import {runMotionQc} from './qc/motion_qc.mjs';
import {lintRenderContract} from './lint/render_contract.mjs';
import {checkProfile, sectionBody} from './profiles.mjs';
import {evaluateDeterminism} from './render/browser/determinism.mjs';

export const STANDARD_VERSION = 'v1';

// The three human-only questions. Agents cannot answer them.
export const HUMAN_QUESTIONS = Object.freeze([
  {id: 'hook_5s', question: 'After the first 5 seconds, does the viewer want to keep watching?'},
  {id: 'key_still', question: 'Is every key still presentable on its own?'},
  {id: 'takeaway', question: 'After watching, can the viewer state the takeaway in one sentence, and do they want to try it?'},
]);

// Machine gate -> existing check that enforces it.
const QC_GATES = [
  ['pace', 'pace_ok'],
  ['no_ai_phrasing', 'script_lint'],
  ['claims_sourced', 'fact_card_abc'],
  ['claims_typed', 'claim_precision'],
];
const MOTION_GATES = [
  ['text_hold', 'text_hold'],
  ['contrast', 'contrast'],
  ['flashes', 'flashes'],
  ['sfx_sync', 'sfx_sync'],
  ['hero_move_and_banned', 'shots'],
];

export function humanReviewErrors(release) {
  const review = release?.quality_review || {};
  return HUMAN_QUESTIONS.map(q => {
    const a = review[q.id] || {};
    const by = String(a.checked_by || '').trim();
    if (a.answer !== 'yes') return {id: q.id, ok: false, evidence: a.answer === 'no' ? 'answered no' : 'unanswered (person only)'};
    if (!by) return {id: q.id, ok: false, evidence: 'yes without checked_by is still pending'};
    if (isAgentSigner(by)) return {id: q.id, ok: false, evidence: 'Agents cannot answer human review questions'};
    return {id: q.id, ok: true, evidence: `yes — ${by}`};
  });
}

async function readJson(file) {
  return (await fileExists(file)) ? JSON.parse(await fs.readFile(file, 'utf8')) : null;
}

export async function runQuality(episodeDir) {
  const machine = [];
  const qc = await runQc(episodeDir);
  const byId = new Map(qc.items.map(i => [i.id, i]));
  for (const [gate, id] of QC_GATES) {
    const item = byId.get(id);
    machine.push({id: gate, source: `qc:${id}`, ok: item?.status === 'pass', evidence: item?.evidence || 'missing'});
  }
  const contract = await lintRenderContract();
  const rerender = await evaluateDeterminism(episodeDir);
  const detOk = contract.ok && rerender.ok;
  const detEvidence = `${contract.ok ? 'render-contract lint clean' : `${contract.findings.length} render-contract finding(s)`}; ${rerender.evidence}`;
  machine.push({id: 'deterministic', source: 'render-contract + render pipeline re-render', ok: detOk, evidence: detEvidence});

  const specFile = path.join(episodeDir, 'qc', 'motion.json');
  if (await fileExists(specFile)) {
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-quality-'));
    const report = await runMotionQc(specFile, out);
    for (const [gate, key] of MOTION_GATES) {
      const c = report.checks[key];
      machine.push({id: gate, source: `motion-qc:${key}`, ok: Boolean(c?.ok), evidence: c ? (c.ok ? 'pass' : JSON.stringify((c.items || []).filter(i => !i.ok))) : `qc/motion.json has no ${key} data`});
    }
  } else {
    for (const [gate] of MOTION_GATES) machine.push({id: gate, source: 'motion-qc', ok: false, evidence: 'missing qc/motion.json'});
  }

  const briefFile = path.join(episodeDir, 'brief.md');
  const brief = (await fileExists(briefFile)) ? await fs.readFile(briefFile, 'utf8') : '';
  const banned = sectionBody(brief, 'Banned motion');
  const bannedCount = (banned || '').split('\n').filter(l => /^\s*-\s+\S/.test(l)).length;
  machine.push({id: 'banned_list_in_brief', source: 'brief:Banned motion', ok: bannedCount > 0, evidence: bannedCount ? `${bannedCount} named defaults` : 'brief needs a filled "## Banned motion" list'});

  const profile = await checkProfile(episodeDir);
  for (const c of profile.checks) machine.push({id: c.id, source: `profile:${profile.id}`, ok: c.ok, evidence: c.evidence});

  const release = await readJson(path.join(episodeDir, 'qc', 'release.json'));
  const human = humanReviewErrors(release).map(r => ({...r, question: HUMAN_QUESTIONS.find(q => q.id === r.id).question}));
  const machineOk = machine.every(g => g.ok);
  const humanOk = human.every(h => h.ok);
  return {standard: STANDARD_VERSION, episode: path.basename(episodeDir), profile: profile.id || null, machine, human, machineOk, humanOk, ok: machineOk && humanOk};
}

export function formatQuality(r) {
  const out = [`QUALITY ${r.standard} ${r.episode}${r.profile ? ` (profile: ${r.profile})` : ''}`, 'Machine gates:'];
  for (const g of r.machine) out.push(`  ${g.ok ? 'PASS' : 'FAIL'} ${g.id} [${g.source}] — ${g.evidence}`);
  out.push('Human review (person only, qc/release.json quality_review):');
  for (const h of r.human) out.push(`  ${h.ok ? 'PASS' : 'PENDING'} ${h.id} — ${h.question} — ${h.evidence}`);
  out.push(r.ok ? 'QUALITY_PASS' : r.machineOk ? 'QUALITY_PENDING_HUMAN' : 'QUALITY_FAIL');
  return out.join('\n');
}
