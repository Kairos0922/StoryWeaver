import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {PROVIDERS, loadAdapter} from '../studio/tts/interface.mjs';
import {predictDuration} from '../studio/duration.mjs';
import {fitListen, selectKeyLines} from '../studio/listen_pack.mjs';
import {costFromUsage} from '../studio/cost.mjs';
import {evaluateBudget} from '../studio/budget.mjs';
import {releaseSignoffError} from '../studio/review.mjs';
import {assertRenderReview} from '../studio/review.mjs';
import {createHandoff} from '../studio/handoff.mjs';
import {formatResume, resumeEpisode} from '../studio/resume.mjs';
import {formatGitSync, planGitSync} from '../studio/git_sync.mjs';
import {clearDone} from '../studio/state.mjs';
import {validateSceneGraph} from '../studio/render/browser/validate_scene.mjs';
import {formatDoctor, runDoctor} from '../studio/doctor.mjs';
import {renderEpisode} from '../studio/render/browser/pipeline.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = path.join(root, 'tests/fixtures/sample-series/ep01');

function loadBrowser(file) {
  const context = vm.createContext({globalThis: {}, document: {createElement() { return {}; }}});
  context.globalThis = context;
  return context;
}

test('browser sources do not read the wall clock or an unseeded random', async () => {
  for (const file of ['post.js', 'compositor.js', 'three_layer.js']) {
    const text = await fs.readFile(path.join(root, 'studio/render/browser', file), 'utf8');
    assert.doesNotMatch(text, /\bMath\.random\s*\(|\brequestAnimationFrame\s*\(|\bDate\.now\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\(|\bperformance\.now\s*\(/);
  }
});

test('grain and grade are pure functions of their inputs', async () => {
  await import('../studio/render/browser/post.js');
  const {gradePixel, grainUnit} = globalThis.SWPost;
  assert.equal(grainUnit(20261010, 12, 40, 8), grainUnit(20261010, 12, 40, 8));
  assert.notEqual(grainUnit(20261010, 12, 40, 8), grainUnit(20261010, 12, 40, 9));
  const preset = {lift: [0.01, 0.01, 0.01], gamma: [0.95, 0.95, 0.95], gain: [1.02, 1.02, 1.02], saturation: 1.05, temperature: 0.01, vignette: 0.2};
  const a = gradePixel([0.8, 0.4, 0.2], preset, [0.5, 0.5]);
  const b = gradePixel([0.8, 0.4, 0.2], preset, [0.5, 0.5]);
  assert.deepEqual(a, b);
  assert.ok(a.every(channel => channel >= 0 && channel <= 1));
});

test('a shot without a stack is a single canvas layer', async () => {
  const source = await fs.readFile(path.join(root, 'studio/render/browser/compositor.js'), 'utf8');
  const context = loadBrowser();
  vm.runInContext(source, context);
  const stack = context.SWCompose.stackOf({id: 's'});
  assert.equal(stack.length, 1);
  assert.equal(stack[0].kind, 'canvas2d');
  assert.equal(context.SWCompose.DRAFT_WATERMARK, 'Not human-reviewed');
  const preset = context.SWCompose.presetByName({default: 'explainer', presets: {explainer: {bloom: 0.2}}}, undefined);
  assert.equal(preset.name, 'explainer');
  assert.equal(preset.bloom, 0.2);
});

test('TTS providers are dry-run and Doubao', async () => {
  assert.deepEqual(PROVIDERS, ['dry-run', 'doubao']);
  const dry = await loadAdapter('dry-run');
  assert.equal(dry.name, 'dry-run');
  const doubao = await loadAdapter('doubao');
  assert.equal(doubao.name, 'doubao');
  await assert.rejects(() => loadAdapter('azure'), /Unknown TTS provider/);
  await assert.rejects(() => loadAdapter('elevenlabs'), /Unknown TTS provider/);
});

test('hook rate predicts the full duration and stops over the brief limit', () => {
  const lines = [
    {id: 'L01', text: 'one two three four', pause_after_s: 0.2},
    {id: 'L02', text: 'five six seven eight', pause_after_s: 0.2},
    {id: 'L03', text: 'nine ten eleven twelve', pause_after_s: 0.2},
    {id: 'L04', text: 'thirteen fourteen fifteen sixteen seventeen eighteen', pause_after_s: 0.2},
  ];
  const result = predictDuration({
    lines,
    language: 'en',
    hookDurations: [
      {id: 'L01', seconds: 2},
      {id: 'L02', seconds: 2},
      {id: 'L03', seconds: 2},
    ],
    leadIn: 0,
    tail: 0,
    defaultGap: 0,
    holds: {},
    limitSeconds: 5,
  });
  assert.equal(result.hook_rate, 2);
  assert.ok(result.duration_s > 5);
  assert.equal(result.over, true);
  assert.equal(result.lines[3].source, 'predicted');
  assert.equal(result.lines[0].source, 'recorded');
});

test('listen pack keeps numbers, names, and the vote inside 30 seconds', () => {
  const lines = [
    {id: 'L01', text: 'Hello there', speaker: 'Narrator'},
    {id: 'L02', text: 'The average is 40 percent', speaker: 'Dida', key_number: true},
    {id: 'L03', text: 'Agui already left', speaker: 'Dengdeng'},
    {id: 'L04', text: 'Which line do you join?', speaker: 'Narrator'},
  ];
  const selected = selectKeyLines({lines, names: ['Agui']});
  assert.deepEqual(selected.map(line => line.id), ['L02', 'L03', 'L04']);
  const fit = fitListen(selected, {L02: 12, L03: 12, L04: 12}, 30);
  assert.ok(fit.lines.length < selected.length);
  assert.ok(fit.lines.some(line => line.id === 'L02'));
  assert.ok((fit.seconds ?? 0) <= 30);
});

test('render cost uses the list price and leaves model calls blank', () => {
  const cost = costFromUsage([
    {chars: 348, retake: false},
    {chars: 379, retake: true},
  ], {renders: 2});
  assert.equal(cost.tts_chars, 727);
  assert.equal(cost.tts_cny, 0.2181);
  assert.equal(cost.list_price_cny_per_10k_chars, 3);
  assert.equal(cost.renders, 2);
  assert.equal(cost.model_calls, null);
  assert.ok(cost.rerecord_ratio > 0.5 && cost.rerecord_ratio < 0.53);
});

test('model budget stops at 70 percent', () => {
  const open = evaluateBudget({calls: 100, used: 69, stopRatio: 0.7});
  assert.equal(open.stop, false);
  const stop = evaluateBudget({calls: 100, used: 70, stopRatio: 0.7});
  assert.equal(stop.stop, true);
  assert.match(stop.guidance, /MODEL_BUDGET_STOP/);
  const missing = evaluateBudget({calls: '', used: 10});
  assert.equal(missing.stop, false);
  assert.match(missing.guidance, /model_budget_calls/);
});

test('release sign-off rejects an empty name and an agent name', () => {
  assert.match(releaseSignoffError(null), /missing/);
  assert.match(releaseSignoffError({signed_by: '', signed_at: '2026-10-10'}), /signed_by/);
  assert.match(releaseSignoffError({signed_by: 'Claude agent', signed_at: '2026-10-10'}), /Agents cannot/);
  assert.match(releaseSignoffError({signed_by: 'Kairos', signed_at: '2026-10-10'}), /quality_review/);
  const qr = {answer: 'yes', checked_by: 'Kairos'};
  assert.equal(releaseSignoffError({signed_by: 'Kairos', signed_at: '2026-10-10', quality_review: {hook_5s: qr, key_still: qr, takeaway: qr}}), '');
});

test('fixture draft review is open and release is not', async () => {
  const draft = await assertRenderReview(fixture, {review: 'draft', cut: 'preview'});
  assert.equal(draft.watermark, 'Not human-reviewed');
  await assert.rejects(() => assertRenderReview(fixture, {review: 'release', cut: 'full'}));
});

test('scene rig check rejects an expression the character does not have', () => {
  const rig = {characters: {agui: {expressions: {serious: {}}}}};
  const gestures = new Set(['point']);
  const bad = validateSceneGraph({
    doc: {scenes: [{id: 's', layers: [{type: 'character', id: 'agui', expr: 'neutral', gesture: 'point'}]}]},
    rig,
    gestures,
    label: 'scenes',
  });
  assert.equal(bad.ok, false);
  assert.match(bad.issues.join('\n'), /neutral/);
  const good = validateSceneGraph({
    doc: {scenes: [{id: 's', layers: [{type: 'character', id: 'agui', expr: 'serious', gesture: 'point'}]}]},
    rig,
    gestures,
    label: 'scenes',
  });
  assert.equal(good.ok, true);
});

test('handoff names the commit and the commands for the key-holding machine', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-handoff-'));
  const result = await createHandoff(dir, {root});
  assert.equal(result.doc.schema, 'storyweaver.handoff.v1');
  assert.ok(result.doc.commands.some(command => command.includes('render') && command.includes('--mode draft')));
  assert.doesNotMatch(JSON.stringify(result.doc), /VOLC_|API_KEY/);
});

test('resume points at the next open stage and git-sync can be planned again', async () => {
  const result = await resumeEpisode(fixture);
  assert.ok(['RESUME_NEXT', 'RESUME_WAITING', 'RESUME_COMPLETE', 'MODEL_BUDGET_STOP'].includes(result.code));
  assert.match(formatResume(result), /git-sync/);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-git-'));
  const planned = await planGitSync(dir);
  assert.ok(planned.plan.commands.some(command => command.startsWith('git push')));
  await clearDone(dir, 'git-sync');
  const again = await planGitSync(dir, {retry: true});
  assert.match(formatGitSync(again, {retry: true}), /GIT_SYNC_READY/);
});

test('doctor report describes keys as set or unset and never prints the value', async () => {
  const previous = process.env.VOLC_TTS_API_KEY;
  process.env.VOLC_TTS_API_KEY = 'super-secret-value';
  try {
    const report = await runDoctor({episodeDir: fixture, forRender: true});
    const text = `${JSON.stringify(report)}\n${formatDoctor(report)}`;
    assert.equal(text.includes('super-secret-value'), false);
    const key = report.checks.find(check => check.id === 'env:VOLC_TTS_API_KEY');
    assert.equal(key.detail, 'set');
    assert.ok(report.checks.some(check => check.id === 'font-weight-400'));
    assert.ok(report.checks.some(check => check.id === 'loudnorm-self-test'));
    assert.equal(report.checks.find(check => check.id === 'scene-rig').ok, true);
    assert.equal(report.render_ok, true, formatDoctor(report));
    assert.ok(report.checks.some(check => check.id === 'chromium'));
  } finally {
    if (previous == null) delete process.env.VOLC_TTS_API_KEY;
    else process.env.VOLC_TTS_API_KEY = previous;
  }
});

test('fixture draft preview renders in the browser without speech keys', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-preview-'));
  const copy = path.join(dir, 'ep01');
  await fs.cp(fixture, copy, {recursive: true});
  const result = await renderEpisode(copy, {
    review: 'draft',
    cut: 'preview',
    reviewOnly: true,
    noVideo: true,
    until: 1.2,
    workers: 1,
  });
  assert.equal(result.report.pipeline, 'browser-playwright-ffmpeg');
  assert.equal(result.report.review.watermark, 'Not human-reviewed');
  assert.equal(result.report.mode, 'preview');
  await fs.access(path.join(copy, 'out/draft/preview/contact_sheet.png'));
  await fs.access(path.join(copy, 'out/draft/preview/thumbs/s01_door.png'));
});
