import fs from 'node:fs/promises';
import path from 'node:path';
import {approvalState} from './phase_a.mjs';
import {fileExists} from './qc/checks.mjs';
import {runQc} from './qc/run_qc.mjs';

export const STAGES = ['phase-a', 'lines', 'hook-sample', 'stills', 'render', 'publish'];

const ALLOWED = {
  lines: 'LINES_ALLOWED',
  'hook-sample': 'HOOK_SAMPLE_ALLOWED',
  stills: 'STILLS_ALLOWED',
  render: 'RENDER_ALLOWED',
  publish: 'PUBLISH_ALLOWED',
};

const PRIORITY = [
  'PHASE_A_STALE',
  'PHASE_A_REQUIRED',
  'PHASE_A_INCOMPLETE',
  'SCRIPT_LINT_FAILED',
  'FACT_CARD',
  'ONE_THING',
  'METRICS',
  'GATE_BLOCKED',
];

export function exitFor(code) {
  if ([
    'PHASE_A_READY_FOR_REVIEW',
    'PHASE_A_APPROVED',
    'LINES_ALLOWED',
    'HOOK_SAMPLE_ALLOWED',
    'STILLS_ALLOWED',
    'RENDER_ALLOWED',
    'PUBLISH_ALLOWED',
  ].includes(code)) return 0;
  if (code === 'PHASE_A_STALE' || code === 'PHASE_A_REQUIRED') return 2;
  return 1;
}

function rank(code) {
  const index = PRIORITY.indexOf(code);
  return index === -1 ? PRIORITY.length : index;
}

export async function evaluateGate(episodeDir, stage) {
  if (!STAGES.includes(stage)) {
    throw Object.assign(new Error(`Unknown stage: ${stage}`), {code: 'BAD_STAGE'});
  }
  const phaseFile = path.join(episodeDir, 'phase_a.md');
  const phaseText = await fileExists(phaseFile) ? await fs.readFile(phaseFile, 'utf8') : '';
  if (stage === 'phase-a') {
    if (!phaseText) {
      return {code: 'PHASE_A_INCOMPLETE', exitCode: 1, blockers: [], issues: [{id: 'missing_file', detail: 'phase_a.md'}]};
    }
    const state = approvalState(phaseText);
    return {
      code: state.code,
      exitCode: exitFor(state.code),
      blockers: [],
      issues: state.structure.issues,
      hash: state.hash,
      status: state.status,
    };
  }
  const report = await runQc(episodeDir);
  const blockers = report.items.filter(item => item.required && item.blocks.includes(stage) && item.status !== 'pass');
  if (!blockers.length) {
    return {code: ALLOWED[stage], exitCode: 0, blockers: [], issues: [], report};
  }
  const code = blockers.map(item => item.evidenceCode || 'GATE_BLOCKED').sort((a, b) => rank(a) - rank(b))[0];
  return {code, exitCode: exitFor(code), blockers, issues: [], report};
}

export function formatGate(result) {
  const lines = [result.code];
  if (result.hash && result.code === 'PHASE_A_STALE') lines.push(`body-sha256: ${result.hash}`);
  for (const issue of result.issues || []) lines.push(`- ${issue.id}: ${issue.detail}`);
  for (const blocker of result.blockers || []) {
    lines.push(`- ${blocker.id}: ${blocker.evidence || blocker.status}`);
  }
  return lines.join('\n');
}
