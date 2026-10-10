#!/usr/bin/env node
import path from 'node:path';
import {lintFile, formatLint} from './lint/lint_script.mjs';
import {formatQc, runQc} from './qc/run_qc.mjs';
import {evaluateGate, formatGate} from './gate.mjs';
import {initEpisode} from './init_episode.mjs';
import {phaseABodyHash} from './phase_a.mjs';
import {checkLayout} from './layout.mjs';
import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const json = args.includes('--json');
const positional = args.filter(arg => arg !== '--json');
const [cmd, ...rest] = positional;

function emit(payload, text) {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else console.log(text);
}

const help = `StoryWeaver studio

  node studio/cli.mjs lint-script <script.md|lines.json>
  node studio/cli.mjs qc <episode-dir>
  node studio/cli.mjs gate <episode-dir> <phase-a|lines|hook-sample|stills|render|publish>
  node studio/cli.mjs hash-phase-a <phase_a.md>
  node studio/cli.mjs init-episode <series-dir> <epNN>
  node studio/cli.mjs layout

lint-script 随时可跑。gate lines / render / publish 在 Phase A 批准前会拒绝。
本命令不调用配音、不渲染成片、不访问付费接口。
退出码：0 通过或等待审阅；1 结构或清单未完成；2 Phase A 未批准或已过期。`;

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
  if (cmd === 'gate') {
    const [dir, stage] = rest;
    if (!dir || !stage) throw new Error('gate needs <episode-dir> <stage>');
    const result = await evaluateGate(path.resolve(dir), stage);
    emit(result, formatGate(result));
    return result.exitCode;
  }
  if (cmd === 'hash-phase-a') {
    const file = rest[0];
    if (!file) throw new Error('hash-phase-a needs a file');
    const text = await fs.readFile(path.resolve(file), 'utf8');
    const hash = phaseABodyHash(text);
    emit({hash}, hash);
    return 0;
  }
  if (cmd === 'init-episode') {
    const [seriesDir, episodeId] = rest;
    if (!seriesDir || !episodeId) throw new Error('init-episode needs <series-dir> <epNN>');
    const created = await initEpisode(path.resolve(seriesDir), episodeId);
    emit(created, `${created.previous}\n${created.episodeDir}\nNext: fill fact_card.md and phase_a.md, then run gate <dir> phase-a. Do not set status: approved yourself.`);
    return 0;
  }
  if (cmd === 'layout') {
    const report = await checkLayout();
    emit(report, report.ok ? 'LAYOUT_OK' : `LAYOUT_MISSING\n${report.missing.join('\n')}`);
    return report.ok ? 0 : 1;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

main().then(code => {
  process.exitCode = code ?? 0;
}).catch(error => {
  const code = error.code || 'ERROR';
  if (json) console.log(JSON.stringify({code, message: error.message}, null, 2));
  else console.error(`${code}\n${error.message}`);
  process.exitCode = code === 'PHASE_A_REQUIRED' || code === 'PHASE_A_STALE' ? 2 : 1;
});
