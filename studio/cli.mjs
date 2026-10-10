#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {lintFile, formatLint} from './lint/lint_script.mjs';
import {formatQc, runQc} from './qc/run_qc.mjs';
import {evaluateCheckpoint, formatCheckpoint} from './checkpoint.mjs';
import {initEpisode} from './init_episode.mjs';
import {briefBodyHash} from './brief.mjs';
import {checkLayout} from './layout.mjs';
import {formatDoctor, runDoctor} from './doctor.mjs';
import {formatPace, paceEpisode} from './pace.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const positional = args.filter(arg => arg !== '--json');
const [cmd, ...rest] = positional;

function emit(payload, text) {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else console.log(text);
}

const help = `StoryWeaver

  node studio/cli.mjs lint-script <script.md|lines.json>
  node studio/cli.mjs qc <episode-dir>
  node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
  node studio/cli.mjs hash-brief <brief.md>
  node studio/cli.mjs init-episode <series-dir> <epNN>
  node studio/cli.mjs layout
  node studio/cli.mjs doctor
  node studio/cli.mjs pace <episode-dir>

lint-script can run at any time. checkpoint lines / render / publish refuse work
until a person has approved the creative brief. This CLI does not call a paid
TTS API and does not publish.

Exit codes: 0 pass or ready for review; 1 incomplete structure or checklist;
2 brief missing or stale.`;

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(help);
    return 0;
  }
  if (cmd === 'lint-script') {
    const file = rest[0];
    if (!file) throw new Error('lint-script needs a file');
    const result = await lintFile(path.resolve(file));
    emit(result, formatLint(result));
    return result.ok ? 0 : 1;
  }
  if (cmd === 'qc') {
    const dir = rest[0];
    if (!dir) throw new Error('qc needs an episode directory');
    const report = await runQc(path.resolve(dir));
    emit(report, formatQc(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'checkpoint' || cmd === 'gate') {
    const [dir, stage] = rest;
    if (!dir || !stage) throw new Error('checkpoint needs <episode-dir> <stage>');
    const mapped = stage === 'phase-a' ? 'brief' : stage;
    const result = await evaluateCheckpoint(path.resolve(dir), mapped);
    emit(result, formatCheckpoint(result));
    return result.exitCode;
  }
  if (cmd === 'hash-brief' || cmd === 'hash-phase-a') {
    const file = rest[0];
    if (!file) throw new Error('hash-brief needs a file');
    const text = await fs.readFile(path.resolve(file), 'utf8');
    const hash = briefBodyHash(text);
    emit({hash}, hash);
    return 0;
  }
  if (cmd === 'init-episode') {
    const [seriesDir, episodeId] = rest;
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
    const report = await runDoctor();
    emit(report, formatDoctor(report));
    return report.ok ? 0 : 1;
  }
  if (cmd === 'pace') {
    const dir = rest[0];
    if (!dir) throw new Error('pace needs an episode directory');
    const result = await paceEpisode(path.resolve(dir));
    emit(result, formatPace(result));
    return result.ok || result.source === 'none' ? 0 : 1;
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
