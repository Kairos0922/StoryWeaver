// Claim-level fact check. The gate is deliberately strict:
//   - every claim has a source and a reviewer;
//   - a fact/mechanism claim must be "verified", not "single-source";
//   - an estimate/analogy/pedagogy claim must say so in its kind and note;
//   - the ledger is bound to the script and lines by sha256, so editing either re-opens it.
// The reviewer is a person. An agent-looking name is rejected, like the other human gates.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {isAgentSigner} from './brief.mjs';

export const FACT_CHECK_SCHEMA = 'storyweaver.fact_check.v1';
export const FACT_CHECK_FILE = 'qc/fact_check.json';
export const KINDS = ['fact', 'mechanism', 'estimate', 'analogy', 'pedagogy'];
export const STATUSES = ['verified', 'single-source', 'estimate', 'analogy', 'pedagogy', 'unsupported'];
const SOURCE_TYPES = ['primary', 'authoritative', 'secondary', 'derived', 'curriculum', 'analogy'];

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function sha256File(file) {
  try {
    return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  } catch {
    return '';
  }
}

function human(value) {
  const by = String(value?.by || '').trim();
  return Boolean(by) && !isAgentSigner(by) && /\d{4}-\d{2}-\d{2}/.test(String(value?.at || ''));
}

export function validateFactCheck(doc, {scriptHash, linesHash, lineIds}) {
  const issues = [];
  if (doc?.schema !== FACT_CHECK_SCHEMA) issues.push(`schema must be ${FACT_CHECK_SCHEMA}`);
  if (typeof doc?.episode !== 'string' || !doc.episode.trim()) issues.push('episode must be a non-empty string');
  if (doc?.script_sha256 !== scriptHash) issues.push('script_sha256 is stale; re-hash script.md');
  if (doc?.lines_sha256 !== linesHash) issues.push('lines_sha256 is stale; re-hash lines.json');
  if (!human(doc?.review)) issues.push('review.by/review.at must be a person and a date (agents cannot sign)');
  if (!String(doc?.review?.statement || '').trim()) issues.push('review.statement is empty');
  const claims = doc?.claims;
  if (!Array.isArray(claims) || !claims.length) {
    issues.push('claims must be a non-empty array');
    return {ok: false, issues, claims: []};
  }
  const seen = new Set();
  const coveredLines = new Set();
  for (const [index, claim] of claims.entries()) {
    const where = `claims[${index}]`;
    const id = String(claim?.id || '');
    if (!/^F\d+$/.test(id)) issues.push(`${where}.id must look like F1`);
    if (seen.has(id)) issues.push(`duplicate claim id ${id}`);
    seen.add(id);
    if (typeof claim?.claim !== 'string' || !claim.claim.trim()) issues.push(`${where}.claim is empty`);
    if (!KINDS.includes(claim?.kind)) issues.push(`${where}.kind must be ${KINDS.join('/')}`);
    if (!STATUSES.includes(claim?.status)) issues.push(`${where}.status must be ${STATUSES.join('/')}`);
    if (claim?.status === 'unsupported') issues.push(`${where} is unsupported; remove the claim or find a source`);
    if (!Array.isArray(claim?.line_ids) || !claim.line_ids.length) {
      issues.push(`${where}.line_ids must name at least one line`);
    } else {
      for (const lineId of claim.line_ids) {
        if (lineId && !lineIds.has(lineId)) issues.push(`${where}.line_ids references unknown line ${lineId}`);
        if (lineId) coveredLines.add(lineId);
      }
    }
    const source = claim?.source || {};
    if (!SOURCE_TYPES.includes(source.type)) issues.push(`${where}.source.type must be ${SOURCE_TYPES.join('/')}`);
    if (!String(source.title || '').trim()) issues.push(`${where}.source.title is empty`);
    if (!String(source.url || '').trim() && !String(source.citation || '').trim()) {
      issues.push(`${where}.source needs url or citation`);
    }
    if ((claim?.kind === 'fact' || claim?.kind === 'mechanism') && claim.status !== 'verified') {
      issues.push(`${where}: ${claim.kind} must be verified, not ${claim.status}`);
    }
    if ((claim?.kind === 'estimate' || claim?.kind === 'analogy' || claim?.kind === 'pedagogy')
      && claim.status !== claim.kind) {
      issues.push(`${where}: ${claim.kind} status must be ${claim.kind}`);
    }
    if ((claim?.kind === 'estimate' || claim?.kind === 'analogy') && !String(claim?.note || '').trim()) {
      issues.push(`${where}: ${claim.kind} needs a note explaining the approximation/analogy`);
    }
  }
  return {ok: issues.length === 0, issues, claims: claims.length, coveredLines};
}

export async function checkFactCheck(episodeDir) {
  const file = path.join(episodeDir, FACT_CHECK_FILE);
  const doc = await readJson(file);
  if (!doc) {
    return {ok: false, code: 'FACT_CHECK_MISSING', issues: [`missing ${FACT_CHECK_FILE}; a person must sign the claim ledger`], claims: 0};
  }
  const scriptFile = path.join(episodeDir, 'script.md');
  const linesFile = path.join(episodeDir, 'lines.json');
  const [scriptHash, linesHash] = await Promise.all([sha256File(scriptFile), sha256File(linesFile)]);
  const lines = await readJson(linesFile);
  const lineIds = new Set((lines?.lines || []).map(line => line.id));
  if (!lines) {
    return {ok: false, code: 'FACT_CHECK_FAILED', issues: ['lines.json missing; cannot bind the ledger'], claims: 0};
  }
  if (doc.episode && doc.episode !== path.basename(episodeDir)) {
    return {ok: false, code: 'FACT_CHECK_FAILED', issues: [`episode is ${doc.episode}, expected ${path.basename(episodeDir)}`], claims: 0};
  }
  const result = validateFactCheck(doc, {scriptHash, linesHash, lineIds});
  const keyLines = (lines.lines || []).filter(line => line.key_number).map(line => line.id);
  for (const id of keyLines) {
    if (!result.coveredLines?.has(id)) result.issues.push(`key number line ${id} has no claim in the ledger`);
  }
  return {
    ok: result.ok && result.issues.length === 0,
    code: result.ok && result.issues.length === 0 ? 'FACT_CHECK_OK' : 'FACT_CHECK_FAILED',
    file,
    issues: result.issues,
    claims: result.claims,
  };
}

export function formatFactCheck(report) {
  if (report.ok) return `FACT_CHECK_OK ${report.file} (${report.claims} claims signed)`;
  return ['FACT_CHECK_FAILED', ...report.issues.map(issue => `- ${issue}`)].join('\n');
}
