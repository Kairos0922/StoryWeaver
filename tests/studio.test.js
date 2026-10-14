import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {extractSpokenLines, lintFile, lintText, loadPack} from '../studio/lint/lint_script.mjs';
import {approvalState, briefBodyHash, validateBrief} from '../studio/brief.mjs';
import {inspectEngagement} from '../studio/qc/checks.mjs';
import {runQc} from '../studio/qc/run_qc.mjs';
import {evaluateCheckpoint} from '../studio/checkpoint.mjs';
import {initEpisode} from '../studio/init_episode.mjs';
import {initSeries} from '../studio/init_series.mjs';
import {paceEpisode} from '../studio/pace.mjs';
import {checkLayout} from '../studio/layout.mjs';
import {evaluateClaimPrecision} from '../studio/claims.mjs';
import {evaluatePace} from '../studio/pace.mjs';
import {cacheKey, missingSecrets} from '../studio/tts/interface.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = path.join(root, 'tests/fixtures/sample-series/ep01');
const zhScript = path.join(root, 'tests/fixtures/sample-series/zh-script.md');

function runCli(args) {
  return spawnSync(process.execPath, ['studio/cli.mjs', ...args], {cwd: root, encoding: 'utf8'});
}

const briefBody = `# Brief

## One thing

Press only one elevator direction.

## Viewer intuition

| # | Viewer’s private objection | When that is true | Our reply (fact-card B only) | Line ids |
| --- | --- | --- | --- | --- |
| I1 | I pressed first so I should be next | If the car used first-come | Collective control is faster on average | L02 |

## Aspect

Landscape.

## Duration

80 seconds.

## Approach

- Techniques: concept-machine
- Why: the rule is a hidden mechanism, and a moving machine makes its order visible.

## Concept machine

- Machine: an elevator car on a rail that sweeps one direction at a time
- Motion: the car keeps sweeping up before it turns; that means requests are served by direction, not by press order
- Lit subject: the up arrow
- Model: fact_card.md B1

## Five-beat story

1. Hook: the door does not open.
2. Break the assumption: first-pressed is not first-served.
3. Mechanism: it finishes the same direction.
4. Payoff: the extra wait is yours.
5. Audience stance: have you pressed both?

## Storyboard

| Window | 0–3s | 3–7s | 7–10s | Devices | Character action | Voice point |
| --- | --- | --- | --- | --- | --- | --- |
| 0–10s | door shut | one number | a flinch | kinetic number, cut, stamp, character action | stand-in reaches, rule blocks | it saw you |
`;

test('layout lists the studio path', async () => {
  const report = await checkLayout(root);
  assert.deepEqual(report.missing, []);
});

test('template script has no scaffold errors', async () => {
  const result = await lintFile(path.join(root, 'studio/templates/script.md'));
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors, null, 2));
});

test('self-check section is not spoken', async () => {
  const result = await lintText(`# Sample

- **One thing:** press only one direction.

## Hook
> Narrator: The door stays shut.

## Break the assumption
> Narrator: First-pressed is not first-served.

## Mechanism
> Narrator: It finishes the same direction.

## Payoff
> Narrator: The extra wait is yours.

## Audience stance
> Narrator: Have you pressed both?

## Self-check
Unused in plain English.
> in plain English: not spoken.
> First, this line is in the self-check.
`, {filename: 'script.md', language: 'en'});
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
});

test('English scaffold, ordinal, emoji and long sentences are reported', async () => {
  const result = await lintText(`# Sample

## Hook
> Narrator: in plain English: wait.

## Break the assumption
> Narrator: First, only press one, and this sentence is deliberately padded with extra filler words so that it clearly crosses the twenty-two word warning limit.

## Mechanism
> Narrator: not only slower but also costlier.

## Payoff
> Narrator: remember this one thing. so——

## Audience stance
> Narrator: which side 🙂
`, {filename: 'script.md', language: 'en'});
  const errors = new Set(result.errors.map(item => item.rule));
  assert.ok(errors.has('meta-plain-speech'));
  assert.ok(errors.has('oral-ordinal'));
  assert.ok(errors.has('scaffold-not-only'));
  assert.ok(errors.has('scaffold-remember'));
  assert.ok(errors.has('scaffold-so-dash'));
  assert.ok(errors.has('emoji'));
  assert.ok(result.warnings.some(item => item.rule === 'long-sentence'));
});

