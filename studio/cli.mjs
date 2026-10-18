#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {lintFile, formatLint} from './lint/lint_script.mjs';
import {formatQc, runQc} from './qc/run_qc.mjs';
import {evaluateCheckpoint, formatCheckpoint} from './checkpoint.mjs';
import {initEpisode} from './init_episode.mjs';
import {initSeries} from './init_series.mjs';
import {briefBodyHash} from './brief.mjs';
import {checkEpisodeStyle, checkSeriesLock, formatSeriesLock, formatStyle, measureLock, validateLock, writeLock} from './style/style_lock.mjs';
import {checkLayout} from './layout.mjs';
import {formatDoctor, runDoctor} from './doctor.mjs';
import {verifyCapability} from './capabilities.mjs';
import {formatPace, paceEpisode} from './pace.mjs';
import {budgetStatus} from './budget.mjs';
import {createHandoff, formatHandoff} from './handoff.mjs';
import {formatResume, resumeEpisode} from './resume.mjs';
import {formatPrediction, predictEpisode} from './duration.mjs';
import {buildListenPack, formatListen} from './listen_pack.mjs';
import {formatGitSync, gitSyncStatus, markGitSync, planGitSync} from './git_sync.mjs';
import crypto from 'node:crypto';
import {renderDirectory} from './render/browser/pipeline.mjs';
import {isShotFixture} from './render/browser/validate_shot.mjs';
import {renderStills} from './render/kit/canvas/render_stills.mjs';
import {assertRenderReview} from './review.mjs';
import {preflightHeavyRender, stillsDigest} from './production.mjs';
import {deliver, formatDelivery} from './deliver/deliver.mjs';
import {checkCover} from './deliver/cover.mjs';
import {formatRenderStatus, renderStatus, startDetachedRender} from './jobs.mjs';
import {formatRenderContract, lintRenderContract} from './lint/render_contract.mjs';
import {formatMotionQc, runMotionQc} from './qc/motion_qc.mjs';
import {formatQuality, runQuality} from './quality.mjs';
import {ensureCollection} from './collection.mjs';
import {fileExists} from './qc/checks.mjs';
import {formatSeriesNext, formatSeriesStatus, seriesNext, seriesStatus} from './series/status.mjs';
import {formatSeriesAudit, seriesAudit} from './series/audit.mjs';
import {formatSeriesDeliver, seriesDeliver} from './series/deliver.mjs';
import {checkFactCheck, formatFactCheck} from './fact_check.mjs';
import {checkDirectorReview, formatDirectorReview} from './director_review.mjs';
import {checkDocs, formatSte100} from './lint/ste100.mjs';

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

