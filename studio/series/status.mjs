// Read-only view of a series. It answers two questions without changing any gate:
//   1. Which episode is next?
//   2. If it cannot start, which earlier episode's metrics sheet is blocking it?
// The metrics gate itself stays in init_episode.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {approvalState} from '../brief.mjs';
import {fileExists, metricsReadyForNextTopic, previousMetricsBlock} from '../qc/checks.mjs';
import {COLLECTION_FILE, readCollection, validateCollection} from '../collection.mjs';

const EPISODE_RE = /^ep\d{2}$/;

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function readText(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function exists(file) {
  return fileExists(file);
}

async function hasMp4(dir) {
  try {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    return entries.some(entry => entry.isFile() && entry.name.endsWith('.mp4'));
  } catch {
    return false;
  }
}

async function hasDeliver(episodeDir) {
  return (await exists(path.join(episodeDir, 'deliver', 'LATEST')))
    || (await exists(path.join(episodeDir, 'deliver', 'manifest.json')));
}

async function approvals(episodeDir) {
  return (await readJson(path.join(episodeDir, 'qc', 'approvals.json'))) || {};
}

export async function episodeStage(episodeDir) {
  if (!(await exists(episodeDir))) return 'not-created';
  if (await hasDeliver(episodeDir)) return 'delivered';

  const release = await readJson(path.join(episodeDir, 'qc', 'release.json'));
  if (String(release?.signed_by || '').trim()) return 'release';

  if (await hasMp4(path.join(episodeDir, 'out', 'draft', 'full'))) return 'draft';
  if (await hasMp4(path.join(episodeDir, 'out', 'draft'))) return 'draft';

  const approved = await approvals(episodeDir);
  if (String(approved?.voice_trial?.sha256 || '').trim()) return 'voice';
  if (String(approved?.stills?.sha256 || '').trim()) return 'stills';

  const brief = await readText(path.join(episodeDir, 'brief.md'));
  if (brief) {
    try {
      if (approvalState(brief).code === 'BRIEF_APPROVED') return 'brief-approved';
    } catch {
      // A malformed brief is still "brief"; the checkpoint reports the detail.
    }
    return 'brief';
  }

  if (await exists(path.join(episodeDir, 'fact_card.md'))) return 'fact';
  return 'empty';
}

export async function metricsState(episodeDir) {
  const file = path.join(episodeDir, 'post', 'metrics.md');
  if (!(await exists(file))) return 'missing';
  const text = await readText(file);
  return metricsReadyForNextTopic(text).ok ? 'ready' : 'pending';
}

// The collection status is a plan state; the derived stage is the truth. A slot whose
// deliver/LATEST exists is done even if nobody updated collection.json.
async function nextOpenSlot(seriesDir, collection) {
  for (const slot of collection.episodes) {
    const stage = await episodeStage(path.join(seriesDir, slot.slot));
    if (stage !== 'delivered') return slot;
  }
  return null;
}

function nextCommand(seriesDir, slot, stage) {
  switch (stage) {
    case 'not-created':
      return `node studio/cli.mjs init-episode ${seriesDir} ${slot}`;
    case 'empty':
    case 'fact':
      return 'fill fact_card.md, then brief.md';
    case 'brief':
      return `node studio/cli.mjs checkpoint ${slot} brief`;
    case 'brief-approved':
      return `node studio/cli.mjs stills ${slot}`;
    case 'stills':
      return 'approve stills, then render the hook sample';
    case 'voice':
      return 'approve voice_trial, then render the full draft';
    case 'draft':
      return 'run quality, then a person signs the release';
    case 'release':
      return `node studio/cli.mjs deliver ${slot}`;
    case 'delivered':
      return 'fill post/metrics.md from a real export';
    default:
      return '—';
  }
}

function blockerFor(episodeId, stage, metrics) {
  if (stage === 'not-created') return '—';
  if (stage === 'delivered' && metrics !== 'ready') return 'metrics';
  return '—';
}

async function slotRow(seriesDir, slot, previousSlot = null) {
  const episodeDir = path.join(seriesDir, slot.slot);
  const stage = await episodeStage(episodeDir);
  const metrics = stage === 'not-created' ? '—' : await metricsState(episodeDir);
  let blocker = blockerFor(slot.slot, stage, metrics);
  let command = nextCommand(seriesDir, slot.slot, stage);

  if (stage === 'not-created') {
    const previous = await previousMetricsBlock(seriesDir, slot.slot);
    const previousDir = previousSlot ? path.join(seriesDir, previousSlot.slot) : null;
    const previousExists = previousDir ? await exists(previousDir) : true;
    if (!previousExists) {
      blocker = `${previousSlot.slot} not delivered`;
      command = `finish ${previousSlot.slot}, then init ${slot.slot}`;
    } else if (previous.code === 'METRICS_REQUIRED') {
      blocker = `${previous.previousId} metrics`;
      command = `fill ${previous.previousId}/post/metrics.md, then init ${slot.slot}`;
    }
  }

  return {
    slot: slot.slot,
    title: slot.title || '',
    role: slot.role,
    stage,
    metrics,
    blocker,
    next: command,
  };
}

export async function seriesStatus(seriesDir) {
  const collection = await readCollection(seriesDir);
  if (!collection) {
    const entries = await fs.readdir(seriesDir, {withFileTypes: true}).catch(() => []);
    const slots = entries
      .filter(entry => entry.isDirectory() && EPISODE_RE.test(entry.name))
      .map(entry => entry.name)
      .sort();
    const rows = [];
    for (const slot of slots) rows.push(await slotRow(seriesDir, {slot, title: '', role: 'regular'}));
    return {
      series: path.basename(seriesDir),
      dir: seriesDir,
      collection: null,
      rows,
      next: null,
      delivered: rows.filter(row => row.stage === 'delivered').length,
      note: `no ${COLLECTION_FILE}; run: node studio/cli.mjs series plan ${seriesDir} --episodes 10`,
    };
  }

  const report = validateCollection(collection);
  if (!report.ok) {
    throw Object.assign(new Error(`Collection is invalid: ${report.issues.join('; ')}`), {
      code: 'COLLECTION_INVALID',
      issues: report.issues,
    });
  }

  const rows = [];
  for (const [index, slot] of collection.episodes.entries()) {
    rows.push(await slotRow(seriesDir, slot, index ? collection.episodes[index - 1] : null));
  }
  const next = await nextOpenSlot(seriesDir, collection);
  return {
    series: collection.series || path.basename(seriesDir),
    dir: seriesDir,
    collection,
    rows,
    next: next ? next.slot : null,
    delivered: rows.filter(row => row.stage === 'delivered').length,
    note: '',
  };
}

function charWidth(value) {
  return [...String(value)].reduce((width, ch) => width + (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
}

function fit(value, width) {
  const text = String(value ?? '');
  if (charWidth(text) <= width) return `${text}${' '.repeat(width - charWidth(text))}`;
  let out = '';
  let used = 0;
  for (const ch of text) {
    const w = charWidth(ch);
    if (used + w > width - 1) break;
    out += ch;
    used += w;
  }
  return `${out}…${' '.repeat(Math.max(0, width - used - 1))}`;
}

export function formatSeriesStatus(report) {
  const lines = [];
  const total = report.rows.length;
  lines.push(`SERIES ${report.series} · ${total} episodes · ${report.delivered}/${total} delivered`);
  if (report.note) lines.push(report.note);
  lines.push(`${fit('slot', 5)} | ${fit('title', 24)} | ${fit('stage', 15)} | ${fit('metrics', 8)} | ${fit('blocker', 18)} | next`);
  lines.push(`${'-'.repeat(5)}-+-${'-'.repeat(24)}-+-${'-'.repeat(15)}-+-${'-'.repeat(8)}-+-${'-'.repeat(18)}-+-----`);
  for (const row of report.rows) {
    lines.push(`${fit(row.slot, 5)} | ${fit(row.title, 24)} | ${fit(row.stage, 15)} | ${fit(row.metrics, 8)} | ${fit(row.blocker, 18)} | ${row.next}`);
  }
  if (report.next) lines.push(`NEXT ${report.next} — run: node studio/cli.mjs series next ${report.dir}`);
  else if (report.collection) lines.push('NEXT none — collection delivered');
  return lines.join('\n');
}

export async function seriesNext(seriesDir) {
  const collection = await readCollection(seriesDir);
  if (!collection) {
    return {
      ok: false,
      code: 'COLLECTION_REQUIRED',
      exitCode: 1,
      detail: `No ${COLLECTION_FILE} in ${seriesDir}. Run: node studio/cli.mjs series plan ${seriesDir} --episodes 10`,
    };
  }
  const report = validateCollection(collection);
  if (!report.ok) {
    return {ok: false, code: 'COLLECTION_INVALID', exitCode: 1, detail: report.issues.join('; ')};
  }
  const slot = await nextOpenSlot(seriesDir, collection);
  if (!slot) return {ok: true, code: 'COLLECTION_COMPLETE', exitCode: 0, detail: 'All slots are delivered.'};

  const episodeDir = path.join(seriesDir, slot.slot);
  const stage = await episodeStage(episodeDir);
  if (stage === 'not-created') {
    const previous = await previousMetricsBlock(seriesDir, slot.slot);
    if (previous.code === 'METRICS_REQUIRED') {
      return {
        ok: false,
        code: 'BLOCKED',
        exitCode: 3,
        slot: slot.slot,
        blocker: `${previous.previousId} metrics`,
        detail: `${previous.previousId} post/metrics.md has no sourced playback numbers. Do not estimate. Fill a real export, then run init-episode ${slot.slot}.`,
      };
    }
    return {
      ok: true,
      code: 'READY',
      exitCode: 0,
      slot: slot.slot,
      command: `node studio/cli.mjs init-episode ${seriesDir} ${slot.slot}`,
      detail: `${slot.slot} can be created.`,
    };
  }

  return {
    ok: true,
    code: 'IN_PROGRESS',
    exitCode: 0,
    slot: slot.slot,
    stage,
    command: nextCommand(seriesDir, slot.slot, stage),
    detail: `${slot.slot} is at ${stage}.`,
  };
}

export function formatSeriesNext(report) {
  if (report.code === 'COLLECTION_COMPLETE') return 'NEXT none — collection delivered';
  if (report.code === 'COLLECTION_REQUIRED' || report.code === 'COLLECTION_INVALID') return `${report.code}\n${report.detail}`;
  if (report.code === 'BLOCKED') return `NEXT ${report.slot} — BLOCKED: ${report.blocker}\n${report.detail}`;
  if (report.code === 'READY') return `NEXT ${report.slot} — READY\n${report.command}\n${report.detail}`;
  return `NEXT ${report.slot} — IN PROGRESS (${report.stage})\n${report.command}`;
}

