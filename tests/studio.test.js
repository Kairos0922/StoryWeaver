import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {extractSpokenLines, lintFile, lintText, loadRules} from '../studio/lint/lint_script.mjs';
import {approvalState, phaseABodyHash, validatePhaseA} from '../studio/phase_a.mjs';
import {inspectEngagement} from '../studio/qc/checks.mjs';
import {runQc} from '../studio/qc/run_qc.mjs';
import {evaluateGate} from '../studio/gate.mjs';
import {initEpisode} from '../studio/init_episode.mjs';
import {checkLayout} from '../studio/layout.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ep01 = path.join(root, 'series/invisible-rules/ep01');

function runCli(args) {
  return spawnSync(process.execPath, ['studio/cli.mjs', ...args], {cwd: root, encoding: 'utf8'});
}

test('layout lists the studio path', async () => {
  const report = await checkLayout(root);
  assert.deepEqual(report.missing, []);
});

test('template script has no scaffold errors', async () => {
  const result = await lintFile(path.join(root, 'studio/templates/script.md'));
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors, null, 2));
});

test('self-check section is not spoken', async () => {
  const result = await lintText(`# 样例

- **整集只讲一件事：** 只按一个方向。

## 钩子
> 旁白：门没开。

## 打碎常识
> 旁白：先按并不先坐。

## 内幕
> 旁白：它先送同方向。

## 真相
> 旁白：多等的是自己。

## 评论站队
> 旁白：你上下都按过吗？

## 自查
没用说人话。
> 说人话：这句不算口播。
> 第一，这句在自查里。
`, {filename: 'script.md'});
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
  assert.equal(result.warnings.length, 0, JSON.stringify(result.warnings));
});

test('scaffold, ordinal, emoji and long sentences are reported', async () => {
  const result = await lintText(`# 样例

## 钩子
> 旁白：说人话：先等着。

## 打碎常识
> 旁白：第一，只按一个，这句故意写得很长很长很长很长来超过四十个字的限制，后面再补一截让它肯定超过。

## 内幕
> 旁白：不仅更慢更贵。

## 真相
> 旁白：记住一件事就够了。所以——

## 评论站队
> 旁白：你站哪边 🙂
`, {filename: 'script.md'});
  const errors = new Set(result.errors.map(item => item.rule));
  assert.ok(errors.has('meta-plain-speech'));
  assert.ok(errors.has('oral-ordinal'));
  assert.ok(errors.has('scaffold-not-only'));
  assert.ok(errors.has('scaffold-remember'));
  assert.ok(errors.has('scaffold-so-dash'));
  assert.ok(errors.has('emoji'));
  assert.ok(result.warnings.some(item => item.rule === 'long-sentence'));
});

test('ep01 script and lines keep the historical scaffold', async () => {
  const script = await fs.readFile(path.join(ep01, 'script.md'), 'utf8');
  const rules = await loadRules();
  const spoken = extractSpokenLines(script, rules.speakers);
  const lines = JSON.parse(await fs.readFile(path.join(ep01, 'lines.json'), 'utf8'));
  assert.equal(lines.lines.length, spoken.length);
  for (let i = 0; i < spoken.length; i++) {
    assert.equal(lines.lines[i].text, spoken[i].text);
    assert.equal(lines.lines[i].speaker, spoken[i].speaker);
  }
  const linted = await lintFile(path.join(ep01, 'script.md'));
  const errors = new Set(linted.errors.map(item => item.rule));
  for (const rule of ['meta-plain-speech', 'scaffold-remember', 'scaffold-so-dash', 'oral-ordinal']) {
    assert.ok(errors.has(rule), [...errors].join(','));
  }
  assert.ok(linted.warnings.some(item => item.rule === 'method-in-vo'));
  assert.ok(linted.warnings.some(item => item.rule === 'five-beat-missing'));
  const cli = runCli(['lint-script', 'series/invisible-rules/ep01/script.md']);
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /meta-plain-speech/);
});

