// Production capabilities an episode may promise (e.g. a 3D shot). A brief or acceptance standard
// may only promise what this machine has proved it can do: installed AND a recorded passing sample.
// `studio doctor --verify <id>` runs the sample and records the result; the brief checkpoint and
// the doctor read that record. A promise without a passing record fails the brief stage early.
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFrontMatter} from './brief.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export function capabilityDir() {
  return process.env.SW_CAPABILITY_DIR || path.join(os.homedir(), '.cache', 'storyweaver', 'capabilities');
}

function which(bin) {
  const r = spawnSync('sh', ['-c', `command -v ${JSON.stringify(bin)}`], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.trim() : '';
}

export function blenderBinary() {
  return process.env.BLENDER || which('blender');
}

export function blenderVersion(bin = blenderBinary()) {
  if (!bin) return '';
  const r = spawnSync(bin, ['-b', '--factory-startup', '--version'], {encoding: 'utf8', timeout: 60000});
  const m = /Blender (\d+\.\d+\.\d+(?: LTS)?)/.exec(r.stdout || '');
  return r.status === 0 && m ? m[1] : '';
}

async function readRecord(id) {
  try {
    return JSON.parse(await fs.readFile(path.join(capabilityDir(), `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}

async function verifyBlender({engine = 'CYCLES', seconds = 5, fps = 24} = {}) {
  const bin = blenderBinary();
  const version = blenderVersion(bin);
  if (!version) return {ok: false, detail: bin ? `${bin} does not run headless` : 'blender not installed (official LTS build, set BLENDER or put it on PATH)'};
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-blender-'));
  try {
    const t0 = Date.now();
    const r = spawnSync(bin, ['-b', '--factory-startup', '--python', path.join(here, 'capabilities', 'blender_ring_sample.py'), '--', tmp, engine, String(fps), String(seconds)],
      {encoding: 'utf8', timeout: 30 * 60 * 1000, maxBuffer: 64 * 1024 * 1024});
    const renderTime = (Date.now() - t0) / 1000;
    const frames = (await fs.readdir(tmp)).filter(f => /^f_\d+\.png$/.test(f)).length;
    const want = Math.round(seconds * fps);
    if (r.status !== 0 || !/SW_SAMPLE_DONE/.test(r.stdout) || frames !== want) {
      return {ok: false, version, detail: `sample render failed (exit ${r.status}, ${frames}/${want} frames)`};
    }
    const mp4 = path.join(tmp, 'sample.mp4');
    const enc = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f_%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4], {encoding: 'utf8'});
    if (enc.status !== 0) return {ok: false, version, detail: `sample encode failed: ${enc.stderr.trim()}`};
    const first = await fs.readFile(path.join(tmp, 'f_0001.png'));
    const last = await fs.readFile(path.join(tmp, `f_${String(want).padStart(4, '0')}.png`));
    if (first.equals(last)) return {ok: false, version, detail: 'sample frames do not move'};
    const sample = await fs.readFile(mp4);
    return {
      ok: true, version, binary: bin, engine, fps, seconds, frames, resolution: '640x360', samples: 8,
      render_time_s: +renderTime.toFixed(1),
      sample_sha256: crypto.createHash('sha256').update(sample).digest('hex'),
      detail: `Blender ${version} ${engine}: ${seconds}s ring sample (${frames} frames, 640x360, 8 samples) in ${renderTime.toFixed(1)}s`,
    };
  } finally {
    await fs.rm(tmp, {recursive: true, force: true});
  }
}

export const CAPABILITIES = {
  'blender-3d': {
    title: '3D shots rendered in Blender',
    // Words in a brief or acceptance standard that promise this capability.
    promise: /(?<![A-Za-z0-9])3D(?![A-Za-z])|三维|Blender/i,
    verify: verifyBlender,
    // Installed state must still match the recorded sample (same binary version).
    current: async record => {
      const version = blenderVersion();
      if (!version) return {ok: false, detail: 'blender not installed'};
      if (!record?.ok) return {ok: false, detail: `Blender ${version} installed, no passing sample (run: studio doctor --verify blender-3d)`};
      if (record.version !== version) return {ok: false, detail: `sample was recorded on Blender ${record.version}, installed ${version}; re-run --verify`};
      return {ok: true, detail: `${record.detail}; verified ${record.verified_at}`};
    },
  },
};

export async function verifyCapability(id, opts) {
  const cap = CAPABILITIES[id];
  if (!cap) throw Object.assign(new Error(`unknown capability ${id}; known: ${Object.keys(CAPABILITIES).join(', ')}`), {code: 'BAD_CAPABILITY'});
  const result = {id, ...(await cap.verify(opts)), verified_at: new Date().toISOString(), host: os.hostname()};
  await fs.mkdir(capabilityDir(), {recursive: true});
  await fs.writeFile(path.join(capabilityDir(), `${id}.json`), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export async function capabilityStatus(id) {
  const cap = CAPABILITIES[id];
  if (!cap) return {id, ok: false, detail: `unknown capability (known: ${Object.keys(CAPABILITIES).join(', ')})`};
  return {id, ...(await cap.current(await readRecord(id)))};
}

export function parseRequires(value) {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean);
  return String(value ?? '').replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
}

// Declared (`requires:` in brief front matter) and implied (promised in brief.md / acceptance.md
// prose) capabilities. Every implied one must be declared, and every declared one must be ready.
export async function episodeCapabilityIssues(episodeDir) {
  const issues = [];
  const texts = {};
  for (const name of ['brief.md', 'acceptance.md']) {
    try { texts[name] = await fs.readFile(path.join(episodeDir, name), 'utf8'); } catch { /* optional */ }
  }
  const declared = parseRequires(parseFrontMatter(texts['brief.md'] || '').data.requires);
  for (const [id, cap] of Object.entries(CAPABILITIES)) {
    for (const [name, text] of Object.entries(texts)) {
      const body = name === 'brief.md' ? parseFrontMatter(text).body : text;
      if (cap.promise.test(body) && !declared.includes(id)) {
        issues.push({id: 'capability_undeclared', detail: `${name} promises ${cap.title} but brief front matter has no "requires: ${id}"`});
      }
    }
  }
  for (const id of declared) {
    const status = await capabilityStatus(id);
    if (!status.ok) issues.push({id: 'capability_missing', detail: `${id}: ${status.detail}`});
  }
  return issues;
}
