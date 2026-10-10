#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {lintFile, formatLint} from './lint/lint_script.mjs';
import {formatQc, runQc} from './qc/run_qc.mjs';
import {evaluateCheckpoint, formatCheckpoint} from './checkpoint.mjs';
import {initEpisode} from './init_episode.mjs';
import {initSeries} from './init_series.mjs';
import {briefBodyHash} from './brief.mjs';
import {checkLayout} from './layout.mjs';
import {formatDoctor, runDoctor} from './doctor.mjs';
import {formatPace, paceEpisode} from './pace.mjs';
import {budgetStatus} from './budget.mjs';
import {createHandoff, formatHandoff} from './handoff.mjs';
import {formatResume, resumeEpisode} from './resume.mjs';
import {formatPrediction, predictEpisode} from './duration.mjs';
import {buildListenPack, formatListen} from './listen_pack.mjs';
import {formatGitSync, gitSyncStatus, markGitSync, planGitSync} from './git_sync.mjs';
import {renderDirectory} from './render/browser/pipeline.mjs';
import {formatRenderContract, lintRenderContract} from './lint/render_contract.mjs';
import {formatMotionQc, runMotionQc} from './qc/motion_qc.mjs';

const args = process.argv.slice(2);

function takeFlags(argv) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      opts[key] = next;
      i++;
    } else opts[key] = true;
  }
  return {opts, rest};
}

const {opts, rest} = takeFlags(args);
const json = Boolean(opts.json);
const [cmd, ...positional] = rest;

function emit(payload, text) {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else console.log(text);
}