const help = `knowledge-video-studio

  node studio/cli.mjs lint-script <script.md|lines.json>
  node studio/cli.mjs fact-check <episode-dir>       claim ledger + human sign-off (blocks TTS)
  node studio/cli.mjs director-review <episode-dir>  pre-export scorecard: every axis >= 8
  node studio/cli.mjs docs-lint                      check the English docs against the STE100 rules
  node studio/cli.mjs qc <episode-dir>
  node studio/cli.mjs quality <episode-dir>
  node studio/cli.mjs render-contract
  node studio/cli.mjs motion-qc <motion.json> [--out <dir>]
  node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
  node studio/cli.mjs hash-brief <brief.md>
  node studio/cli.mjs style <episode-dir>      check the episode against ../series-style.json
  node studio/cli.mjs init-series <dir> [--collection --episodes 10]
  node studio/cli.mjs init-episode <series-dir> <epNN>
  node studio/cli.mjs series plan <series-dir> [--episodes 10] [--force]
  node studio/cli.mjs series status <series-dir>
  node studio/cli.mjs series next <series-dir>
  node studio/cli.mjs series lock <series-dir> --from ep01 [--force]
  node studio/cli.mjs series lock <series-dir> --check
  node studio/cli.mjs series audit <series-dir>
  node studio/cli.mjs series deliver <series-dir>
  node studio/cli.mjs layout
  node studio/cli.mjs doctor [--episode <dir>] [--require-render]
  node studio/cli.mjs doctor --verify <capability>   run and record a capability sample (blender-3d)
  node studio/cli.mjs pace <episode-dir>
  node studio/cli.mjs handoff <episode-dir>
  node studio/cli.mjs resume <episode-dir>
  node studio/cli.mjs predict-duration <episode-dir>
  node studio/cli.mjs listen-pack <episode-dir>
  node studio/cli.mjs stills <episode-dir>          render review stills (needs approved brief)
  node studio/cli.mjs approval-hashes <episode-dir> [--voice <file>]   hashes a person puts in qc/approvals.json
  node studio/cli.mjs render <episode-dir|shot-fixture> --mode draft|release [--cut preview|hook|full] [--fps 30|60] [--motion-blur 1-8] [--review-only] [--foreground]
                    hook/full need stills (+ voice trial for full) approvals, CAPS.md, and the
                    episode render lock; they run detached and log to out/logs/
  node studio/cli.mjs render-status <episode-dir>
  node studio/cli.mjs cover-check <episode-dir>    cover glyph contrast at 320 px (iteration aid)
  node studio/cli.mjs deliver <episode-dir>        the only way to make a publish package:
                    publish encode ≤30 MB, real-Chrome playback + seeks, cover check,
                    manifest with bytes + sha256; refuses if any check fails
  node studio/cli.mjs git-sync <episode-dir> [--retry] [--mark]

lint-script can run at any time. A draft render does not need human picture
sign-off. A release does, and an agent cannot fill those fields. This CLI
does not call a paid TTS API and does not publish.

Exit codes: 0 pass or ready for review; 1 incomplete structure or checklist;
2 brief missing, stale, or doctor blocked a render; 3 quality machine gates
pass but human review is pending.`;

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
  if (cmd === 'quality') {
    const dir = positional[0];
    if (!dir) throw new Error('quality needs an episode directory');
    const report = await runQuality(path.resolve(dir));
    emit(report, formatQuality(report));
    return report.ok ? 0 : report.machineOk ? 3 : 1;
  }
  if (cmd === 'style') {
    const dir = positional[0];
    if (!dir) throw new Error('style needs an episode directory');
    const report = await checkEpisodeStyle(path.resolve(dir));
    emit(report, formatStyle(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'fact-check') {
    const dir = positional[0];
    if (!dir) throw new Error('fact-check needs an episode directory');
    const report = await checkFactCheck(path.resolve(dir));
    emit(report, formatFactCheck(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'docs-lint') {
    const report = await checkDocs();
    emit(report, formatSte100(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'director-review') {
    const dir = positional[0];
    if (!dir) throw new Error('director-review needs an episode directory');
    const report = await checkDirectorReview(path.resolve(dir));
    emit(report, formatDirectorReview(report));
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
    const created = await initSeries(path.resolve(dir), {
      collection: Boolean(opts.collection),
      episodes: opts.episodes ? Number(opts.episodes) : 10,
    });
    const collectionLine = created.collection ? `\nCollection: ${created.collection}` : '';
    const next = created.collection
      ? `Next: node studio/cli.mjs init-episode ${created.seriesDir} ep01\nAfter ep01 is rendered: node studio/cli.mjs series lock ${created.seriesDir} --from ep01`
      : `Next: node studio/cli.mjs init-episode ${created.seriesDir} ep01`;
    emit(created, `${created.seriesDir}${collectionLine}\n${next}`);
    return 0;
  }
  if (cmd === 'init-episode') {
    const [seriesDir, episodeId] = positional;
    if (!seriesDir || !episodeId) throw new Error('init-episode needs <series-dir> <epNN>');
    const created = await initEpisode(path.resolve(seriesDir), episodeId);
    emit(created, `${created.previous}\n${created.episodeDir}\nNext: fill fact_card.md and brief.md, then run checkpoint <dir> brief. Do not set status: approved yourself.`);
    return 0;
  }
  if (cmd === 'series') {
    const [sub, dir] = positional;
    if (!sub || !dir) throw new Error('series needs <plan|status|next|lock> <series-dir>');
    const seriesDir = path.resolve(dir);
    if (!(await fileExists(path.join(seriesDir, 'series.json')))) {
      throw Object.assign(new Error(`${seriesDir} is not a series workspace. Run init-series first.`), {code: 'BAD_SERIES'});
    }
    if (sub === 'plan') {
      const plan = await ensureCollection(seriesDir, {
        episodes: opts.episodes ? Number(opts.episodes) : 10,
        force: Boolean(opts.force),
      });
      emit(plan, `${plan.created ? 'COLLECTION_PLANNED' : 'COLLECTION_EXISTS'} ${plan.file}\nSlots: ${plan.collection.episodes.length}\nNext: node studio/cli.mjs series status ${seriesDir}`);
      return 0;
    }
    if (sub === 'status') {
      const report = await seriesStatus(seriesDir);
      emit(report, formatSeriesStatus(report));
      return 0;
    }
    if (sub === 'next') {
      const report = await seriesNext(seriesDir);
      emit(report, formatSeriesNext(report));
      return report.exitCode ?? 0;
    }
    if (sub === 'audit') {
      const report = await seriesAudit(seriesDir);
      emit(report, formatSeriesAudit(report));
      return report.ok ? 0 : 1;
    }
    if (sub === 'deliver') {
      const report = await seriesDeliver(seriesDir);
      emit(report, formatSeriesDeliver(report));
      return report.ok ? 0 : 1;
    }
    if (sub === 'lock') {
      if (opts.check) {
        const report = await checkSeriesLock(seriesDir);
        emit(report, formatSeriesLock(report));
        return report.ok ? 0 : 1;
      }
      const from = String(opts.from || '');
      if (!/^ep\d{2}$/.test(from)) throw new Error('series lock needs --from epNN, or --check');
      const episodeDir = path.join(seriesDir, from);
      if (!(await fileExists(episodeDir))) throw new Error(`Episode not found: ${episodeDir}`);
      const measured = await measureLock(episodeDir);
      const written = await writeLock(seriesDir, measured.lock, {force: Boolean(opts.force)});
      const issues = validateLock(measured.lock);
      const text = [
        `LOCK_DRAFT_WRITTEN ${written.file}`,
        ...measured.warnings.map(warning => `- ${warning}`),
        ...(issues.length ? ['Open before --check:', ...issues.map(issue => `  - ${issue}`)] : ['Lock is valid.']),
        `Next: node studio/cli.mjs series lock ${seriesDir} --check`,
      ].join('\n');
      emit({file: written.file, warnings: measured.warnings, issues}, text);
      return 0;
    }
    throw new Error(`Unknown series command: ${sub}`);
  }
  if (cmd === 'layout') {
    const report = await checkLayout();
    emit(report, report.ok ? 'LAYOUT_OK' : `LAYOUT_MISSING\n${report.missing.join('\n')}`);
    return report.ok ? 0 : 1;
  }
  if (cmd === 'doctor' && opts.verify) {
    const result = await verifyCapability(String(opts.verify), opts.engine ? {engine: String(opts.engine)} : undefined);
    emit(result, `${result.ok ? 'CAPABILITY_VERIFIED' : 'CAPABILITY_FAILED'} ${result.id}\n${result.detail}`);
    return result.ok ? 0 : 1;
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
    const episodeDir = path.resolve(dir);
    const heavy = (cut === 'full' || cut === 'hook') && !(await isShotFixture(episodeDir));
    if (heavy && !opts.foreground) {
      // Long renders run detached with progress in a log, so a tool timeout or a closed
      // terminal cannot orphan or duplicate them. Gates are checked here first to fail fast.
      await assertRenderReview(episodeDir, {review, cut});
      await preflightHeavyRender(episodeDir, cut);
      const job = await startDetachedRender(episodeDir, args);
      emit(job, `RENDER_STARTED ${cut} (pid ${job.pid}, detached)\nlog: ${job.log}\nstatus: node studio/cli.mjs render-status ${dir}`);
      return 0;
    }
    const result = await renderDirectory(episodeDir, {
      review,
      cut,
      reviewOnly: Boolean(opts['review-only']),
      noVideo: Boolean(opts['no-video']) || Boolean(opts['review-only']),
      frames: opts.frames ? String(opts.frames).split(',').map(Number) : undefined,
      fps: opts.fps ? Number(opts.fps) : undefined,
      motionBlur: opts['motion-blur'] ? Number(opts['motion-blur']) : undefined,
      rate: opts.rate ? Number(opts.rate) : undefined,
      until: opts.until ? Number(opts.until) : undefined,
    });
    emit({outDir: result.outDir, report: result.report || null}, `RENDER_${review.toUpperCase()}\n${result.outDir}`);
    return 0;
  }
  if (cmd === 'deliver') {
    const dir = positional[0];
    if (!dir) throw new Error('deliver needs an episode directory');
    const result = await deliver(path.resolve(dir), {log: msg => !json && console.error(msg)});
    emit(result.manifest, formatDelivery(result));
    return result.ok ? 0 : 1;
  }
  if (cmd === 'cover-check') {
    const dir = positional[0];
    if (!dir) throw new Error('cover-check needs an episode directory');
    const out = path.join(path.resolve(dir), 'out', 'cover-check');
    const result = await checkCover(path.resolve(dir), out);
    emit(result, `${result.ok ? 'COVER_OK' : 'COVER_UNREADABLE'} (iteration aid; only deliver makes a package)\n${result.detail}\n${result.thumb}`);
    return result.ok ? 0 : 1;
  }
  if (cmd === 'render-status') {
    const dir = positional[0];
    if (!dir) throw new Error('render-status needs an episode directory');
    const status = await renderStatus(path.resolve(dir));
    emit(status, formatRenderStatus(status));
    return status.running ? 3 : 0;
  }
  if (cmd === 'stills') {
    const dir = positional[0];
    if (!dir) throw new Error('stills needs an episode directory');
    const {written} = await renderStills(path.resolve(dir));
    const digest = await stillsDigest(path.resolve(dir));
    emit({written, sha256: digest}, `${written.join('\n')}\nstills sha256 (for a person's qc/approvals.json): ${digest}`);
    return 0;
  }
  if (cmd === 'approval-hashes') {
    const dir = positional[0];
    if (!dir) throw new Error('approval-hashes needs an episode directory');
    const out = {stills: await stillsDigest(path.resolve(dir))};
    if (opts.voice) out.voice_trial = {file: String(opts.voice), sha256: crypto.createHash('sha256').update(await fs.readFile(path.resolve(dir, String(opts.voice)))).digest('hex')};
    emit(out, JSON.stringify(out, null, 2));
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
