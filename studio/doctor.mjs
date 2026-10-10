import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const KEYS = [
  'TTS_PROVIDER',
  'VOLC_TTS_API_KEY',
  'VOLC_TTS_APP_ID',
  'VOLC_TTS_ACCESS_TOKEN',
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'ELEVENLABS_API_KEY',
  'CHROME',
  'SW_FONT_400',
  'SW_FONT_500',
  'SW_FONT_700',
  'SW_FONT_900',
];

function which(bin) {
  const r = spawnSync('sh', ['-c', `command -v ${JSON.stringify(bin)}`], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.trim() : '';
}

function fontPresent(query) {
  const fc = which('fc-match');
  if (!fc) return {ok: false, detail: 'fc-match not installed'};
  const r = spawnSync(fc, ['-f', '%{file}', query], {encoding: 'utf8'});
  const file = (r.stdout || '').trim();
  return {ok: Boolean(file), detail: file ? path.basename(file) : 'not found'};
}

export async function runDoctor() {
  const checks = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({id: 'node', ok: nodeMajor >= 24, detail: `node ${process.versions.node}`});
  const ffmpeg = which('ffmpeg');
  checks.push({id: 'ffmpeg', ok: Boolean(ffmpeg), detail: ffmpeg || 'missing'});
  const python = which('python3');
  checks.push({id: 'python3', ok: Boolean(python), detail: python || 'missing'});
  const chrome = process.env.CHROME || which('google-chrome-stable') || which('chromium') || which('chromium-browser');
  checks.push({id: 'chrome', ok: Boolean(chrome), detail: chrome ? 'present' : 'missing (set CHROME or install Playwright Chromium)'});
  const cjk = fontPresent('Noto Sans CJK SC');
  checks.push({id: 'font-cjk', ok: cjk.ok || Boolean(process.env.SW_FONT_400), detail: cjk.detail});
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
  checks.push({id: 'playwright', ok: playwright, detail: playwright ? 'installed' : 'optional until you render HTML Canvas'});
  const required = checks.filter(c => ['node', 'ffmpeg', 'python3'].includes(c.id));
  return {
    ok: required.every(c => c.ok),
    host: os.hostname(),
    checks,
  };
}

export function formatDoctor(report) {
  const lines = [report.ok ? 'DOCTOR_OK' : 'DOCTOR_BLOCKED'];
  for (const check of report.checks) {
    lines.push(`${check.ok ? 'ok' : 'missing'}  ${check.id}  ${check.detail}`);
  }
  lines.push('Secret values are never printed. Only present / absent.');
  return lines.join('\n');
}

export async function writeEnvExample(dest) {
  const text = `# Copy to .env on the machine that runs TTS. Never commit secrets.
# Cloud agents without keys stop at a silent preview.

TTS_PROVIDER=doubao
# TTS_PROVIDER=azure
# TTS_PROVIDER=elevenlabs

# Doubao / Volcengine OpenSpeech (names vary by console)
VOLC_TTS_APP_ID=
VOLC_TTS_ACCESS_TOKEN=
VOLC_TTS_API_KEY=

# Azure Speech
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

# ElevenLabs
ELEVENLABS_API_KEY=

# Optional render overrides
# CHROME=/usr/bin/google-chrome-stable
# SW_FONT_400=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
# SW_FONT_500=
# SW_FONT_700=
# SW_FONT_900=
`;
  await fs.writeFile(dest, text);
}
