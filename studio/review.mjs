import fs from 'node:fs/promises';
import path from 'node:path';
import {isAgentSigner} from './brief.mjs';
import {evaluateCheckpoint} from './checkpoint.mjs';
import {fileExists} from './qc/checks.mjs';
import {humanReviewErrors} from './quality.mjs';

export const DRAFT_WATERMARK = 'Not human-reviewed';
export const REVIEWS = ['draft', 'release'];
export const CUTS = ['preview', 'hook', 'full'];

async function readRelease(episodeDir) {
  const file = path.join(episodeDir, 'qc', 'release.json');
  if (!(await fileExists(file))) return {file, data: null};
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  return {file, data};
}

export function releaseSignoffError(data) {
  if (!data || typeof data !== 'object') return 'qc/release.json is missing';
  const signedBy = String(data.signed_by || '').trim();
  const signedAt = String(data.signed_at || '').trim();
  if (!signedBy || !signedAt) return 'release needs signed_by and signed_at from a person';
  if (isAgentSigner(signedBy)) return 'Agents cannot fill release sign-off. signed_by must be a person.';
  if (!/\d{4}-\d{2}-\d{2}/.test(signedAt)) return 'signed_at must include a calendar date';
  const open = humanReviewErrors(data).filter(r => !r.ok);
  if (open.length) return `quality_review needs a person's yes: ${open.map(r => `${r.id} (${r.evidence})`).join(', ')}`;
  return '';
}

export async function assertRenderReview(episodeDir, {review, cut}) {
  if (!REVIEWS.includes(review)) {
    throw Object.assign(new Error(`--mode must be draft or release (got ${review || 'nothing'})`), {code: 'BAD_REVIEW'});
  }
  if (!CUTS.includes(cut)) {
    throw Object.assign(new Error(`--cut must be preview, hook, or full (got ${cut || 'nothing'})`), {code: 'BAD_CUT'});
  }
  if (review === 'release' && cut !== 'full') {
    throw Object.assign(new Error('A release is a full cut. Draft is the mode for preview and hook samples.'), {code: 'RELEASE_CUT'});
  }
  if (review === 'draft' && cut === 'preview') {
    const brief = await evaluateCheckpoint(episodeDir, 'brief');
    if (brief.code !== 'BRIEF_APPROVED') {
      throw Object.assign(new Error(`checkpoint brief is not open:\n${brief.code}`), {code: brief.code, exit: brief.exitCode === 2 ? 2 : 3});
    }
    return {
      review,
      cut,
      stage: 'brief',
      watermark: DRAFT_WATERMARK,
      metadata: 'unreviewed',
      gate: brief.code,
    };
  }
  const stage = review === 'release' ? 'render' : (cut === 'full' ? 'lines' : 'hook-sample');
  const gate = await evaluateCheckpoint(episodeDir, stage);
  if (gate.exitCode !== 0) {
    throw Object.assign(new Error(`checkpoint ${stage} is not open:\n${gate.code}`), {code: gate.code, exit: gate.exitCode === 2 ? 2 : 3});
  }
  if (review === 'draft') {
    return {
      review,
      cut,
      stage,
      watermark: DRAFT_WATERMARK,
      metadata: 'unreviewed',
      gate: gate.code,
    };
  }
  const release = await readRelease(episodeDir);
  const problem = releaseSignoffError(release.data);
  if (problem) {
    throw Object.assign(new Error(problem), {code: 'RELEASE_SIGNOFF'});
  }
  return {
    review,
    cut,
    stage,
    watermark: null,
    metadata: 'human-signed',
    signed_by: String(release.data.signed_by).trim(),
    signed_at: String(release.data.signed_at).trim(),
    gate: gate.code,
  };
}
