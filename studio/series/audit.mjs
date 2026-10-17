// Cross-episode consistency checks for a collection. The audit is a machine gate for
// series deliver: it does not sign anything and it does not estimate a missing value.
// Open/close/cover are scene markers in render/scenes.json, so the existing seek(t)
// renderer draws them without a second assembly path. See docs/series-workflow.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {readCollection, validateCollection} from '../collection.mjs';
import {checkEpisodeStyle, LOCK_FILE, SCHEMA_V2, validateLock} from '../style/style_lock.mjs';
import {lintFile} from '../lint/lint_script.mjs';

const REQUIRED_SECTIONS = ['open', 'close', 'cover', 'music', 'mix', 'glossary'];
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
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

function test(checks, episode, id, ok, detail = '') {
  checks.push({episode: episode || null, id, ok: Boolean(ok), detail: String(detail || '')});
}

function voiceIds(lines) {
  const ids = new Set();
  for (const line of lines?.lines || []) if (line?.voice) ids.add(line.voice);
  for (const entry of Object.values(lines?.voices?.map || {})) if (entry?.voice) ids.add(entry.voice);
  return [...ids];
}

async function latestReport(episodeDir) {
  const candidates = [
    'out/release/full/render_report.json',
    'out/draft/full/render_report.json',
  ];
  for (const relative of candidates) {
    const file = path.join(episodeDir, relative);
    if (await exists(file)) return {file, report: await readJson(file)};
  }
  // A hook/preview report is not a full mix; do not use it for loudness or BGM checks.
  return null;
}

function sameTemplate(actual, expected) {
  return Boolean(actual && expected)
    && actual.id === expected.id
    && actual.sha256 === expected.sha256;
}

function slotNumber(slot) {
  return Number(String(slot).replace(/^ep/, ''));
}

function episodeLabel(slot) {
  return slot.slot;
}

