import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ensureCollection, makeCollection, readCollection, validateCollection, writeCollection} from '../studio/collection.mjs';
import {initSeries} from '../studio/init_series.mjs';
import {initEpisode} from '../studio/init_episode.mjs';
import {formatSeriesNext, formatSeriesStatus, seriesNext, seriesStatus} from '../studio/series/status.mjs';

async function tempSeries(episodes = 10) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-collection-'));
  const series = path.join(parent, 'demo-series');
  await initSeries(series, {collection: true, episodes});
  return series;
}

async function fillMetrics(series, episode = 'ep01') {
  const file = path.join(series, episode, 'post', 'metrics.md');
  const text = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, text
    .replace('- Completion rate:', '- Completion rate: 40% (source: fixture-export.csv)')
    .replace('- Data source (dashboard URL or export filename; blank if none):', '- Data source (dashboard URL or export filename; blank if none): fixture-export.csv'));
}

test('a collection plan has ten sequential slots and one style reference', async () => {
  const series = await tempSeries();
  const collection = await readCollection(series);
  assert.equal(collection.episodes.length, 10);
  assert.deepEqual(collection.episodes.map(episode => episode.slot), Array.from({length: 10}, (_, index) => `ep${String(index + 1).padStart(2, '0')}`));
  assert.equal(collection.episodes[0].role, 'style-reference');
  assert.equal(collection.episodes.filter(episode => episode.role === 'style-reference').length, 1);
  assert.equal(validateCollection(collection).ok, true);
});

test('a plan does not create episode folders, and status shows the sequential blockers', async () => {
  const series = await tempSeries();
  const entries = await fs.readdir(series);
  assert.ok(!entries.includes('ep01'));

  const status = await seriesStatus(series);
  assert.equal(status.rows.length, 10);
  assert.equal(status.rows[0].stage, 'not-created');
  assert.equal(status.rows[1].blocker, 'ep01 not delivered');
  assert.equal(status.rows[2].blocker, 'ep02 not delivered');
  assert.match(formatSeriesStatus(status), /SERIES demo-series · 10 episodes · 0\/10 delivered/);
});

test('init-episode keeps the metrics gate and marks the slot in progress', async () => {
  const series = await tempSeries();
  await initEpisode(series, 'ep01');
  assert.equal((await readCollection(series)).episodes[0].status, 'in-progress');

  const status = await seriesStatus(series);
  assert.equal(status.rows[0].stage, 'brief');
  assert.equal(status.rows[1].blocker, 'ep01 metrics');

  await assert.rejects(() => initEpisode(series, 'ep02'), error => error.code === 'METRICS_REQUIRED');
  await fillMetrics(series, 'ep01');
  const created = await initEpisode(series, 'ep02');
  assert.equal(created.previous, 'METRICS_PRESENT');
  assert.equal((await readCollection(series)).episodes[1].status, 'in-progress');
  await assert.rejects(() => initEpisode(series, 'ep03'), error => error.code === 'METRICS_REQUIRED');
});

test('series next shows the metrics blocker and then the ready command', async () => {
  const series = await tempSeries();
  await initEpisode(series, 'ep01');
  await fs.mkdir(path.join(series, 'ep01', 'deliver', 'stamp'), {recursive: true});
  await fs.writeFile(path.join(series, 'ep01', 'deliver', 'LATEST'), 'stamp\n');

  const blocked = await seriesNext(series);
  assert.equal(blocked.code, 'BLOCKED');
  assert.equal(blocked.slot, 'ep02');
  assert.match(blocked.detail, /ep01 post\/metrics\.md has no sourced playback numbers/);
  assert.equal(blocked.exitCode, 3);

  await fillMetrics(series, 'ep01');
  const ready = await seriesNext(series);
  assert.equal(ready.code, 'READY');
  assert.equal(ready.slot, 'ep02');
  assert.match(formatSeriesNext(ready), /NEXT ep02 — READY/);
});

test('a fixed-size collection refuses a slot beyond its size', async () => {
  const series = await tempSeries(2);
  await assert.rejects(() => initEpisode(series, 'ep03'), error => error.code === 'COLLECTION_FULL');
});

test('ensureCollection keeps an existing plan unless force is set', async () => {
  const series = await tempSeries(10);
  const kept = await ensureCollection(series, {episodes: 10});
  assert.equal(kept.created, false);
  const replaced = await ensureCollection(series, {episodes: 3, force: true});
  assert.equal(replaced.created, true);
  assert.equal(replaced.collection.episodes.length, 3);
  assert.equal(makeCollection('x', 3).episodes[0].slot, 'ep01');
  await writeCollection(series, makeCollection('demo-series', 10));
  assert.equal((await readCollection(series)).episodes.length, 10);
});