test('fixture scripts pass the English and Chinese packs', async () => {
  const script = await fs.readFile(path.join(fixture, 'script.md'), 'utf8');
  const rules = await loadPack('en');
  const spoken = extractSpokenLines(script, rules.speakers);
  const lines = JSON.parse(await fs.readFile(path.join(fixture, 'lines.json'), 'utf8'));
  assert.equal(lines.lines.length, spoken.length);
  for (let i = 0; i < spoken.length; i++) {
    assert.equal(lines.lines[i].text, spoken[i].text);
    assert.equal(lines.lines[i].speaker, spoken[i].speaker);
  }
  const linted = await lintFile(path.join(fixture, 'script.md'));
  assert.equal(linted.errors.length, 0, JSON.stringify(linted.errors));
  const zh = await lintFile(zhScript);
  assert.equal(zh.language, 'zh');
  assert.equal(zh.errors.length, 0, JSON.stringify(zh.errors));
  const cli = runCli(['lint-script', 'tests/fixtures/sample-series/ep01/script.md']);
  assert.equal(cli.status, 0);
});

test('fixture passes every checkpoint up to render; publish waits for studio deliver', async () => {
  const pace = await paceEpisode(fixture);
  assert.equal(pace.ok, true, pace.evidence);
  assert.equal(pace.source, 'estimate');
  for (const stage of ['brief', 'lines', 'hook-sample', 'stills', 'render']) {
    const result = await evaluateCheckpoint(fixture, stage);
    assert.equal(result.exitCode, 0, `${stage} ${result.code}`);
  }
  const publish = await evaluateCheckpoint(fixture, 'publish');
  assert.deepEqual(publish.blockers.map(b => b.id), ['delivery']);
  const cli = runCli(['checkpoint', 'tests/fixtures/sample-series/ep01', 'brief']);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /^BRIEF_APPROVED/m);
});

test('fresh episode is incomplete and blocked', async () => {
  const series = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-fresh-'));
  const created = await initEpisode(series, 'ep01');
  const phase = await evaluateCheckpoint(created.episodeDir, 'brief');
  assert.equal(phase.code, 'BRIEF_INCOMPLETE');
  assert.ok(phase.issues.some(issue => issue.id === 'storyboard_empty'));
  const render = await evaluateCheckpoint(created.episodeDir, 'render');
  assert.equal(render.code, 'BRIEF_REQUIRED');
  assert.equal(render.exitCode, 2);
  const linted = await lintFile(path.join(created.episodeDir, 'script.md'));
  assert.equal(linted.ok, true);
});

test('human pass without a name stays pending', async () => {
  const series = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-human-'));
  const created = await initEpisode(series, 'ep01');
  const checklistPath = path.join(created.episodeDir, 'qc', 'checklist.json');
  const checklist = JSON.parse(await fs.readFile(checklistPath, 'utf8'));
  const ear = checklist.items.find(item => item.id === 'ear_hook');
  ear.status = 'pass';
  ear.checked_by = '';
  await fs.writeFile(checklistPath, JSON.stringify(checklist));
  const report = await runQc(created.episodeDir);
  assert.equal(report.items.find(item => item.id === 'ear_hook').status, 'pending');
});

test('agent names cannot sign human checks', async () => {
  const series = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-agent-'));
  const created = await initEpisode(series, 'ep01');
  const checklistPath = path.join(created.episodeDir, 'qc', 'checklist.json');
  const checklist = JSON.parse(await fs.readFile(checklistPath, 'utf8'));
  const ear = checklist.items.find(item => item.id === 'ear_hook');
  ear.status = 'pass';
  ear.checked_by = 'Claude Opus cloud agent';
  await fs.writeFile(checklistPath, JSON.stringify(checklist));
  const report = await runQc(created.episodeDir);
  assert.equal(report.items.find(item => item.id === 'ear_hook').status, 'pending');
});

