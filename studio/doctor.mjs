import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {episodeGlyphCheck} from './render/kit/canvas/runtime.mjs';
import {FETCH_HINT, libraryDir, loadLibrary} from './render/kit/fonts/library.mjs';
import {parseLoudnormJson} from './render/browser/loudnorm.mjs';
import {validateEpisodeScenes} from './render/browser/validate_scene.mjs';
import {CAPABILITIES, capabilityStatus, episodeCapabilityIssues} from './capabilities.mjs';
import {episodeFilesInShotDir, isShotFixture, readShotFile, validateShotFixture} from './render/browser/validate_shot.mjs';

const KEYS = [
  'TTS_PROVIDER',
  'VOLC_TTS_API_KEY',
  'VOLC_TTS_APP_ID',
  'VOLC_TTS_ACCESS_TOKEN',
  'CHROME',
  'SW_FONT_400',
  'SW_FONT_500',
  'SW_FONT_700',
  'SW_FONT_900',
  'SW_FONT_LIBRARY',
];

const WEIGHTS = {400: 'Regular', 500: 'Medium', 900: 'Black'};

function which(bin) {
  const r = spawnSync('sh', ['-c', `command -v ${JSON.stringify(bin)}`], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.trim() : '';
}

function fontWeightCheck(weight) {
  const override = process.env[`SW_FONT_${weight}`];
  if (override) return {ok: true, detail: `override ${path.basename(override)}`};
  const fc = which('fc-match');
  if (!fc) return {ok: false, detail: 'fc-match not installed'};
  const style = WEIGHTS[weight];
  const r = spawnSync(fc, ['-f', '%{family}\n%{style}\n%{file}', `Noto Sans CJK SC:style=${style}`], {encoding: 'utf8'});
  const [family = '', got = '', file = ''] = (r.stdout || '').trim().split('\n');
  const ok = family.includes('Noto Sans CJK') && got.includes(style) && Boolean(file);
  return {ok, detail: ok ? `${style} ${path.basename(file)}` : `missing ${style}${got ? ` (got ${got})` : ''}`};
}

async function chromiumCheck() {
  if (process.env.CHROME) return {ok: true, detail: 'CHROME set'};
  try {
    const pw = await import('playwright');
    const exe = pw.chromium.executablePath();
    await fs.access(exe);
    return {ok: true, detail: 'playwright chromium'};
  } catch {
    const bin = which('google-chrome-stable') || which('chromium') || which('chromium-browser');
    return {ok: Boolean(bin), detail: bin ? 'system browser' : 'missing (npx playwright install chromium, or set CHROME)'};
  }
}

function loudnormSelfTest() {
  const ffmpeg = which('ffmpeg');
  if (!ffmpeg) return {ok: false, detail: 'ffmpeg missing'};
  const r = spawnSync(ffmpeg, [
    '-hide_banner', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.35',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
    '-f', 'null', '-',
  ], {encoding: 'utf8'});
  try {
    const parsed = parseLoudnormJson(`${r.stdout || ''}\n${r.stderr || ''}`);
    if (parsed.input_i == null) return {ok: false, detail: 'loudnorm JSON missing input_i'};
    return {ok: true, detail: 'parsed'};
  } catch (error) {
    return {ok: false, detail: error.message};
  }
}

export async function runDoctor({episodeDir, forRender = false} = {}) {
  const checks = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({id: 'node', ok: nodeMajor >= 24, detail: `node ${process.versions.node}`});
  const ffmpeg = which('ffmpeg');
  checks.push({id: 'ffmpeg', ok: Boolean(ffmpeg), detail: ffmpeg ? 'present' : 'missing'});
  const ffprobe = which('ffprobe');
  checks.push({id: 'ffprobe', ok: Boolean(ffprobe), detail: ffprobe ? 'present' : 'missing'});
  const python = which('python3');
  checks.push({id: 'python3', ok: Boolean(python), detail: python ? 'present' : 'missing'});
  const chrome = await chromiumCheck();
  checks.push({id: 'chromium', ok: chrome.ok, detail: chrome.detail});
  for (const weight of [400, 500, 900]) {
    const font = fontWeightCheck(weight);
    checks.push({id: `font-weight-${weight}`, ok: font.ok, detail: font.detail});
  }
  const brotli = python ? spawnSync(python, ['-c', 'import brotli, fontTools'], {encoding: 'utf8'}).status === 0 : false;
  checks.push({id: 'woff2-tools', ok: brotli, detail: brotli ? 'fontTools + brotli' : 'missing (apt install python3-fonttools python3-brotli)'});
  const lib = await loadLibrary(libraryDir());
  checks.push({id: 'font-library', ok: true, detail: lib ? `optional: ${lib.fonts.size} fonts at ${lib.dir}` : `optional, not fetched (only needed when a brief sets font_body/font_display): ${FETCH_HINT}`});
  const loud = loudnormSelfTest();
  checks.push({id: 'loudnorm-self-test', ok: loud.ok, detail: loud.detail});
  for (const key of KEYS) {
    checks.push({id: `env:${key}`, ok: true, detail: process.env[key] ? 'set' : 'unset'});
  }
  let playwright = false;
  try {
    await import('playwright');
    playwright = true;
  } catch {
    playwright = false;
  }
  checks.push({id: 'playwright', ok: playwright, detail: playwright ? 'installed' : 'missing'});
  const realChrome = which('google-chrome') || which('google-chrome-stable');
  checks.push({id: 'google-chrome', ok: Boolean(realChrome), detail: realChrome ? 'present (deliver plays the publish file in real Chrome)' : 'missing: deliver cannot run its playback check (npx playwright install chrome)'});
  for (const id of Object.keys(CAPABILITIES)) {
    const status = await capabilityStatus(id);
    checks.push({id: `capability:${id}`, ok: true, optional: true, ready: status.ok, detail: `${status.ok ? 'ready' : 'not ready'}: ${status.detail}`});
  }
  if (episodeDir) {
    const capIssues = await episodeCapabilityIssues(episodeDir);
    checks.push({id: 'episode-capabilities', ok: capIssues.length === 0, detail: capIssues.length ? capIssues.map(i => i.detail).join('; ') : 'every promised capability is declared and verified'});
    const scenes = await validateEpisodeScenes(episodeDir);
    checks.push({
      id: 'scene-rig',
      ok: scenes.ok,
      detail: scenes.skipped ? 'no scene file' : (scenes.ok ? 'expressions and gestures match the rig' : scenes.issues.slice(0, 6).join('; ')),
    });
    const glyphs = await episodeGlyphCheck(episodeDir);
    checks.push({id: 'glyph-coverage', ok: glyphs.ok, detail: glyphs.detail});
    if (await isShotFixture(episodeDir)) {
      const found = await episodeFilesInShotDir(episodeDir);
      const shot = await validateShotFixture(await readShotFile(episodeDir));
      const ok = shot.ok && found.length === 0;
      const detail = found.length
        ? `episode files in a shot fixture: ${found.join(', ')}`
        : (shot.ok ? '8–12s kinetic shot, three unused' : shot.issues.slice(0, 4).join('; '));
      checks.push({id: 'shot-fixture', ok, detail});
    }
  }
  const baseIds = ['node', 'ffmpeg', 'python3'];
  const renderIds = [
    ...baseIds,
    'ffprobe',
    'chromium',
    'font-weight-400',
    'font-weight-500',
    'font-weight-900',
    'woff2-tools',
    'loudnorm-self-test',
    'playwright',
  ];
  if (episodeDir) renderIds.push('scene-rig', 'glyph-coverage', 'episode-capabilities');
  if (checks.some(check => check.id === 'shot-fixture')) renderIds.push('shot-fixture');
  const ok = baseIds.every(id => checks.find(check => check.id === id)?.ok);
  const renderOk = renderIds.every(id => checks.find(check => check.id === id)?.ok);
  return {
    ok: forRender ? renderOk : ok,
    render_ok: renderOk,
    host: os.hostname(),
    checks,
  };
}

export function formatDoctor(report) {
  const lines = [report.ok ? 'DOCTOR_OK' : 'DOCTOR_BLOCKED', report.render_ok ? 'RENDER_READY' : 'RENDER_BLOCKED'];
  for (const check of report.checks) {
    lines.push(`${check.ok ? 'ok' : 'missing'}  ${check.id}  ${check.detail}`);
  }
  lines.push('Secret values are never printed. Only present or absent.');
  return lines.join('\n');
}

export async function writeEnvExample(dest) {
  const text = `# Copy to .env on the machine that runs TTS. Never commit secrets.
# Cloud agents without keys stop at a silent preview.

TTS_PROVIDER=doubao
# TTS_PROVIDER=dry-run

# Doubao / Volcengine speech synthesis
VOLC_TTS_APP_ID=
VOLC_TTS_ACCESS_TOKEN=
VOLC_TTS_API_KEY=

# Optional render overrides
# CHROME=/usr/bin/google-chrome-stable
# SW_FONT_400=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
# SW_FONT_500=
# SW_FONT_700=
# SW_FONT_900=
# Optional font library (fonts picked per episode with font_body / font_display in brief.md)
# SW_FONT_LIBRARY=~/.cache/storyweaver/fonts/qiaomu-cover-fonts
`;
  await fs.writeFile(dest, text);
}
