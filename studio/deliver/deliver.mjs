// `studio deliver <episode>`: the only way to produce a publish package.
//
// Input is the human-signed release render (out/release/full/render_report.json, its sha256
// re-checked). Output is <episode>/deliver/<stamp>/ with the publish mp4, cover, 320 px cover
// thumbnail, sidecar .srt, manifest.json (bytes + sha256 of every file, every check result) and
// SHA256SUMS. The folder exists only if every check passed on the produced files:
//   encode    profile, size ≤ 30 MB, faststart, no extra tracks, full decode clean
//   playback  real Google Chrome, 1x end to end, then nine seeks
//   cover     glyph-pixel contrast at 320 px (deliver/cover.mjs)
// Any failure → deliver/rejected-<stamp>/report.json and no media to hand out.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {releaseSignoffError} from '../review.mjs';
import {checkCover} from './cover.mjs';
import {encodePublish, MAX_BYTES, verifyPublish} from './encode.mjs';
import {playInChrome} from './playback.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCHEMA = 'storyweaver.delivery.v1';

const sha256File = async f => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
const fail = (code, message) => Object.assign(new Error(message), {code});

export async function releaseSource(episodeDir) {
  const reportFile = path.join(episodeDir, 'out', 'release', 'full', 'render_report.json');
  let report;
  try {
    report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
  } catch {
    throw fail('DELIVER_NO_RELEASE', `no release render (${path.relative(episodeDir, reportFile)}). Drafts are never delivered: get the person's release sign-off, then render --mode release.`);
  }
  if (report.review?.mode && report.review.mode !== 'release') throw fail('DELIVER_NO_RELEASE', `render report is ${report.review.mode}, not release`);
  const resolve = f => (f ? (path.isAbsolute(f) ? f : path.resolve(repo, f)) : '');
  const file = resolve(report.output?.file);
  const srt = resolve(report.subtitles?.sidecar);
  let digest = '';
  try { digest = await sha256File(file); } catch { throw fail('DELIVER_SOURCE_MISSING', `release file missing: ${file}`); }
  if (digest !== report.output.sha256) throw fail('DELIVER_SOURCE_CHANGED', `release file sha256 ${digest.slice(0, 12)}… does not match its render report`);
  let release = null;
  try { release = JSON.parse(await fs.readFile(path.join(episodeDir, 'qc', 'release.json'), 'utf8')); } catch { /* checked below */ }
  const signoff = releaseSignoffError(release);
  if (signoff) throw fail('RELEASE_SIGNOFF', signoff);
  return {file, srt, sha256: digest, signed_by: release.signed_by, signed_at: release.signed_at};
}

