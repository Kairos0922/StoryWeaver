import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileExists} from './qc/checks.mjs';

const studioRoot = fileURLToPath(new URL('.', import.meta.url));

export function toolRepoRoot() {
  return path.resolve(studioRoot, '..');
}

export function isInsideToolRepo(dir, repoRoot = toolRepoRoot()) {
  const target = path.resolve(dir);
  const root = path.resolve(repoRoot);
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function fill(template, series) {
  return template.replaceAll('{{series}}', series);
}

export async function initSeries(dir) {
  const seriesDir = path.resolve(dir);
  if (isInsideToolRepo(seriesDir)) {
    throw Object.assign(new Error(
      'A series workspace must live outside the StoryWeaver repository. Pick a directory of its own.',
    ), {code: 'WORKSPACE_INSIDE_REPO'});
  }
  const marker = path.join(seriesDir, 'series.json');
  if (await fileExists(marker)) {
    throw Object.assign(new Error(`Series already exists: ${seriesDir}`), {code: 'SERIES_EXISTS'});
  }
  await fs.mkdir(seriesDir, {recursive: true});
  const id = path.basename(seriesDir);
  const readme = await fs.readFile(path.join(studioRoot, 'templates/series_README.md'), 'utf8');
  await fs.writeFile(path.join(seriesDir, 'README.md'), fill(readme, id));
  const doc = {
    schema: 'storyweaver.series.v1',
    id,
    note: 'Workspace for episodes. Not part of the StoryWeaver tool repository.',
  };
  await fs.writeFile(marker, `${JSON.stringify(doc, null, 2)}\n`);
  return {seriesDir, id};
}
