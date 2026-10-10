import fs from 'node:fs/promises';
import path from 'node:path';
import {approvalState} from './brief.mjs';
import {fileExists} from './qc/checks.mjs';
import {runQc} from './qc/run_qc.mjs';

export const STAGES = ['brief', 'lines', 'hook-sample', 'stills', 'render', 'publish'];

const ALLOWED = {
  lines: 'LINES_ALLOWED',
  'hook-sample': 'HOOK_SAMPLE_ALLOWED',
  stills: 'STILLS_ALLOWED',
  render: 'RENDER_ALLOWED',
  publish: 'PUBLISH_ALLOWED',
};

const PRIORITY = [
  'BRIEF_STALE',
  'BRIEF_REQUIRED',
  'BRIEF_INCOMPLETE',
  'SCRIPT_LINT_FAILED',
  'FACT_CARD',
  'ONE_THING',
  'INTUITION',
  'CLAIM_PRECISION',
  'PACE',
  'METRICS',
  'GATE_BLOCKED',
];

export function exitFor(code) {
  if ([
    'BRIEF_READY_FOR_REVIEW',
    'BRIEF_APPROVED',
    'LINES_ALLOWED',
    'HOOK_SAMPLE_ALLOWED',
    'STILLS_ALLOWED',
    'RENDER_ALLOWED',
    'PUBLISH_ALLOWED',
  ].includes(code)) return 0;
  if (code === 'BRIEF_STALE' || code === 'BRIEF_REQUIRED') return 2;
  return 1;
}

function rank(code) {
  const index = PRIORITY.indexOf(code);
  return index === -1 ? PRIORITY.length : index;
}

async function readBrief(episodeDir) {
  const file = path.join(episodeDir, 'brief.md');
  if (await fileExists(file)) return {file, text: await fs.readFile(file, 'utf8')};
  return {file: '', text: ''};
}

export async function evaluateCheckpoint(episodeDir, stage) {
  if (!STAGES.includes(stage)) {
    throw Object.assign(new Error(`Unknown stage: ${stage}`), {code: 'BAD_STAGE'});
  }
  const {text: briefText} = await readBrief(episodeDir);
  if (stage === 'brief') {
    if (!briefText) {
      return {code: 'BRIEF_INCOMPLETE', exitCode: 1, blockers: [], issues: [{id: 'missing_file', detail: 'brief.md'}]};
    }
    const state = approvalState(briefText);
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

export const evaluateGate = evaluateCheckpoint;

export function formatCheckpoint(result) {
  const lines = [result.code];
  if (result.hash && result.code === 'BRIEF_STALE') lines.push(`body-sha256: ${result.hash}`);
  for (const issue of result.issues || []) lines.push(`- ${issue.id}: ${issue.detail}`);
  for (const blocker of result.blockers || []) {
    lines.push(`- ${blocker.id}: ${blocker.evidence || blocker.status}`);
  }
  return lines.join('\n');
}

export const formatGate = formatCheckpoint;
