import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyFrameTime, createSeekTimeline, progressTimeline, seekTimeline} from '../studio/render/browser/dom/gsap_clock.js';
import {frameIndex, localWindow} from '../studio/render/browser/dom/timing.js';
import {runDoctor} from '../studio/doctor.mjs';
import {renderShotFixture} from '../studio/render/browser/shot_preview.mjs';
import {assertShotDirectory, validateShotFixture} from '../studio/render/browser/validate_shot.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const demo = path.join(root, 'docs/demo/title-card');
const read = file => fs.readFile(path.join(root, file), 'utf8');

const SOURCE = [
  'studio/render/browser/dom/gsap_clock.js',
  'studio/render/browser/dom/timing.js',
  'studio/render/browser/dom/frame.jsx',
  'studio/render/browser/dom/lottie_seek.js',
  'studio/render/browser/dom/title_card.jsx',
  'studio/render/browser/dom/stage.js',
  'studio/render/browser/dom/entry.jsx',
];

test('motion sources do not schedule frames, timers, or CSS animation', async () => {
  const banned = /\brequestAnimationFrame\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\(|\bMath\.random\s*\(|\bDate\.now\s*\(|\bperformance\.now\s*\(|@keyframes|animation\s*:|transition\s*:/;
  for (const file of SOURCE) {
    const text = await read(file);
    assert.doesNotMatch(text, banned, file);
    assert.doesNotMatch(text, /from ['"]remotion['"]|from ['"]framer-motion['"]|from ['"]@rive-app\//, file);
  }
});

test('package installs GSAP, React, Lucide, and Lottie, and not Remotion, Motion, or Rive', async () => {
  const pkg = JSON.parse(await read('package.json'));
  for (const name of ['gsap', 'react', 'react-dom', 'lucide-react', 'lottie-web']) {
    assert.ok(pkg.dependencies[name], name);
  }
  for (const name of ['remotion', 'framer-motion', 'motion', '@rive-app/react-canvas', 'rive-js']) {
    assert.equal(pkg.dependencies[name], undefined, name);
    assert.equal(pkg.devDependencies?.[name], undefined, name);
  }
});

test('docs name Remotion, Motion, and Rive as inspirations, not dependencies', async () => {
  for (const file of [
    'AGENTS.md',
    'docs/adapters.md',
    'skills/produce-video/SKILL.md',
    'studio/render/adapters/README.md',
    'studio/render/browser/dom/README.md',
  ]) {
    const text = await read(file);
    assert.match(text, /Remotion, Motion, and Rive are inspirations, not dependencies/);
    assert.match(text, /seek\(t\)/);
    assert.match(text, /GSAP|gsap/);
  }
});

test('a paused GSAP timeline seeks and reports totalProgress from external time', () => {
  const obj = {x: 0};
  const timeline = createSeekTimeline(tl => {
    tl.to(obj, {x: 100, duration: 2, ease: 'none'});
    tl.set({}, {}, 4);
  });
  assert.equal(timeline.paused(), true);
  assert.equal(seekTimeline(timeline, 1), 1);
  assert.equal(obj.x, 50);
  assert.equal(timeline.totalProgress(), 0.25);
  assert.equal(progressTimeline(timeline, 1), 1);
  assert.equal(obj.x, 100);
  const again = applyFrameTime(timeline, 1);
  assert.equal(again.time, 1);
  assert.equal(again.totalProgress, 0.25);
  assert.equal(obj.x, 50);
  assert.equal(timeline.paused(), true);
});

test('sequence windows and frame index are pure', () => {
  assert.deepEqual(localWindow(2, 2.45, 1), {active: false, local: 0});
  assert.deepEqual(localWindow(2.45, 2.45, 1), {active: true, local: 0});
  assert.ok(Math.abs(localWindow(3, 2.45, 1).local - 0.55) < 1e-9);
  assert.equal(localWindow(3.45, 2.45, 1).active, false);
  assert.equal(frameIndex(1.5, 30), 45);
  assert.equal(frameIndex(-1, 30), 0);
});

test('title-card fixture is a 10s kinetic shot with three unused', async () => {
  const {doc, clock} = await assertShotDirectory(demo);
  assert.equal(doc.duration_s, 10);
  assert.equal(doc.three, false);
  assert.equal(clock.ok, true);
  assert.ok(clock.max_gap_s <= 2.5);
  const bad = await validateShotFixture({...doc, three: true, duration_s: 30});
  assert.equal(bad.ok, false);
});

test('doctor accepts the title-card fixture', async () => {
  const report = await runDoctor({episodeDir: demo, forRender: true});
  const shot = report.checks.find(check => check.id === 'shot-fixture');
  assert.equal(shot.ok, true, shot.detail);
  assert.match(shot.detail, /three unused/);
});

test('shot fixture refuses a release render', async () => {
  await assert.rejects(
    () => renderShotFixture(demo, {review: 'release', cut: 'full'}),
    /silent draft preview/,
  );
});

test('draft preview seeks the title card without speech keys', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-title-'));
  await fs.cp(demo, dir, {recursive: true});
  const result = await renderShotFixture(dir, {review: 'draft', cut: 'preview', reviewOnly: true});
  const {report} = result;
  assert.equal(report.pipeline, 'browser-playwright-ffmpeg');
  assert.equal(report.kind, 'shot-fixture');
  assert.equal(report.review.watermark, 'Not human-reviewed');
  assert.equal(report.motion.three, false);
  assert.equal(report.motion.repeat_hash_match, true);
  assert.equal(report.motion.lucide, true);
  const shot = JSON.parse(await fs.readFile(path.join(demo, 'shot.json'), 'utf8'));
  const byId = Object.fromEntries(report.motion.samples.map(sample => [sample.id, sample]));
  for (const sample of report.motion.samples) {
    assert.equal(sample.paused, true, sample.id);
    assert.equal(sample.three, false, sample.id);
    assert.equal(sample.rafDuringSeek, 0, sample.id);
    assert.equal(sample.transitionDuration, '0s', sample.id);
    assert.equal(sample.animationName, 'none', sample.id);
    assert.ok(Math.abs(sample.duration - shot.duration_s) < 1e-3, sample.duration);
    assert.ok(Math.abs(sample.gsapTime - sample.t) < 1e-3, `${sample.id} playhead`);
    assert.ok(Math.abs(sample.totalProgress - sample.t / shot.duration_s) < 1e-3, sample.id);
  }
  const seek = byId.seek;
  const time = byId.time;
  const frame = byId.frame;
  const lockup = byId.lockup;
  const compact = text => text.replaceAll('\u00A0', '').replace(/\s+/g, '');
  assert.match(compact(seek.text), /SEEK/);
  assert.doesNotMatch(compact(seek.text), /FRAME/);
  assert.match(compact(time.text), /\(t\)/);
  assert.match(compact(time.text), /CLOCK/);
  assert.doesNotMatch(compact(time.text), /FRAME/);
  assert.match(compact(frame.text), /FRAME/);
  assert.match(compact(frame.text), /TYPE/);
  assert.doesNotMatch(compact(frame.text), /STACK/);
  assert.match(compact(lockup.text), /Oneclock\.Everypixel\./);
  assert.match(compact(lockup.text), /POST/);
  const local = seek.t - shot.flourish.from;
  const progress = Math.max(0, Math.min(1, local / shot.flourish.span));
  assert.equal(seek.frame, Math.round(progress * shot.flourish.frames));
  assert.equal(seek.currentFrame, Math.round(local * shot.fps));
  assert.ok(seek.lottieHtml > 0, 'lottie flourish did not draw');
  assert.ok(lockup.lottieHtml > seek.lottieHtml || lockup.frame > seek.frame);
  const seekPng = await fs.readFile(path.join(dir, 'out/draft/preview/thumbs/seek.png'));
  const lockPng = await fs.readFile(path.join(dir, 'out/draft/preview/thumbs/lockup.png'));
  assert.notEqual(seekPng.toString('base64'), lockPng.toString('base64'));
  await fs.access(path.join(dir, 'out/draft/preview/contact_sheet.png'));
  await fs.access(path.join(dir, 'out/draft/preview/cover.png'));
});
