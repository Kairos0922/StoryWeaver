// Pre-export director scorecard. The frames are reviewed by a person; an AI may draft the scores.
// A pass needs every axis >= 8 and a human signature. This is not the release signature.
import fs from 'node:fs/promises';
import path from 'node:path';
import {isAgentSigner} from './brief.mjs';

export const DIRECTOR_REVIEW_SCHEMA = 'storyweaver.director_review.v1';
export const DIRECTOR_REVIEW_FILE = 'qc/director_review.json';
export const SCORE_KEYS = [
  'text_overlap', 'focus', 'pacing', 'motion', 'legibility', 'loop', 'style_law', 'closure', 'audio_alignment',
];
export const PASS_SCORE = 8;
export const MIN_FRAMES = 3;

function human(value) {
  const by = String(value?.reviewed_by || '').trim();
  return Boolean(by) && !isAgentSigner(by) && /\d{4}-\d{2}-\d{2}/.test(String(value?.reviewed_at || ''));
}

export function validateDirectorReview(doc, {episode}) {
  const issues = [];
  if (doc?.schema !== DIRECTOR_REVIEW_SCHEMA) issues.push(`schema must be ${DIRECTOR_REVIEW_SCHEMA}`);
  if (doc?.episode !== episode) issues.push(`episode must be ${episode}`);
  if (!human(doc)) issues.push('reviewed_by/reviewed_at must be a person and a date (agents cannot sign)');
  if (doc?.pass !== true) issues.push('pass must be true after the review');
  const frames = Array.isArray(doc?.frames) ? doc.frames.filter(Boolean) : [];
  if (frames.length < MIN_FRAMES) issues.push(`frames must name at least ${MIN_FRAMES} reviewed stills`);
  const scores = doc?.scores && typeof doc.scores === 'object' ? doc.scores : {};
  for (const key of SCORE_KEYS) {
    const value = Number(scores[key]);
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      issues.push(`scores.${key} must be 0–10`);
    } else if (value < PASS_SCORE) {
      issues.push(`scores.${key} is ${value}; needs >= ${PASS_SCORE}`);
    }
  }
  for (const key of Object.keys(scores)) {
    if (!SCORE_KEYS.includes(key)) issues.push(`unknown score ${key}`);
  }
  return {ok: issues.length === 0, issues, scores, frames};
}

export async function checkDirectorReview(episodeDir) {
  const file = path.join(episodeDir, DIRECTOR_REVIEW_FILE);
  let doc;
  try {
    doc = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {ok: false, code: 'DIRECTOR_REVIEW_MISSING', file, issues: [`missing ${DIRECTOR_REVIEW_FILE}`], scores: {}, frames: []};
  }
  const result = validateDirectorReview(doc, {episode: path.basename(episodeDir)});
  return {
    ...result,
    code: result.ok ? 'DIRECTOR_REVIEW_OK' : 'DIRECTOR_REVIEW_FAILED',
    file,
  };
}

export function formatDirectorReview(report) {
  if (report.ok) {
    return `DIRECTOR_REVIEW_OK ${report.file} (${report.frames.length} frames, every axis >= ${PASS_SCORE})`;
  }
  return ['DIRECTOR_REVIEW_FAILED', ...report.issues.map(issue => `- ${issue}`)].join('\n');
}