async function auditEpisode(seriesDir, slot, lock, glossary, checks) {
  const episode = episodeLabel(slot);
  const episodeDir = path.join(seriesDir, episode);
  if (!(await exists(episodeDir))) return false;
  const scenesFile = path.join(episodeDir, 'render', 'scenes.json');
  if (!(await exists(scenesFile))) return false;

  const scenesDoc = await readJson(scenesFile);
  const lines = await readJson(path.join(episodeDir, 'lines.json'));
  const report = await latestReport(episodeDir);

  // Visual lock (palette/fonts/characters/camera/line/motion).
  const style = await checkEpisodeStyle(episodeDir);
  test(checks, episode, 'style', style.locked && style.ok, style.issues?.slice(0, 3).join('; ') || style.evidence);

  // Rig identity.
  const rigFile = path.join(episodeDir, 'render', 'rig.json');
  if (await exists(rigFile)) {
    const sha = await sha256File(rigFile);
    test(checks, episode, 'rig', sha === lock.rig?.sha256, `${sha.slice(0, 12)}… vs ${String(lock.rig?.sha256 || '').slice(0, 12)}…`);
  } else {
    test(checks, episode, 'rig', false, 'render/rig.json missing');
  }

  // Voice identity from lines.json.
  if (!lines) {
    test(checks, episode, 'voice', false, 'lines.json missing');
  } else {
    test(checks, episode, 'voice.provider', lines.voice_provider === lock.voice?.provider, `${lines.voice_provider} vs ${lock.voice?.provider}`);
    test(checks, episode, 'voice.speech_rate', lines.speech_rate === lock.voice?.speech_rate, `${lines.speech_rate} vs ${lock.voice?.speech_rate}`);
    const allowed = new Set([lock.voice?.voice_id, ...Object.values(lock.characters || {}).map(ch => ch?.voice_id)].filter(Boolean));
    const used = voiceIds(lines);
    test(checks, episode, 'voice.set', used.every(id => allowed.has(id)), `used ${used.join(', ') || '(none)'}; allowed ${[...allowed].join(', ') || '(none)'}`);
  }

  // Script register: the existing lint, including the series speech rules.
  const scriptFile = path.join(episodeDir, 'script.md');
  if (await exists(scriptFile)) {
    const lint = await lintFile(scriptFile);
    test(checks, episode, 'speech', lint.ok, lint.ok ? 'lint clean' : lint.errors?.slice(0, 3).map(e => e.message).join('; '));
  } else {
    test(checks, episode, 'speech', false, 'script.md missing');
  }

  // Open / close are scene markers inside the normal scene array.
  const scenes = scenesDoc?.scenes || [];
  const openScenes = scenes.filter(scene => scene?.role === 'open');
  const closeScenes = scenes.filter(scene => scene?.role === 'close');
  const number = slotNumber(slot.slot);
  test(checks, episode, 'open.count', openScenes.length === 1, `${openScenes.length} open scene(s)`);
  test(checks, episode, 'close.count', closeScenes.length === 1, `${closeScenes.length} close scene(s)`);
  test(checks, episode, 'open.first', scenes[0]?.role === 'open', `first scene is ${scenes[0]?.role || 'unmarked'}`);
  test(checks, episode, 'close.last', scenes.at(-1)?.role === 'close', `last scene is ${scenes.at(-1)?.role || 'unmarked'}`);

  if (openScenes[0]) {
    test(checks, episode, 'open.template', sameTemplate(openScenes[0].template, lock.open?.template), 'template id/sha256');
    test(checks, episode, 'open.number', Number(openScenes[0].episode_number) === number, `${openScenes[0].episode_number} vs ${number}`);
    test(checks, episode, 'open.title', typeof openScenes[0].episode_title === 'string' && openScenes[0].episode_title.trim().length > 0, 'episode_title');
  }
  if (closeScenes[0]) {
    test(checks, episode, 'close.template', sameTemplate(closeScenes[0].template, lock.close?.template), 'template id/sha256');
    test(checks, episode, 'close.number', Number(closeScenes[0].episode_number) === number, `${closeScenes[0].episode_number} vs ${number}`);
    test(checks, episode, 'close.title', typeof closeScenes[0].episode_title === 'string' && closeScenes[0].episode_title.trim().length > 0, 'episode_title');
  }

  // Cover template and fields.
  const cover = scenesDoc?.cover || await readJson(path.join(episodeDir, 'render', 'cover.json'));
  if (!cover) {
    test(checks, episode, 'cover', false, 'no scenes.cover or render/cover.json');
  } else {
    test(checks, episode, 'cover.template', sameTemplate(cover.template, lock.cover?.template), 'template id/sha256');
    for (const field of lock.cover?.fields || []) {
      const value = cover[field];
      test(checks, episode, `cover.${field}`, value !== undefined && String(value).trim().length > 0, String(value ?? 'missing'));
    }
  }

  // Music and mix from the latest full report (release first, then draft).
  if (!report?.report) {
    test(checks, episode, 'audio', false, 'out/release/full or out/draft/full render_report.json missing');
  } else {
    const bgm = report.report.bgm;
    const theme = lock.music?.theme || '';
    if (theme === 'none') {
      test(checks, episode, 'music', !bgm || !(bgm.id || bgm.theme), `lock says none; report says ${bgm?.id || bgm?.theme || 'none'}`);
    } else {
      test(checks, episode, 'music', (bgm?.id || bgm?.theme) === theme, `${bgm?.id || bgm?.theme || 'none'} vs ${theme}`);
    }
    const audio = report.report.audio;
    const measured = audio?.measured?.integrated_lufs;
    const target = lock.mix?.target_lufs;
    const peak = audio?.measured?.true_peak_dbfs;
    test(checks, episode, 'mix.normalized', audio?.normalized === true, audio?.normalized ? 'normalised' : 'not normalised (preview?)');
    test(checks, episode, 'mix.loudness', typeof measured === 'number' && typeof target === 'number' && Math.abs(measured - target) <= 1, `${measured ?? 'missing'} LUFS vs ${target ?? 'missing'}`);
    test(checks, episode, 'mix.true_peak', typeof peak === 'number' && typeof lock.mix?.true_peak_db === 'number' && peak <= lock.mix.true_peak_db + 0.1, `${peak ?? 'missing'} dBFS vs ≤ ${lock.mix?.true_peak_db ?? 'missing'}`);
  }

  // Glossary: banned variants only; the human still owns the canonical wording.
  const glossaryDoc = glossary?.doc;
  if (!glossaryDoc) {
    test(checks, episode, 'glossary', false, 'glossary file missing');
  } else {
    const text = [await readText(scriptFile), ...(lines?.lines || []).map(line => line?.text || '')].join('\n');
    const violations = [];
    for (const term of glossaryDoc.terms || []) {
      for (const banned of term.banned || []) {
        if (banned && text.includes(banned)) violations.push(`${term.zh || term.en || '?'}: ${banned}`);
      }
    }
    test(checks, episode, 'glossary', violations.length === 0, violations.slice(0, 3).join('; ') || 'no banned variant');
  }

  return true;
}

