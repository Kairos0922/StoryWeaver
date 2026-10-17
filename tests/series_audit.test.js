import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initSeries} from '../studio/init_series.mjs';
import {measureLock, validateLock, writeLock} from '../studio/style/style_lock.mjs';
import {seriesAudit, formatSeriesAudit} from '../studio/series/audit.mjs';
import {seriesDeliver, formatSeriesDeliver} from '../studio/series/deliver.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureEpisode = path.join(root, 'tests/fixtures/sample-series/ep01');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function makeFixture() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-audit-'));
  const series = path.join(parent, 'demo-series');
  await initSeries(series, {collection: true, episodes: 1});
  const episode = path.join(series, 'ep01');
  await fs.cp(fixtureEpisode, episode, {recursive: true});

  await writeJson(path.join(series, 'glossary.json'), {
    schema: 'storyweaver.glossary.v1',
    terms: [{zh: '门口', en: 'door', banned: ['路口']}],
  });

  const scenesFile = path.join(episode, 'render', 'scenes.json');
  const scenes = JSON.parse(await fs.readFile(scenesFile, 'utf8'));
  const frame = (role, duration) => ({
    id: role,
    role,
    template: {id: `series-${role}`, sha256: sha256(`series-${role}`)},
    episode_number: 1,
    episode_title: 'Fixture One',
    duration_s: duration,
    layers: [{type: 'label', x: 960, y: 540, text: 'Fixture One', size: 80, color: 'ink'}],
  });
  scenes.scenes = [frame('open', 3), ...scenes.scenes, frame('close', 5)];
  scenes.cover = {
    ...scenes.cover,
    template: {id: 'series-cover', sha256: sha256('series-cover')},
    episode_number: 1,
    episode_title: 'Fixture One',
  };
  scenes.bgm = {id: 'theme_a', license: 'self-synthesized', bpm: 96};
  await writeJson(scenesFile, scenes);

  await writeJson(path.join(episode, 'out', 'draft', 'full', 'render_report.json'), {
    schema: 'storyweaver.render_report.v1',
    review: {mode: 'draft'},
    audio: {
      normalized: true,
      target: {I: -16, TP: -1.5, LRA: 11},
      measured: {integrated_lufs: -16.4, lra_lu: 7, true_peak_dbfs: -1.8},
    },
    bgm: {id: 'theme_a', license: 'self-synthesized', bpm: 96},
  });

  const measured = await measureLock(episode);
  measured.lock.approval = {by: 'Fixture Reviewer', at: '2026-10-17'};
  for (const character of Object.values(measured.lock.characters)) {
    character.approval = {by: 'Fixture Reviewer', at: '2026-10-17'};
  }
  measured.lock.close.credits = true;
  measured.lock.close.ai_disclosure = true;
  assert.deepEqual(validateLock(measured.lock), []);
  await writeLock(series, measured.lock, {force: true});

  return {series, episode, lock: measured.lock};
}

async function makeDelivery(episode) {
  const stamp = '2026-10-17T00-00-00-000Z';
  const dir = path.join(episode, 'deliver', stamp);
  await fs.mkdir(dir, {recursive: true});
  const files = [];
  for (const name of ['demo_ep01.mp4', 'cover.png', 'subtitles.srt']) {
    const bytes = Buffer.from(`fixture ${name}`);
    await fs.writeFile(path.join(dir, name), bytes);
    files.push({name, bytes: bytes.length, sha256: sha256(bytes)});
  }
  const manifest = {
    schema: 'storyweaver.delivery.v1',
    status: 'deliverable',
    series: 'demo-series',
    episode: 'ep01',
    source: {file: 'out/release/full/demo_ep01_release.mp4', sha256: sha256('source'), signed_by: 'Fixture Reviewer', signed_at: '2026-10-17'},
    files,
    checks: {},
  };
  await writeJson(path.join(dir, 'manifest.json'), manifest);
  await fs.writeFile(path.join(dir, 'SHA256SUMS'), files.map(file => `${file.sha256}  ${file.name}\n`).join(''));
  await fs.writeFile(path.join(episode, 'deliver', 'LATEST'), `${stamp}\n`);
  return dir;
}

test('a consistent episode passes the series audit', async () => {
  const {series} = await makeFixture();
  const report = await seriesAudit(series);
  assert.ok(report.ok, formatSeriesAudit(report));
  assert.equal(report.code, 'SERIES_AUDIT_OK');
  assert.equal(report.episodes, 1);
});

test('voice, open/close and glossary drift fail the audit', async () => {
  const {series, episode} = await makeFixture();
  const linesFile = path.join(episode, 'lines.json');
  const lines = JSON.parse(await fs.readFile(linesFile, 'utf8'));
  lines.voice_provider = 'another-provider';
  await writeJson(linesFile, lines);
  let report = await seriesAudit(series);
  assert.ok(!report.ok);
  assert.ok(report.checks.some(check => !check.ok && check.id === 'voice.provider'), formatSeriesAudit(report));

  const scenesFile = path.join(episode, 'render', 'scenes.json');
  const scenes = JSON.parse(await fs.readFile(scenesFile, 'utf8'));
  scenes.scenes = scenes.scenes.filter(scene => scene.role !== 'open');
  await writeJson(scenesFile, scenes);
  report = await seriesAudit(series);
  assert.ok(report.checks.some(check => !check.ok && check.id === 'open.count'), formatSeriesAudit(report));

  const scriptFile = path.join(episode, 'script.md');
  await fs.appendFile(scriptFile, '\n路口。\n');
  report = await seriesAudit(series);
  assert.ok(report.checks.some(check => !check.ok && check.id === 'glossary'), formatSeriesAudit(report));
});

test('series deliver refuses without a per-episode package', async () => {
  const {series} = await makeFixture();
  const report = await seriesDeliver(series);
  assert.equal(report.code, 'SERIES_DELIVER_INCOMPLETE');
  assert.match(formatSeriesDeliver(report), /SERIES_DELIVER_INCOMPLETE/);
});

test('series deliver aggregates delivered episodes with index and checksums', async () => {
  const {series, episode} = await makeFixture();
  await makeDelivery(episode);
  const report = await seriesDeliver(series);
  assert.ok(report.ok, formatSeriesDeliver(report));
  assert.equal(report.code, 'COLLECTION_DELIVERED');

  const latest = (await fs.readFile(path.join(series, 'deliver', 'LATEST'), 'utf8')).trim();
  const dir = path.join(series, 'deliver', latest);
  for (const name of ['index.json', 'SHA256SUMS', 'collection.md', 'covers.html', 'ep01/manifest.json']) {
    assert.ok(await fs.access(path.join(dir, name)).then(() => true, () => false), name);
  }
  const index = JSON.parse(await fs.readFile(path.join(dir, 'index.json'), 'utf8'));
  assert.equal(index.schema, 'storyweaver.collection_package.v1');
  assert.equal(index.episodes.length, 1);
  assert.equal(index.episodes[0].slot, 'ep01');
  assert.match(await fs.readFile(path.join(dir, 'covers.html'), 'utf8'), /ep01\/cover\.png/);
  assert.match(await fs.readFile(path.join(dir, 'SHA256SUMS'), 'utf8'), /ep01\/manifest\.json/);
});
