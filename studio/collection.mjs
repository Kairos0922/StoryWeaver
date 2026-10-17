// A collection is a plan for a fixed-size series (default 10 episodes). It lists slots and
// their status. It does not create episode folders and it does not relax the metrics gate:
// folders are still created one at a time by init-episode, after the previous episode's
// post/metrics.md has a sourced number.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileExists} from './qc/checks.mjs';

export const COLLECTION_FILE = 'collection.json';
export const COLLECTION_SCHEMA = 'storyweaver.collection.v1';
export const DEFAULT_EPISODES = 10;
export const SLOT_RE = /^ep\d{2}$/;
export const STATUSES = ['planned', 'in-progress', 'delivered'];
export const ROLES = ['style-reference', 'regular'];

export function slotId(number) {
  return `ep${String(number).padStart(2, '0')}`;
}

export function makeCollection(series, episodes = DEFAULT_EPISODES) {
  const count = Number(episodes);
  if (!Number.isInteger(count) || count < 1 || count > 99) {
    throw Object.assign(new Error('episodes must be an integer from 1 to 99'), {code: 'BAD_EPISODES'});
  }
  return {
    schema: COLLECTION_SCHEMA,
    series: String(series),
    episodes: Array.from({length: count}, (_, index) => ({
      slot: slotId(index + 1),
      title: '',
      status: 'planned',
      role: index === 0 ? 'style-reference' : 'regular',
    })),
  };
}

export function validateCollection(doc) {
  const issues = [];
  if (doc?.schema !== COLLECTION_SCHEMA) issues.push(`schema must be ${COLLECTION_SCHEMA}`);
  if (typeof doc?.series !== 'string' || !doc.series.trim()) issues.push('series must be a non-empty string');
  const episodes = doc?.episodes;
  if (!Array.isArray(episodes) || episodes.length === 0) {
    issues.push('episodes must be a non-empty array');
    return {ok: false, issues};
  }
  if (episodes.length > 99) issues.push('episodes has more than 99 slots');
  const seen = new Set();
  let references = 0;
  for (const [index, episode] of episodes.entries()) {
    const where = `episodes[${index}]`;
    if (!SLOT_RE.test(episode?.slot || '')) issues.push(`${where}.slot must look like ep01`);
    if (seen.has(episode?.slot)) issues.push(`duplicate slot ${episode.slot}`);
    seen.add(episode?.slot);
    if (episode?.slot !== slotId(index + 1)) issues.push(`${where} is ${episode?.slot}; expected ${slotId(index + 1)}`);
    if (typeof episode?.title !== 'string') issues.push(`${where}.title must be a string`);
    if (!STATUSES.includes(episode?.status)) issues.push(`${where}.status must be ${STATUSES.join('/')}`);
    if (!ROLES.includes(episode?.role)) issues.push(`${where}.role must be ${ROLES.join('/')}`);
    if (episode?.role === 'style-reference') references += 1;
  }
  if (references !== 1) issues.push(`exactly one style-reference slot is required (found ${references})`);
  return {ok: issues.length === 0, issues};
}

export async function readCollection(seriesDir) {
  const file = path.join(seriesDir, COLLECTION_FILE);
  if (!(await fileExists(file))) return null;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function writeCollection(seriesDir, collection) {
  const report = validateCollection(collection);
  if (!report.ok) {
    throw Object.assign(new Error(`Collection is invalid:\n${report.issues.join('\n')}`), {
      code: 'COLLECTION_INVALID',
      issues: report.issues,
    });
  }
  await fs.mkdir(seriesDir, {recursive: true});
  const file = path.join(seriesDir, COLLECTION_FILE);
  await fs.writeFile(file, `${JSON.stringify(collection, null, 2)}\n`);
  return {file, collection};
}

export async function ensureCollection(seriesDir, {episodes = DEFAULT_EPISODES, force = false} = {}) {
  const existing = await readCollection(seriesDir);
  if (existing && !force) {
    const report = validateCollection(existing);
    if (!report.ok) {
      throw Object.assign(new Error(`Existing collection is invalid: ${report.issues.join('; ')}`), {
        code: 'COLLECTION_INVALID',
        issues: report.issues,
      });
    }
    return {file: path.join(seriesDir, COLLECTION_FILE), collection: existing, created: false};
  }
  const collection = makeCollection(path.basename(seriesDir), episodes);
  const written = await writeCollection(seriesDir, collection);
  return {...written, created: true};
}

export function slotFor(collection, episodeId) {
  return (collection?.episodes || []).find(episode => episode.slot === episodeId) || null;
}

export function nextSlot(collection) {
  return (collection?.episodes || []).find(episode => episode.status !== 'delivered') || null;
}

export async function setSlotStatus(seriesDir, episodeId, status) {
  const collection = await readCollection(seriesDir);
  if (!collection) return null;
  const slot = slotFor(collection, episodeId);
  if (!slot) {
    throw Object.assign(new Error(`${episodeId} is not in ${COLLECTION_FILE}`), {code: 'COLLECTION_SLOT_MISSING'});
  }
  if (!STATUSES.includes(status)) throw new Error(`Unknown collection status: ${status}`);
  slot.status = status;
  await writeCollection(seriesDir, collection);
  return slot;
}

export async function markEpisodeStarted(seriesDir, episodeId) {
  return setSlotStatus(seriesDir, episodeId, 'in-progress');
}