test('ep01 cannot render', async () => {
  const result = await evaluateGate(ep01, 'render');
  assert.equal(result.code, 'PHASE_A_REQUIRED');
  assert.equal(result.exitCode, 2);
  const cli = runCli(['gate', 'series/invisible-rules/ep01', 'render']);
  assert.equal(cli.status, 2);
  assert.match(cli.stdout, /^PHASE_A_REQUIRED/m);
});

test('fresh episode is incomplete and blocked', async () => {
  const series = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-fresh-'));
  const created = await initEpisode(series, 'ep01');
  const phase = await evaluateGate(created.episodeDir, 'phase-a');
  assert.equal(phase.code, 'PHASE_A_INCOMPLETE');
  assert.ok(phase.issues.some(issue => issue.id === 'storyboard_empty'));
  const render = await evaluateGate(created.episodeDir, 'render');
  assert.equal(render.code, 'PHASE_A_REQUIRED');
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

test('approved episode can render and a later edit expires approval', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-ok-'));
  const body = `# Phase

## 一件事

电梯只按一个方向。

## 画幅

横屏。

## 时长

80 秒。

## 五步心流

1. 钩子：门没开。
2. 打碎常识：先按并不先坐。
3. 内幕：它先送同方向。
4. 真相：多等的是自己。
5. 评论站队：你上下都按过吗？

## 分镜

| 时段 | 0–3s | 3–7s | 7–10s | 视觉装置 | 角色动作 | 口播要点 |
| --- | --- | --- | --- | --- | --- | --- |
| 0–10s | 门不开 | 甩出一个数 | 角色一愣 | 剖面、大数字、切镜、挡手 | 等等去按，阿规挡住 | 不是没看见你 |
`;
  const hash = phaseABodyHash(`---\nstatus: draft\n---\n${body}`);
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
  await fs.writeFile(path.join(dir, 'phase_a.md'), doc({
    status: 'approved', duration: 80, approvedDuration: 80, bodyText: body, bodyHash: hash,
  }));
  await fs.writeFile(path.join(dir, 'script.md'), `# demo

- **整集只讲一件事：** 电梯只按一个方向。

## 钩子
> 旁白：门没开。

## 打碎常识
> 旁白：先按并不先坐。

## 内幕
> 旁白：它先送同方向。

## 真相
> 旁白：多等的是自己。

## 评论站队
> 旁白：你上下都按过吗？
`);
  await fs.mkdir(path.join(dir, 'post'), {recursive: true});
  await fs.writeFile(path.join(dir, 'fact_card.md'), `# 事实卡

## A. 来源

本测试没有外部数字。

## B. 数字

本测试没有上屏数字。

## C. 不能说

不要说多按更快。
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
  const state = approvalState(await fs.readFile(path.join(dir, 'phase_a.md'), 'utf8'));
  assert.equal(state.code, 'PHASE_A_APPROVED', JSON.stringify(state.structure.issues));
  const render = await evaluateGate(dir, 'render');
  assert.equal(render.code, 'RENDER_ALLOWED', JSON.stringify(render.blockers));
  const publish = await evaluateGate(dir, 'publish');
  assert.notEqual(publish.code, 'PUBLISH_ALLOWED');

  await fs.writeFile(path.join(dir, 'phase_a.md'), doc({
    status: 'approved', duration: 70, approvedDuration: 80, bodyText: body, bodyHash: hash,
  }));
  const staleDuration = await evaluateGate(dir, 'render');
  assert.equal(staleDuration.code, 'PHASE_A_STALE');

  await fs.writeFile(path.join(dir, 'phase_a.md'), doc({
    status: 'approved', duration: 80, approvedDuration: 80, bodyText: `${body}\n多了一句。\n`, bodyHash: hash,
  }));
  const staleBody = await evaluateGate(dir, 'render');
  assert.equal(staleBody.code, 'PHASE_A_STALE');
});

test('engagement numbers need a source and cannot be estimates', async () => {
  const template = await fs.readFile(path.join(root, 'studio/templates/metrics.md'), 'utf8');
  assert.equal(inspectEngagement(template).ok, true);
  assert.equal(inspectEngagement(template.replace('- 完播率：', '- 完播率：40%')).ok, false);
  assert.equal(inspectEngagement(template.replace('- 完播率：', '- 完播率：大约很高')).ok, false);
  const sourced = template.replace('- 完播率：', '- 完播率：40%（来源：示例导出，不是真实成绩）');
  assert.equal(inspectEngagement(sourced).ok, true);
});

test('ep02 can start after ep01 and ep03 cannot skip blank metrics', async () => {
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-series-'));
  const series = path.join(dest, 'invisible-rules');
  const source = path.join(root, 'series/invisible-rules');
  await fs.cp(source, series, {
    recursive: true,
    filter: file => path.relative(source, file).split(path.sep)[0] !== 'ep02',
  });
  const created = await initEpisode(series, 'ep02');
  assert.equal(created.previous, 'PRIOR_METRICS_ABSENT_OK');
  await assert.rejects(() => initEpisode(series, 'ep03'), error => error.code === 'METRICS_REQUIRED');
  const phasePath = path.join(series, 'ep02/phase_a.md');
  const phase = await fs.readFile(phasePath, 'utf8');
  await fs.writeFile(phasePath, phase.replace('status: draft', 'status: draft\nmetrics_exception: true'));
  const metricsPath = path.join(series, 'ep02/post/metrics.md');
  const metrics = await fs.readFile(metricsPath, 'utf8');
  await fs.writeFile(metricsPath, `本集没有可回填的播放数据。留空。禁止估算。\n${metrics}`);
  await assert.rejects(() => initEpisode(series, 'ep03'), error => error.code === 'METRICS_REQUIRED');
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

## 一件事

只按一个方向。

## 画幅

两档。

## 时长

90 秒。

## 五步心流

钩子。打碎常识。内幕。真相。评论站队。

## 分镜

| 时段 | 0–3s | 3–7s | 7–10s | 视觉装置 | 角色动作 | 口播要点 |
| --- | --- | --- | --- | --- | --- | --- |
| 0–10s | 门不开 | 甩出一个数 | 角色一愣 | 剖面、大数字、切镜、挡手 | 等等去按，阿规挡住 | 不是没看见你 |
`;
  const result = validatePhaseA(markdown);
  assert.ok(result.issues.some(issue => issue.id === 'vertical_duration_cap'));
});

test('ep02 stills use kit components and subtitle only script lines', async () => {
  const kit = await fs.readFile(path.join(root, 'studio/render/kit/canvas/kit.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(kit, context);
  const known = new Set(context.SWKit.components);
  const episode = path.join(root, 'series/invisible-rules/ep02');
  const spec = JSON.parse(await fs.readFile(path.join(episode, 'render/stills.json'), 'utf8'));
  const {speakers} = await loadRules();
  const spoken = extractSpokenLines(await fs.readFile(path.join(episode, 'script.md'), 'utf8'), speakers);
  const walk = layers => layers.flatMap(layer => [layer.type, ...walk(layer.layers || [])]);
  for (const shot of spec.shots) {
    for (const type of walk([...(shot.layers || []), ...(shot.overlay || [])])) {
      assert.ok(known.has(type), `${shot.id}: unknown component ${type}`);
    }
    if (shot.subtitle) {
      const {speaker, text} = shot.subtitle;
      assert.ok(spoken.some(line => line.speaker === speaker && line.text.includes(text)), `${shot.id}: subtitle not in script.md`);
    }
    await fs.access(path.join(episode, spec.out_dir, `${shot.id}.png`));
  }
});

test('legacy CLI points at the studio', () => {
  const help = spawnSync(process.execPath, ['src/cli.js'], {cwd: root, encoding: 'utf8'});
  assert.equal(help.status, 0);
  assert.match(help.stdout, /studio\/cli\.mjs/);
});
