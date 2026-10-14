import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {contrastRatio, measureLayer} from '../studio/deliver/cover.mjs';
import {judgePlayback} from '../studio/deliver/playback.mjs';
import {videoKbpsFor, MAX_BYTES} from '../studio/deliver/encode.mjs';
import {deliver, latestDelivery} from '../studio/deliver/deliver.mjs';

const fixture = fileURLToPath(new URL('./fixtures/sample-series', import.meta.url));

test('contrast ratio matches WCAG', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(0), '21');
  assert.ok(contrastRatio([19, 35, 46], [10, 10, 10]) < 4.5);
});

test('playback judge catches early end and jumps', () => {
  assert.ok(judgePlayback([{type: 'tick', t: 0}, {type: 'tick', t: 1}, {type: 'ended', t: 10}], 10).ok);
  assert.ok(!judgePlayback([{type: 'tick', t: 0}, {type: 'tick', t: 15}, {type: 'ended', t: 86}], 86).ok);
  assert.ok(!judgePlayback([{type: 'ended', t: 15}], 86).ok);
});

test('publish bitrate keeps an 86 s cut under 30 MB and never above the 5.5 Mbps ceiling', () => {
  const kbps = videoKbpsFor(86);
  assert.ok(kbps <= 5500);
  assert.ok(((kbps + 128) * 1000 * 86) / 8 < MAX_BYTES);
  assert.equal(videoKbpsFor(20), 5500);
});

// Synthetic thumbnails: a 4x1 glyph core, a ring the layer paints (outline), page around it.
function synth({fill, outline, page}) {
  const width = 12, height = 7, n = width * height;
  const mk = () => Buffer.alloc(n * 3);
  const full = mk(), bare = mk(), k1 = mk(), k2 = mk();
  const set = (b, i, c) => { b[i * 3] = c[0]; b[i * 3 + 1] = c[1]; b[i * 3 + 2] = c[2]; };
  for (let i = 0; i < n; i++) {
    const x = i % width, y = (i / width) | 0;
    const core = y === 3 && x >= 4 && x <= 7;
    const ring = !core && y >= 2 && y <= 4 && x >= 3 && x <= 8;
    set(bare, i, page); set(k1, i, page); set(k2, i, page);
    set(full, i, core ? fill : ring && outline ? outline : page);
    if (core) { set(k1, i, [255, 0, 255]); set(k2, i, [0, 255, 0]); }
  }
  return {full, bare, k1, k2, width, height};
}

test('cover: dark fill swallowed by a dark outline fails even on a light page', () => {
  const r = measureLayer(synth({fill: [19, 35, 46], outline: [19, 35, 46], page: [248, 243, 234]}), {minRatio: 4.5});
  assert.equal(r.ok, false);
  assert.equal(r.edge_kind, 'outline_or_plate');
});

test('cover: white fill on a dark plate passes; dark text on dark page without outline fails', () => {
  assert.equal(measureLayer(synth({fill: [255, 255, 255], outline: [19, 35, 46], page: [229, 72, 77]}), {minRatio: 4.5}).ok, true);
  assert.equal(measureLayer(synth({fill: [19, 35, 46], outline: null, page: [40, 40, 40]}), {minRatio: 4.5}).ok, false);
});

async function seriesCopy() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-deliver-'));
  await fs.cp(fixture, path.join(root, 'sample-series'), {recursive: true});
  return path.join(root, 'sample-series', 'ep01');
}

async function fakeRelease(ep, {seconds = 3} = {}) {
  const dir = path.join(ep, 'out', 'release', 'full');
  await fs.mkdir(dir, {recursive: true});
  const mp4 = path.join(dir, 'sample-series_ep01_full.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=1280x720:rate=30:duration=${seconds}`, '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`,
    '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-shortest', mp4]);
  await fs.writeFile(path.join(dir, 'subtitles.srt'), '1\n00:00:00,000 --> 00:00:01,000\nhi\n');
  const sha256 = crypto.createHash('sha256').update(await fs.readFile(mp4)).digest('hex');
  await fs.writeFile(path.join(dir, 'render_report.json'), JSON.stringify({review: {mode: 'release'}, output: {file: mp4, sha256}, subtitles: {sidecar: path.join(dir, 'subtitles.srt')}}));
  const yes = {answer: 'yes', checked_by: 'Fixture Reviewer'};
  await fs.writeFile(path.join(ep, 'qc', 'release.json'), JSON.stringify({signed_by: 'Fixture Reviewer', signed_at: '2026-10-15', quality_review: {hook_5s: yes, key_still: yes, takeaway: yes, whole_piece: yes}}));
  return mp4;
}

test('deliver refuses without a human-signed release render (drafts are never delivered)', async () => {
  const ep = await seriesCopy();
  await assert.rejects(() => deliver(ep), e => e.code === 'DELIVER_NO_RELEASE');
});

test('deliver end to end: encode, real Chrome playback + seeks, cover, manifest; publish gate re-hashes', {timeout: 180000}, async () => {
  const ep = await seriesCopy();
  await fakeRelease(ep);
  const r = await deliver(ep);
  assert.equal(r.ok, true, JSON.stringify(r.manifest.checks, null, 1));
  const names = r.manifest.files.map(f => f.name);
  for (const n of ['sample-series_ep01_publish.mp4', 'cover.png', 'cover_320.png', 'sample-series_ep01.srt']) assert.ok(names.includes(n), n);
  assert.equal(r.manifest.checks.encode.video.profile, 'High');
  assert.ok(r.manifest.checks.playback.seeks.every(s => s.ok));
  const sums = await fs.readFile(path.join(r.dir, 'SHA256SUMS'), 'utf8');
  assert.ok(sums.includes('sample-series_ep01_publish.mp4'));
  assert.equal((await latestDelivery(ep)).ok, true);
  await fs.appendFile(path.join(r.dir, 'sample-series_ep01_publish.mp4'), 'x'); // truncated/altered transfer
  assert.equal((await latestDelivery(ep)).ok, false);
});

test('deliver rejects when a check fails and leaves no media to hand out', {timeout: 180000}, async () => {
  const ep = await seriesCopy();
  await fakeRelease(ep);
  const scenesFile = path.join(ep, 'render', 'scenes.json');
  const scenes = JSON.parse(await fs.readFile(scenesFile, 'utf8'));
  scenes.cover.layers = scenes.cover.layers.map(l => (l.type === 'label' ? {...l, color: 'ink', outline: 16} : l));
  await fs.writeFile(scenesFile, JSON.stringify(scenes));
  const r = await deliver(ep, {play: async () => ({ok: true, errors: [], seeks: []})});
  assert.equal(r.ok, false);
  assert.equal(r.manifest.checks.cover.ok, false);
  const left = await fs.readdir(r.dir);
  assert.ok(!left.some(n => n.endsWith('.mp4')));
  assert.equal((await latestDelivery(ep)).ok, false);
});
