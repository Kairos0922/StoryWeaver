import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previousMetricsBlock, fileExists} from './qc/checks.mjs';
import {markEpisodeStarted, readCollection, slotFor, validateCollection} from './collection.mjs';
import {isInsideToolRepo} from './init_series.mjs';

const studioRoot = fileURLToPath(new URL('.', import.meta.url));

const COPIES = [
  ['README.md', 'templates/episode_README.md'],
  ['fact_card.md', 'templates/fact_card.md'],
  ['brief.md', 'templates/brief.md'],
  ['script.md', 'templates/script.md'],
  ['lines.json', 'templates/lines.json'],
  ['post/metrics.md', 'templates/metrics.md'],
  ['sim/README.md', 'templates/sim_README.md'],
  ['qc/checklist.json', 'qc/checklist.json'],
  ['qc/release.json', 'templates/release.json'],
  ['qc/approvals.json', 'templates/approvals.json'],
  ['CAPS.md', 'templates/CAPS.md'],
];

function fill(template, vars) {
  return template.replace(/\{\{(series|episode)\}\}/g, (_, key) => vars[key]);
}

export async function initEpisode(seriesDir, episodeId) {
  if (!/^ep\d{2}$/.test(episodeId)) {
    throw Object.assign(new Error('Episode id must look like ep02'), {code: 'BAD_EPISODE'});
  }
  if (isInsideToolRepo(seriesDir)) {
    throw Object.assign(new Error(
      'A series workspace must live outside the StoryWeaver repository. Pick a directory of its own.',
    ), {code: 'WORKSPACE_INSIDE_REPO'});
  }
  if (!(await fileExists(seriesDir))) {
    throw Object.assign(new Error(`Series directory does not exist: ${seriesDir}. Run init-series first.`), {code: 'BAD_SERIES'});
  }
  const collection = await readCollection(seriesDir);
  if (collection) {
    const plan = validateCollection(collection);
    if (!plan.ok) {
      throw Object.assign(new Error(`collection.json is invalid: ${plan.issues.join('; ')}`), {
        code: 'COLLECTION_INVALID',
        issues: plan.issues,
      });
    }
    if (!slotFor(collection, episodeId)) {
      throw Object.assign(new Error(
        `${episodeId} is not in collection.json (${collection.episodes.length} slots). A collection is fixed; do not add another episode.`,
      ), {code: 'COLLECTION_FULL', count: collection.episodes.length});
    }
  }
  const previous = await previousMetricsBlock(seriesDir, episodeId);
  if (previous.code === 'METRICS_REQUIRED') {
    throw Object.assign(new Error(
      `${previous.previousId} post/metrics.md has no sourced playback numbers. Leave the sheet blank if the platform export is missing; do not estimate. A blank sheet blocks the next topic.`,
    ), {code: 'METRICS_REQUIRED', previous});
  }
  const dest = path.join(seriesDir, episodeId);
  if (await fileExists(dest)) {
    throw Object.assign(new Error(`Episode already exists: ${dest}`), {code: 'EPISODE_EXISTS'});
  }
  const vars = {series: path.basename(seriesDir), episode: episodeId};
  for (const [target, source] of COPIES) {
    const raw = await fs.readFile(path.join(studioRoot, source), 'utf8');
    const out = path.join(dest, target);
    await fs.mkdir(path.dirname(out), {recursive: true});
    await fs.writeFile(out, fill(raw, vars));
  }
  if (collection) await markEpisodeStarted(seriesDir, episodeId);
  return {episodeDir: dest, previous: previous.code};
}
