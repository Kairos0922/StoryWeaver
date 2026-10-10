import fs from 'node:fs/promises';
import path from 'node:path';
import {approvalState, extractIntuitionRows, extractOneThing} from '../brief.mjs';
import {lintFile} from '../lint/lint_script.mjs';
import {checkClaimPrecision} from '../claims.mjs';
import {paceEpisode} from '../pace.mjs';

export const ENGAGEMENT_FIELDS = [
  'Completion rate',
  'Average watch time',
  '2s drop-off',
  '5s drop-off',
  'Stance-question replies',
  'Correction comments',
  '“AI-flavored / fake voice” complaints',
];

const ESTIMATE_WORDS = /大约|大概|预估|估计|差不多|预期|about|roughly|estimate|approx|expected/i;

export async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export function engagementLines(markdown) {
  const found = [];
  for (const line of String(markdown).split(/\r?\n/)) {
    if (!/^\s*[-*]\s+/.test(line)) continue;
    for (const field of ENGAGEMENT_FIELDS) {
      const index = line.indexOf(field);
      if (index === -1) continue;
      const colon = line.slice(index + field.length).match(/^[：:]\s*(.*)$/);
      if (!colon) continue;
      found.push({field, line, value: colon[1].trim()});
      break;
    }
  }
  return found;
}

export function inspectEngagement(markdown) {
  const rows = engagementLines(markdown);
  const problems = [];
  if (rows.length !== ENGAGEMENT_FIELDS.length) problems.push('missing-field');
  for (const row of rows) {
    if (!row.value) continue;
    if (ESTIMATE_WORDS.test(row.value)) problems.push(`estimate:${row.field}`);
    if (/[0-9０-９]/.test(row.value) && !/source[：:]\s*\S/i.test(row.line)) problems.push(`unsourced-number:${row.field}`);
  }
  return {ok: problems.length === 0, problems, rows};
}

export function metricsSourceFilled(markdown) {
  const line = String(markdown).split(/\r?\n/).find(item => /data source|数据来源/i.test(item));
  if (!line) return false;
  const value = line.split(/data source|数据来源/i).slice(1).join('').replace(/^[^：:]*[：:]/, '').trim();
  return value.length > 0 && !/TODO|TBD|待填/i.test(value);
}

export function metricsReadyForNextTopic(markdown) {
  const inspection = inspectEngagement(markdown);
  if (!inspection.ok) return {ok: false, reason: inspection.problems.join(',')};
  if (!metricsSourceFilled(markdown)) return {ok: false, reason: 'missing-source'};
  const filled = inspection.rows.some(row => row.value && !/TODO|TBD|待填/i.test(row.value));
  if (!filled) return {ok: false, reason: 'empty'};
  return {ok: true, reason: 'present'};
}

async function readIf(file) {
  if (!(await fileExists(file))) return '';
  return fs.readFile(file, 'utf8');
}

export async function checkFactCard(episodeDir) {
  const file = path.join(episodeDir, 'fact_card.md');
  const text = await readIf(file);
  if (!text) return {ok: false, code: 'FACT_CARD', evidence: 'missing fact_card.md'};
  const missing = ['A', 'B', 'C'].filter(letter => !new RegExp(`^##\\s+${letter}\\b`, 'm').test(text));
  if (missing.length) return {ok: false, code: 'FACT_CARD', evidence: `fact card missing sections ${missing.join(',')}`};
  if (/待填|TODO|TBD|\(to fill\)/i.test(text)) return {ok: false, code: 'FACT_CARD', evidence: 'fact card still has placeholders'};
  return {ok: true, code: 'FACT_CARD', evidence: 'A/B/C'};
}

export async function checkOneThing(episodeDir) {
  const chunks = await Promise.all([
    readIf(path.join(episodeDir, 'brief.md')),
    readIf(path.join(episodeDir, 'script.md')),
  ]);
  const claim = chunks.map(extractOneThing).find(Boolean) || '';
  if (!claim) return {ok: false, code: 'ONE_THING', evidence: 'One thing is missing or still a placeholder'};
  return {ok: true, code: 'ONE_THING', evidence: claim.slice(0, 80)};
}

export async function checkBrief(episodeDir) {
  const file = path.join(episodeDir, 'brief.md');
  const text = await readIf(file);
  if (!text) return {ok: false, code: 'BRIEF_REQUIRED', evidence: 'missing brief.md'};
  const state = approvalState(text);
  const issues = state.structure.issues.map(issue => issue.id).join(',');
  const detail = issues ? `${state.code} ${issues}` : state.code;
  if (state.code === 'BRIEF_APPROVED') return {ok: true, code: 'BRIEF_APPROVED', evidence: detail};
  if (state.code === 'BRIEF_STALE') return {ok: false, code: 'BRIEF_STALE', evidence: detail};
  return {ok: false, code: 'BRIEF_REQUIRED', evidence: detail};
}

