import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const timelinePath = fileURLToPath(new URL('../kit/canvas/timeline.js', import.meta.url));
const presetsPath = fileURLToPath(new URL('./presets.json', import.meta.url));

const EVENT_IDS = ['seek', 'time', 'frame', 'stack', 'lockup'];
const ROW_IDS = ['clock', 'type', 'stack', 'post'];
const EPISODE_FILES = ['brief.md', 'lines.json', 'script.md', 'fact_card.md'];

let timeline;

async function beatClock() {
  if (timeline) return timeline.beatClock;
  const source = await fs.readFile(timelinePath, 'utf8');
  const sandbox = {};
  new Function('globalThis', 'window', source)(sandbox, undefined);
  timeline = sandbox.SWTimeline;
  return timeline.beatClock;
}

async function presetNames() {
  const doc = JSON.parse(await fs.readFile(presetsPath, 'utf8'));
  return new Set(Object.keys(doc.presets || {}));
}

export async function readShotFile(dir) {
  try {
    const text = await fs.readFile(path.join(dir, 'shot.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function isShotFixture(dir) {
  const doc = await readShotFile(dir);
  return doc?.schema === 'storyweaver.shot-fixture.v1';
}

export async function episodeFilesInShotDir(dir) {
  const found = [];
  for (const name of EPISODE_FILES) {
    try {
      await fs.access(path.join(dir, name));
      found.push(name);
    } catch {
      // absent
    }
  }
  return found;
}

export async function validateShotFixture(doc) {
  const issues = [];
  if (!doc || doc.schema !== 'storyweaver.shot-fixture.v1') issues.push('schema must be storyweaver.shot-fixture.v1');
  const duration = Number(doc?.duration_s);
  if (!(duration >= 8 && duration <= 12)) issues.push('duration_s must be between 8 and 12');
  if (doc?.fps !== 30) issues.push('fps must be 30');
  if (!Array.isArray(doc?.size) || doc.size.length !== 2 || doc.size.some(n => !(n > 0))) issues.push('size must be [width, height]');
  const names = await presetNames();
  if (!names.has(doc?.post_preset)) issues.push(`unknown post preset ${doc?.post_preset || ''}`);
  if (doc?.three !== false) issues.push('this prototype keeps three: false');
  const stack = Array.isArray(doc?.stack) ? doc.stack : [];
  if (stack.some(layer => layer?.kind === 'three')) issues.push('stack must not include a three layer');
  if (!stack.some(layer => layer?.kind === 'kinetic')) issues.push('stack needs a kinetic layer');
  const events = Array.isArray(doc?.events) ? doc.events : [];
  const ids = events.map(event => event.id);
  if (ids.join(',') !== EVENT_IDS.join(',')) issues.push(`events must be ${EVENT_IDS.join(', ')} in that order`);
  for (let i = 1; i < events.length; i++) {
    if (!(events[i].t > events[i - 1].t)) issues.push('event times must increase');
  }
  const flourish = doc?.flourish;
  if (!flourish || !(flourish.from >= 0) || !(flourish.span > 0) || flourish.frames !== 45) {
    issues.push('flourish needs from, span, and frames: 45');
  }
  const copy = doc?.copy || {};
  for (const key of ['eyebrow', 'seek', 'time', 'frame', 'lockup']) {
    if (typeof copy[key] !== 'string' || !copy[key].trim()) issues.push(`copy.${key} is required`);
  }
  const rows = Array.isArray(copy.rows) ? copy.rows : [];
  if (rows.map(row => row.id).join(',') !== ROW_IDS.join(',')) issues.push(`copy.rows must be ${ROW_IDS.join(', ')}`);
  let clock = null;
  if (issues.length === 0) {
    const check = await beatClock();
    clock = check(events, duration, doc.beat_clock || {warn_s: 2.5, fail_s: 5});
    if (!clock.ok) issues.push(`beat clock failed (${clock.max_gap_s}s)`);
  }
  return {ok: issues.length === 0, issues, clock};
}

export async function assertShotDirectory(dir) {
  const doc = await readShotFile(dir);
  if (!doc) {
    throw Object.assign(new Error('shot.json is missing'), {code: 'SHOT_FIXTURE'});
  }
  const found = await episodeFilesInShotDir(dir);
  if (found.length) {
    throw Object.assign(
      new Error(`A shot fixture is not an episode. ${found.join(', ')} belongs in a series directory outside this repo.`),
      {code: 'SHOT_BOUNDARY'},
    );
  }
  const report = await validateShotFixture(doc);
  if (!report.ok) {
    throw Object.assign(new Error(report.issues.join('\n')), {code: 'SHOT_FIXTURE'});
  }
  return {doc, clock: report.clock};
}