export async function deliver(episodeDir, {play = playInChrome, log = () => {}} = {}) {
  episodeDir = path.resolve(episodeDir);
  const source = await releaseSource(episodeDir);
  const series = path.basename(path.dirname(episodeDir));
  const ep = path.basename(episodeDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const root = path.join(episodeDir, 'deliver');
  const staging = path.join(root, `.staging-${stamp}`);
  await fs.mkdir(staging, {recursive: true});
  const mp4 = path.join(staging, `${series}_${ep}_publish.mp4`);
  const checks = {};

  log('encode: publish profile');
  const enc = await encodePublish(source.file, mp4);
  checks.encode = {...(await verifyPublish(mp4, {sourceDuration: enc.duration_s})), video_kbps_target: enc.video_kbps, max_bytes: MAX_BYTES};
  log(`encode: ${checks.encode.ok ? 'ok' : checks.encode.errors.join('; ')}`);

  log('playback: real Chrome, 1x end to end + seeks');
  try {
    const r = await play(mp4);
    checks.playback = {ok: r.ok, errors: r.errors, duration_s: r.duration, seeks: r.seeks, player: 'google-chrome (playwright channel chrome)'};
  } catch (e) {
    checks.playback = {ok: false, errors: [`player failed to run: ${e.message.split('\n')[0]}`]};
  }
  log(`playback: ${checks.playback.ok ? 'ok' : checks.playback.errors.join('; ')}`);

  log('cover: glyph contrast at 320 px');
  try {
    const c = await checkCover(episodeDir, staging);
    checks.cover = {ok: c.ok, thumb_width: c.thumb_width, layers: c.layers, detail: c.detail};
  } catch (e) {
    checks.cover = {ok: false, detail: e.message};
  }
  log(`cover: ${checks.cover.ok ? 'ok' : checks.cover.detail}`);

  if (source.srt) {
    try { await fs.copyFile(source.srt, path.join(staging, `${series}_${ep}.srt`)); checks.subtitles = {ok: true}; } catch { checks.subtitles = {ok: false, detail: `sidecar missing: ${source.srt}`}; }
  } else checks.subtitles = {ok: false, detail: 'render report names no sidecar .srt'};

  const ok = Object.values(checks).every(c => c.ok);
  const names = (await fs.readdir(staging)).filter(n => !n.startsWith('.')).sort();
  const files = [];
  for (const name of names) {
    const f = path.join(staging, name);
    files.push({name, bytes: (await fs.stat(f)).size, sha256: await sha256File(f)});
  }
  const manifest = {
    schema: SCHEMA, status: ok ? 'deliverable' : 'rejected', series, episode: ep, created_at: new Date().toISOString(),
    source: {file: path.relative(episodeDir, source.file), sha256: source.sha256, signed_by: source.signed_by, signed_at: source.signed_at},
    files, checks,
    transfer: 'After any download or copy, compare the byte size and sha256 with this manifest before opening the file.',
  };
  if (!ok) {
    const dest = path.join(root, `rejected-${stamp}`);
    for (const name of names) if (/\.(mp4|png|srt)$/.test(name) && !name.startsWith('cover_')) await fs.rm(path.join(staging, name), {force: true});
    await fs.writeFile(path.join(staging, 'report.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await fs.rename(staging, dest);
    return {ok: false, dir: dest, manifest};
  }
  await fs.writeFile(path.join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(staging, 'SHA256SUMS'), files.map(f => `${f.sha256}  ${f.name}\n`).join(''));
  const dest = path.join(root, stamp);
  await fs.rename(staging, dest);
  await fs.writeFile(path.join(root, 'LATEST'), `${stamp}\n`);
  return {ok: true, dir: dest, manifest};
}

// Publish gate: the latest package exists, says deliverable, and its files still hash the same.
export async function latestDelivery(episodeDir) {
  const root = path.join(episodeDir, 'deliver');
  let stamp = '';
  try { stamp = (await fs.readFile(path.join(root, 'LATEST'), 'utf8')).trim(); } catch { return {ok: false, detail: 'no delivery package: run studio deliver <episode>'}; }
  const dir = path.join(root, stamp);
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')); } catch { return {ok: false, detail: `deliver/${stamp}/manifest.json missing`}; }
  if (manifest.schema !== SCHEMA || manifest.status !== 'deliverable') return {ok: false, detail: `deliver/${stamp} is not deliverable`};
  for (const f of manifest.files) {
    try {
      if ((await sha256File(path.join(dir, f.name))) !== f.sha256) return {ok: false, detail: `${f.name} changed after delivery`};
    } catch {
      return {ok: false, detail: `${f.name} missing from deliver/${stamp}`};
    }
  }
  return {ok: true, dir, manifest, detail: `deliver/${stamp}: ${manifest.files.map(f => `${f.name} ${f.bytes} B`).join(', ')}`};
}

export function formatDelivery(result) {
  const m = result.manifest;
  const lines = [result.ok ? 'DELIVERABLE' : 'DELIVERY_REJECTED', result.dir];
  for (const [k, c] of Object.entries(m.checks)) lines.push(`${c.ok ? 'ok  ' : 'FAIL'} ${k}${c.ok ? '' : `: ${c.errors?.join('; ') || c.detail}`}`);
  if (result.ok) for (const f of m.files) lines.push(`  ${f.name}  ${f.bytes} bytes  sha256 ${f.sha256}`);
  return lines.join('\n');
}