test('approved episode can render and a later edit expires approval', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-ok-'));
  const hash = briefBodyHash(`---\nstatus: draft\n---\n${briefBody}`);
  const doc = ({status, duration, approvedDuration, bodyText, bodyHash}) => `---
status: ${status}
series: demo
episode: ep02
aspect: "16:9"
target_duration_s: ${duration}
produce_vertical: false
vertical_duration_s: ""
structure_revision: 1
approved_by: "reviewer"
approved_at: "2026-10-10"
approved_aspect: "16:9"
approved_duration_s: ${approvedDuration}
approved_produce_vertical: false
approved_vertical_duration_s: ""
approved_structure_revision: 1
approved_body_sha256: "${bodyHash}"
---

${bodyText}`;
  await fs.writeFile(path.join(dir, 'brief.md'), doc({
    status: 'approved', duration: 80, approvedDuration: 80, bodyText: briefBody, bodyHash: hash,
  }));
  await fs.writeFile(path.join(dir, 'script.md'), `# demo

- **One thing:** press only one elevator direction.

## Hook
> Narrator: The door stays shut.

## Break the assumption
> Narrator: First-pressed is not first-served.

## Mechanism
> Narrator: It finishes the same direction.

## Payoff
> Narrator: The extra wait is yours.

## Audience stance
> Narrator: Have you pressed both?
`);
  await fs.mkdir(path.join(dir, 'post'), {recursive: true});
  await fs.writeFile(path.join(dir, 'fact_card.md'), `# Fact card

## A. Sources

This fixture has no external numbers.

## B. Numbers

This episode has no on-screen numbers.

## C. Do not say

Do not say that pressing more times is faster.
`);
  await fs.writeFile(path.join(dir, 'post/metrics.md'), await fs.readFile(path.join(root, 'studio/templates/metrics.md'), 'utf8'));
  const template = JSON.parse(await fs.readFile(path.join(root, 'studio/qc/checklist.json'), 'utf8'));
  for (const item of template.items) {
    if (item.kind === 'human' && item.blocks.includes('render')) {
      item.status = 'pass';
      item.checked_by = 'reviewer';
      item.evidence = 'fixture';
    }
  }
  await fs.mkdir(path.join(dir, 'qc'), {recursive: true});
  await fs.writeFile(path.join(dir, 'qc/checklist.json'), JSON.stringify(template));
  const state = approvalState(await fs.readFile(path.join(dir, 'brief.md'), 'utf8'));
  assert.equal(state.code, 'BRIEF_APPROVED', JSON.stringify(state.structure.issues));
  const render = await evaluateCheckpoint(dir, 'render');
  assert.equal(render.code, 'RENDER_ALLOWED', JSON.stringify(render.blockers));
  const publish = await evaluateCheckpoint(dir, 'publish');
  assert.notEqual(publish.code, 'PUBLISH_ALLOWED');

  await fs.writeFile(path.join(dir, 'brief.md'), doc({
    status: 'approved', duration: 70, approvedDuration: 80, bodyText: briefBody, bodyHash: hash,
  }));
  const staleDuration = await evaluateCheckpoint(dir, 'render');
  assert.equal(staleDuration.code, 'BRIEF_STALE');

  await fs.writeFile(path.join(dir, 'brief.md'), doc({
    status: 'approved', duration: 80, approvedDuration: 80, bodyText: `${briefBody}\nOne extra sentence.\n`, bodyHash: hash,
  }));
  const staleBody = await evaluateCheckpoint(dir, 'render');
  assert.equal(staleBody.code, 'BRIEF_STALE');
});

test('engagement numbers need a source and cannot be estimates', async () => {
  const template = await fs.readFile(path.join(root, 'studio/templates/metrics.md'), 'utf8');
  assert.equal(inspectEngagement(template).ok, true);
  assert.equal(inspectEngagement(template.replace('- Completion rate:', '- Completion rate: 40%')).ok, false);
  assert.equal(inspectEngagement(template.replace('- Completion rate:', '- Completion rate: roughly high')).ok, false);
  const sourced = template.replace('- Completion rate:', '- Completion rate: 40% (source: sample export, not a real score)');
  assert.equal(inspectEngagement(sourced).ok, true);
});

test('a sourced metrics sheet opens the next episode', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-series-'));
  const series = path.join(parent, 'demo-series');
  const createdSeries = await initSeries(series);
  assert.equal(createdSeries.id, 'demo-series');
  await initEpisode(series, 'ep01');
  await assert.rejects(() => initEpisode(series, 'ep02'), error => error.code === 'METRICS_REQUIRED');
  const metricsPath = path.join(series, 'ep01/post/metrics.md');
  const metrics = (await fs.readFile(metricsPath, 'utf8'))
    .replace('- Completion rate:', '- Completion rate: 40% (source: fixture-export.csv)')
    .replace('- Data source (dashboard URL or export filename; blank if none):', '- Data source (dashboard URL or export filename; blank if none): fixture-export.csv');
  await fs.writeFile(metricsPath, metrics);
  const created = await initEpisode(series, 'ep02');
  assert.equal(created.previous, 'METRICS_PRESENT');
  await assert.rejects(() => initEpisode(series, 'ep03'), error => error.code === 'METRICS_REQUIRED');
  await assert.rejects(() => initSeries(root), error => error.code === 'WORKSPACE_INSIDE_REPO');
  await assert.rejects(() => initEpisode(root, 'ep01'), error => error.code === 'WORKSPACE_INSIDE_REPO');
});