const help = `StoryWeaver

  node studio/cli.mjs lint-script <script.md|lines.json>
  node studio/cli.mjs qc <episode-dir>
  node studio/cli.mjs render-contract
  node studio/cli.mjs motion-qc <motion.json> [--out <dir>]
  node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
  node studio/cli.mjs hash-brief <brief.md>
  node studio/cli.mjs init-series <dir>
  node studio/cli.mjs init-episode <series-dir> <epNN>
  node studio/cli.mjs layout
  node studio/cli.mjs doctor [--episode <dir>] [--require-render]
  node studio/cli.mjs pace <episode-dir>
  node studio/cli.mjs handoff <episode-dir>
  node studio/cli.mjs resume <episode-dir>
  node studio/cli.mjs predict-duration <episode-dir>
  node studio/cli.mjs listen-pack <episode-dir>
  node studio/cli.mjs render <episode-dir|shot-fixture> --mode draft|release [--cut preview|hook|full] [--review-only]
  node studio/cli.mjs git-sync <episode-dir> [--retry] [--mark]

lint-script can run at any time. A draft render does not need human picture
sign-off. A release does, and an agent cannot fill those fields. This CLI
does not call a paid TTS API and does not publish.

Exit codes: 0 pass or ready for review; 1 incomplete structure or checklist;
2 brief missing, stale, or doctor blocked a render.`;

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(help);
    return 0;
  }
  if (cmd === 'lint-script') {
    const file = positional[0];
    if (!file) throw new Error('lint-script needs a file');
    const result = await lintFile(path.resolve(file));
    emit(result, formatLint(result));
    return result.ok ? 0 : 1;
  }
  if (cmd === 'render-contract') {
    const report = await lintRenderContract();
    emit(report, formatRenderContract(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'motion-qc') {
    const file = positional[0];
    if (!file) throw new Error('motion-qc needs a motion spec JSON file');
    const report = await runMotionQc(path.resolve(file), opts.out ? path.resolve(opts.out) : undefined);
    emit(report, formatMotionQc(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'qc') {
    const dir = positional[0];
    if (!dir) throw new Error('qc needs an episode directory');
    const report = await runQc(path.resolve(dir));
    emit(report, formatQc(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'checkpoint' || cmd === 'gate') {
    const [dir, stage] = positional;
    if (!dir || !stage) throw new Error('checkpoint needs <episode-dir> <stage>');
    const mapped = stage === 'phase-a' ? 'brief' : stage;
    const result = await evaluateCheckpoint(path.resolve(dir), mapped);
    const budget = await budgetStatus(path.resolve(dir));
    const stopped = budget.stop && result.exitCode === 0;
    const payload = stopped ? {...result, code: 'MODEL_BUDGET_STOP', exitCode: 1, budget} : {...result, budget};
    const text = `${formatCheckpoint(payload)}\n${budget.guidance}`;
    emit(payload, text);
    return payload.exitCode;
  }
  if (cmd === 'hash-brief' || cmd === 'hash-phase-a') {
    const file = positional[0];
    if (!file) throw new Error('hash-brief needs a file');
    const text = await fs.readFile(path.resolve(file), 'utf8');
    const hash = briefBodyHash(text);
    emit({hash}, hash);
    return 0;
  }
  if (cmd === 'init-series') {
    const dir = positional[0];
    if (!dir) throw new Error('init-series needs a directory outside this repository');
    const created = await initSeries(path.resolve(dir));
    emit(created, `${created.seriesDir}\nNext: node studio/cli.mjs init-episode ${created.seriesDir} ep01`);
    return 0;
  }
  if (cmd === 'init-episode') {
    const [seriesDir, episodeId] = positional;
    if (!seriesDir || !episodeId) throw new Error('init-episode needs <series-dir> <epNN>');
    const created = await initEpisode(path.resolve(seriesDir), episodeId);
    emit(created, `${created.previous}\n${created.episodeDir}\nNext: fill fact_card.md and brief.md, then run checkpoint <dir> brief. Do not set status: approved yourself.`);
    return 0;
  }
  if (cmd === 'layout') {
    const report = await checkLayout();
    emit(report, report.ok ? 'LAYOUT_OK' : `LAYOUT_MISSING\n${report.missing.join('\n')}`);
    return report.ok ? 0 : 1;
  }
  if (cmd === 'doctor') {
    const report = await runDoctor({
      episodeDir: opts.episode ? path.resolve(opts.episode) : undefined,
      forRender: Boolean(opts['require-render']),
    });
    emit(report, formatDoctor(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'pace') {
    const dir = positional[0];
    if (!dir) throw new Error('pace needs an episode directory');
    const result = await paceEpisode(path.resolve(dir));
    emit(result, formatPace(result));
    return result.ok || result.source === 'none' ? 0 : 1;
  }
  if (cmd === 'handoff') {
    const dir = positional[0];
    if (!dir) throw new Error('handoff needs an episode directory');
    const result = await createHandoff(path.resolve(dir));
    emit(result.doc, formatHandoff(result));
    return 0;
  }
  if (cmd === 'resume') {
    const dir = positional[0];
    if (!dir) throw new Error('resume needs an episode directory');
    const result = await resumeEpisode(path.resolve(dir));
    emit(result, formatResume(result));
    return result.code === 'MODEL_BUDGET_STOP' ? 1 : 0;
  }
  if (cmd === 'predict-duration') {
    const dir = positional[0];
    if (!dir) throw new Error('predict-duration needs an episode directory');
    const result = await predictEpisode(path.resolve(dir));
    emit(result, formatPrediction(result));
    return result.over ? 1 : 0;
  }
  if (cmd === 'listen-pack') {
    const dir = positional[0];
    if (!dir) throw new Error('listen-pack needs an episode directory');
    const result = await buildListenPack(path.resolve(dir));
    emit({lines: result.fit.lines.map(line => line.id), checklist: result.checklistPath, audio: result.audioFile}, formatListen(result));
    return 0;
  }
  if (cmd === 'git-sync') {
    const dir = positional[0];
    if (!dir) throw new Error('git-sync needs an episode directory');
    const episodeDir = path.resolve(dir);
    if (opts.mark) {
      const result = await markGitSync(episodeDir);
      emit(result.plan, formatGitSync(result, {done: true}));
      return 0;
    }
    const status = await gitSyncStatus(episodeDir);
    if (status.done && !opts.retry) {
      const plan = JSON.parse(await fs.readFile(status.planFile, 'utf8'));
      emit(plan, formatGitSync({plan}, {done: true}));
      return 0;
    }
    const result = await planGitSync(episodeDir, {retry: Boolean(opts.retry)});
    emit(result.plan, formatGitSync(result, {retry: Boolean(opts.retry)}));
    return 0;
  }
  if (cmd === 'render') {
    const dir = positional[0];
    if (!dir) throw new Error('render needs an episode directory');
    const review = opts.mode || 'draft';
    const cut = opts.cut || (review === 'release' ? 'full' : 'preview');
    const result = await renderDirectory(path.resolve(dir), {
      review,
      cut,
      reviewOnly: Boolean(opts['review-only']),
      noVideo: Boolean(opts['no-video']) || Boolean(opts['review-only']),
      frames: opts.frames ? String(opts.frames).split(',').map(Number) : undefined,
      rate: opts.rate ? Number(opts.rate) : undefined,
      until: opts.until ? Number(opts.until) : undefined,
    });
    emit({outDir: result.outDir, report: result.report || null}, `RENDER_${review.toUpperCase()}\n${result.outDir}`);
    return 0;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

main().then(code => {
  process.exitCode = code ?? 0;
}).catch(error => {
  const code = error.code || 'ERROR';
  if (json) console.log(JSON.stringify({code, message: error.message}, null, 2));
  else console.error(`${code}\n${error.message}`);
  process.exitCode = code === 'BRIEF_REQUIRED' || code === 'BRIEF_STALE' ? 2 : 1;
});
