import fs from 'node:fs/promises';
import path from 'node:path';
import {approvalState, extractOneThing, honorsMetricsException} from '../phase_a.mjs';
import {lintFile} from '../lint/lint_script.mjs';

export const ENGAGEMENT_FIELDS = [
  '完播率',
  '平均观看时长',
  '2s 跳出',
  '5s 跳出',
  '评论区站队题回复数',
  '评论区纠错数',
  '评论区「AI 味 / 假声」负面数',
];

const ESTIMATE_WORDS = /大约|大概|预估|估计|差不多|预期/;

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
    if (/[0-9０-９]/.test(row.value) && !/来源[：:]\s*\S/.test(row.line)) problems.push(`unsourced-number:${row.field}`);
  }
  return {ok: problems.length === 0, problems, rows};
}

export function metricsSourceFilled(markdown) {
  const line = String(markdown).split(/\r?\n/).find(item => item.includes('数据来源'));
  if (!line) return false;
  const value = line.split(/数据来源/).slice(1).join('数据来源').replace(/^[^：:]*[：:]/, '').trim();
  return value.length > 0 && !/待填|TODO/.test(value);
}

export function metricsReadyForNextTopic(markdown) {
  const inspection = inspectEngagement(markdown);
  if (!inspection.ok) return {ok: false, reason: inspection.problems.join(',')};
  if (!metricsSourceFilled(markdown)) return {ok: false, reason: 'missing-source'};
  const filled = inspection.rows.some(row => row.value && !/待填|TODO/.test(row.value));
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
  if (!text) return {ok: false, code: 'FACT_CARD', evidence: '缺少 fact_card.md'};
  const missing = ['A', 'B', 'C'].filter(letter => !new RegExp(`^##\\s+${letter}\\b`, 'm').test(text));
  if (missing.length) return {ok: false, code: 'FACT_CARD', evidence: `事实卡缺少分区 ${missing.join(',')}`};
  if (text.includes('待填') || text.includes('TODO')) return {ok: false, code: 'FACT_CARD', evidence: '事实卡仍有待填'};
  return {ok: true, code: 'FACT_CARD', evidence: 'A/B/C'};
}

export async function checkOneThing(episodeDir) {
  const chunks = await Promise.all([
    readIf(path.join(episodeDir, 'phase_a.md')),
    readIf(path.join(episodeDir, 'script.md')),
  ]);
  const claim = chunks.map(extractOneThing).find(Boolean) || '';
  if (!claim) return {ok: false, code: 'ONE_THING', evidence: '没有写明一件事，或仍是待填'};
  return {ok: true, code: 'ONE_THING', evidence: claim.slice(0, 80)};
}

export async function checkPhaseA(episodeDir) {
  const file = path.join(episodeDir, 'phase_a.md');
  const text = await readIf(file);
  if (!text) return {ok: false, code: 'PHASE_A_REQUIRED', evidence: '缺少 phase_a.md'};
  const state = approvalState(text);
  const issues = state.structure.issues.map(issue => issue.id).join(',');
  const detail = issues ? `${state.code} ${issues}` : state.code;
  if (state.code === 'PHASE_A_APPROVED') return {ok: true, code: 'PHASE_A_APPROVED', evidence: detail};
  if (state.code === 'PHASE_A_STALE') return {ok: false, code: 'PHASE_A_STALE', evidence: detail};
  return {ok: false, code: 'PHASE_A_REQUIRED', evidence: detail};
}

export async function checkScriptLint(episodeDir) {
  const problems = [];
  const script = path.join(episodeDir, 'script.md');
  if (!(await fileExists(script))) return {ok: false, code: 'SCRIPT_LINT_FAILED', evidence: '缺少 script.md'};
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
  if (!text) return {ok: false, code: 'METRICS', evidence: '缺少 post/metrics.md'};
  const inspection = inspectEngagement(text);
  if (!inspection.ok) return {ok: false, code: 'METRICS', evidence: inspection.problems.join(',')};
  return {ok: true, code: 'METRICS', evidence: 'blank-or-sourced'};
}

export const AUTO_CHECKS = {
  fact_card_abc: checkFactCard,
  one_thing: checkOneThing,
  phase_a_approved: checkPhaseA,
  script_lint: checkScriptLint,
  metrics_not_invented: checkMetrics,
};

export async function previousMetricsBlock(seriesDir, episodeId) {
  const match = episodeId.match(/^ep(\d{2})$/);
  if (!match) return {code: 'BAD_EPISODE'};
  const number = Number(match[1]);
  if (number <= 1) return {code: 'NO_PREVIOUS'};
  const previousId = `ep${String(number - 1).padStart(2, '0')}`;
  const previousDir = path.join(seriesDir, previousId);
  if (!(await fileExists(previousDir))) return {code: 'NO_PREVIOUS'};
  const phase = await readIf(path.join(previousDir, 'phase_a.md'));
  const metrics = await readIf(path.join(previousDir, 'post', 'metrics.md'));
  const seriesId = path.basename(seriesDir);
  if (honorsMetricsException(seriesId, previousId, phase, metrics)) return {code: 'PRIOR_METRICS_ABSENT_OK', previousId};
  const ready = metricsReadyForNextTopic(metrics);
  if (!ready.ok) return {code: 'METRICS_REQUIRED', previousId, reason: ready.reason};
  return {code: 'METRICS_PRESENT', previousId};
}