export async function seriesAudit(seriesDir) {
  const checks = [];
  const lockFile = path.join(seriesDir, LOCK_FILE);
  const lock = await readJson(lockFile);
  const collection = await readCollection(seriesDir);

  if (!lock) {
    test(checks, null, 'lock', false, `no ${LOCK_FILE}; run series lock --from ep01`);
    return {ok: false, code: 'SERIES_AUDIT_FAILED', series: path.basename(seriesDir), episodes: 0, checks};
  }
  test(checks, null, 'lock.schema', lock.schema === SCHEMA_V2, `${lock.schema}; series audit needs ${SCHEMA_V2}`);
  const lockIssues = validateLock(lock);
  test(checks, null, 'lock.valid', lockIssues.length === 0, lockIssues.slice(0, 4).join('; '));
  for (const section of REQUIRED_SECTIONS) {
    test(checks, null, `lock.${section}`, Boolean(lock[section]), lock[section] ? 'present' : 'missing');
  }

  if (!collection) {
    test(checks, null, 'collection', false, 'collection.json missing; run series plan');
    return {ok: false, code: 'SERIES_AUDIT_FAILED', series: path.basename(seriesDir), episodes: 0, checks};
  }
  const collectionReport = validateCollection(collection);
  test(checks, null, 'collection', collectionReport.ok, collectionReport.issues.slice(0, 4).join('; ') || `${collection.episodes.length} slots`);

  const expected = new Set(collection.episodes.map(slot => slot.slot));
  const entries = await fs.readdir(seriesDir, {withFileTypes: true}).catch(() => []);
  const extra = entries.filter(entry => entry.isDirectory() && EPISODE_RE.test(entry.name) && !expected.has(entry.name)).map(entry => entry.name);
  test(checks, null, 'collection.extra', extra.length === 0, extra.join(', ') || 'none');

  const glossaryPath = path.join(seriesDir, lock.glossary?.file || 'glossary.json');
  const glossaryDoc = await readJson(glossaryPath);
  const glossary = {path: glossaryPath, doc: glossaryDoc};

  let episodes = 0;
  for (const slot of collection.episodes) {
    const produced = await auditEpisode(seriesDir, slot, lock, glossary, checks);
    if (produced) episodes += 1;
  }
  if (!episodes) test(checks, null, 'episodes', false, 'no episode with render/scenes.json yet');

  const ok = checks.every(check => check.ok);
  return {
    ok,
    code: ok ? 'SERIES_AUDIT_OK' : 'SERIES_AUDIT_FAILED',
    series: path.basename(seriesDir),
    episodes,
    checks,
    lock,
    collection,
  };
}

export function formatSeriesAudit(report) {
  const failed = report.checks.filter(check => !check.ok);
  if (report.ok) return `SERIES_AUDIT_OK ${report.series} (${report.episodes} episodes, ${report.checks.length} checks)`;
  const lines = [`SERIES_AUDIT_FAILED ${report.series} (${report.episodes} episodes, ${failed.length} failed)`];
  for (const check of failed) {
    const where = check.episode ? `${check.episode} ${check.id}` : `series ${check.id}`;
    lines.push(`- ${where}: ${check.detail}`.slice(0, 240));
  }
  return lines.join('\n');
}