export async function checkScriptLint(episodeDir) {
  const problems = [];
  const script = path.join(episodeDir, 'script.md');
  if (!(await fileExists(script))) return {ok: false, code: 'SCRIPT_LINT_FAILED', evidence: 'missing script.md'};
  const scriptResult = await lintFile(script);
  for (const error of scriptResult.errors) problems.push(`${path.basename(script)}:${error.rule}:L${error.line}`);
  const linesFile = path.join(episodeDir, 'lines.json');
  if (await fileExists(linesFile)) {
    const data = JSON.parse(await fs.readFile(linesFile, 'utf8'));
    if (Array.isArray(data.lines) && data.lines.length) {
      const lineResult = await lintFile(linesFile);
      for (const error of lineResult.errors) problems.push(`lines.json:${error.rule}:L${error.line}`);
    }
  }
  if (problems.length) return {ok: false, code: 'SCRIPT_LINT_FAILED', evidence: problems.join('; ')};
  return {ok: true, code: 'SCRIPT_LINT_FAILED', evidence: 'no scaffold errors'};
}

export async function checkMetrics(episodeDir) {
  const file = path.join(episodeDir, 'post', 'metrics.md');
  const text = await readIf(file);
  if (!text) return {ok: false, code: 'METRICS', evidence: 'missing post/metrics.md'};
  const inspection = inspectEngagement(text);
  if (!inspection.ok) return {ok: false, code: 'METRICS', evidence: inspection.problems.join(',')};
  return {ok: true, code: 'METRICS', evidence: 'blank-or-sourced'};
}

export async function checkIntuition(episodeDir) {
  const text = await readIf(path.join(episodeDir, 'brief.md'));
  if (!text) return {ok: false, code: 'INTUITION', evidence: 'missing brief.md'};
  const rows = extractIntuitionRows(text);
  if (!rows.length) return {ok: false, code: 'INTUITION', evidence: 'no filled viewer-intuition row'};
  const linesFile = path.join(episodeDir, 'lines.json');
  if (await fileExists(linesFile)) {
    const doc = JSON.parse(await fs.readFile(linesFile, 'utf8'));
    const list = Array.isArray(doc.lines) ? doc.lines : [];
    if (list.length) {
      const ids = new Set(list.map(line => line.id));
      const missing = rows.flatMap(row => row.lineIds).filter(id => /^L\d+/i.test(id) && !ids.has(id));
      if (missing.length) return {ok: false, code: 'INTUITION', evidence: `line ids not in lines.json: ${missing.join(',')}`};
      const firstBreak = list.findIndex(line => /break-assumption|打碎常识/i.test(line.beat || ''));
      const firstAck = list.findIndex(line => rows.some(row => row.lineIds.includes(line.id)));
      if (firstBreak >= 0 && firstAck >= 0 && firstAck > firstBreak) {
        return {ok: false, code: 'INTUITION', evidence: 'acknowledge the strongest objection before the first break-assumption line'};
      }
    }
  }
  return {ok: true, code: 'INTUITION', evidence: `${rows.length} row(s)`};
}

export async function checkPace(episodeDir) {
  const result = await paceEpisode(episodeDir);
  if (result.source === 'none') return {ok: true, code: 'PACE', evidence: 'no timing yet; run pace after WAV or a preview timeline'};
  if (!result.ok) return {ok: false, code: 'PACE', evidence: result.evidence};
  return {ok: true, code: 'PACE', evidence: result.evidence};
}

export const AUTO_CHECKS = {
  fact_card_abc: checkFactCard,
  one_thing: checkOneThing,
  brief_approved: checkBrief,
  script_lint: checkScriptLint,
  metrics_not_invented: checkMetrics,
  intuition_addressed: checkIntuition,
  claim_precision: checkClaimPrecision,
  pace_ok: checkPace,
};

export async function previousMetricsBlock(seriesDir, episodeId) {
  const match = episodeId.match(/^ep(\d{2})$/);
  if (!match) return {code: 'BAD_EPISODE'};
  const number = Number(match[1]);
  if (number <= 1) return {code: 'NO_PREVIOUS'};
  const previousId = `ep${String(number - 1).padStart(2, '0')}`;
  const previousDir = path.join(seriesDir, previousId);
  if (!(await fileExists(previousDir))) return {code: 'NO_PREVIOUS'};
  const metrics = await readIf(path.join(previousDir, 'post', 'metrics.md'));
  const ready = metricsReadyForNextTopic(metrics);
  if (!ready.ok) return {code: 'METRICS_REQUIRED', previousId, reason: ready.reason};
  return {code: 'METRICS_PRESENT', previousId};
}