test('dual aspect requires a vertical duration inside 60 seconds', () => {
  const markdown = `---
status: draft
aspect: "16:9+9:16"
target_duration_s: 90
produce_vertical: false
vertical_duration_s: ""
structure_revision: 0
---

${briefBody}
`;
  const result = validateBrief(markdown);
  assert.ok(result.issues.some(issue => issue.id === 'vertical_duration_cap'));
});

test('landscape length has no built-in cap; the approved brief sets the window', async () => {
  const markdown = `---
status: draft
aspect: "16:9"
target_duration_s: 140
produce_vertical: false
vertical_duration_s: ""
structure_revision: 0
---

${briefBody}
`;
  const result = validateBrief(markdown);
  assert.ok(!result.issues.some(issue => issue.id === 'duration_cap'));
  const {durationWindow, checkMeasured} = await import('../studio/duration.mjs');
  const win = durationWindow({approved_duration_s: 95, target_duration_s: 95});
  assert.equal(win.source, 'approved_duration_s');
  assert.equal(win.max_s, 104.5);
  assert.equal(checkMeasured(97, win).ok, true);
  assert.equal(checkMeasured(80, win).detail, 'under');
  assert.equal(checkMeasured(110, win).detail, 'over');
  const series = durationWindow({}, {default_s: 60, tolerance: 0.05});
  assert.equal(series.source, 'series default_s');
  assert.equal(series.max_s, 63);
});

test('average claims without the word average fail precision', () => {
  const fact = `## B. Numbers

| # | On-screen number | Value | Quantity type | Scene | Field |
|---|---|---|---|---|---|
| B5 | extra wait | 30s | average | baseline | wait |
`;
  const bad = evaluateClaimPrecision({
    factCard: fact,
    lines: [{id: 'L16', text: 'You gain half a minute.', claims: ['B5']}],
  });
  assert.equal(bad.ok, false);
  const good = evaluateClaimPrecision({
    factCard: fact,
    lines: [{id: 'L16', text: 'On average everyone waits about half a minute less.', claims: ['B5']}],
  });
  assert.equal(good.ok, true);
});

test('pace flags a line over the Chinese cap', async () => {
  const pack = await loadPack('zh');
  const result = evaluatePace({
    language: 'zh',
    pack,
    timing: {lines: {L01: {start: 0, end: 1}}},
    lines: [{id: 'L01', text: '一二三四五六七八九十', pause_after_s: 0.2}],
  });
  assert.equal(result.ok, false);
  assert.ok(result.findings.some(f => f.rule === 'pace'));
});

test('TTS adapters never see hardcoded secrets', () => {
  assert.deepEqual(missingSecrets('doubao'), ['VOLC_TTS_APP_ID', 'VOLC_TTS_ACCESS_TOKEN']);
  const a = cacheKey({provider: 'doubao', voice: 'a', text: 'hi', emotion: '', speechRate: -10});
  const b = cacheKey({provider: 'doubao', voice: 'a', text: 'hi', emotion: '', speechRate: -10});
  const c = cacheKey({provider: 'doubao', voice: 'a', text: 'ho', emotion: '', speechRate: -10});
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('fixture stills use kit components and subtitle only script lines', async () => {
  const {createContext, runInContext} = await import('node:vm');
  const kit = await fs.readFile(path.join(root, 'studio/render/kit/canvas/kit.js'), 'utf8');
  const context = createContext({});
  runInContext(kit, context);
  const known = new Set(context.SWKit.components);
  const spec = JSON.parse(await fs.readFile(path.join(fixture, 'render/stills.json'), 'utf8'));
  const {speakers} = await loadPack('en');
  const spoken = extractSpokenLines(await fs.readFile(path.join(fixture, 'script.md'), 'utf8'), speakers);
  const walk = layers => layers.flatMap(layer => [layer.type, ...walk(layer.layers || [])]);
  for (const shot of spec.shots) {
    for (const type of walk([...(shot.layers || []), ...(shot.overlay || [])])) {
      assert.ok(known.has(type), `${shot.id}: unknown component ${type}`);
    }
    if (shot.subtitle) {
      const {speaker, text} = shot.subtitle;
      assert.ok(spoken.some(line => line.speaker === speaker && line.text.includes(text)), `${shot.id}: subtitle not in script.md`);
    }
  }
});

test('CLI help is English', () => {
  const help = runCli([]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /checkpoint/);
  assert.doesNotMatch(help.stdout, /闸门|Phase A/);
});
