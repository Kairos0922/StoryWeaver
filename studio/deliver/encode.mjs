// Publish encode: one compatibility profile for phones, desktop players and browsers, sized so a
// chat or cloud download finishes (EP03: a 62 MB file arrived half-downloaded and "froze").
//   H.264 High@4.1, yuv420p, closed 2 s GOP, VBV ceiling 5.5 Mbps (commit c2a68ae profile),
//   two-pass average bitrate chosen so the file lands under MAX_BYTES; AAC-LC 48 kHz stereo;
//   video + audio only (no soft subtitle / data tracks; captions are burned in + sidecar .srt);
//   moov atom first (+faststart) so playback starts before the download ends.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MAX_BYTES = 30_000_000;
export const VIDEO_CEILING_KBPS = 5500;
export const AUDIO_KBPS = 128;
const HEADROOM = 0.95; // container overhead + rate-control slack

export function probe(file) {
  return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]).toString());
}

export function videoKbpsFor(durationS, maxBytes = MAX_BYTES) {
  const total = (maxBytes * 8 * HEADROOM) / durationS / 1000;
  return Math.max(300, Math.min(VIDEO_CEILING_KBPS, Math.floor(total - AUDIO_KBPS)));
}

export async function encodePublish(src, out, {maxBytes = MAX_BYTES} = {}) {
  const info = probe(src);
  const duration = Number(info.format.duration);
  const v = info.streams.find(s => s.codec_type === 'video');
  const [num, den] = String(v.avg_frame_rate || '30/1').split('/').map(Number);
  const fps = Math.round(num / (den || 1)) || 30;
  const kbps = videoKbpsFor(duration, maxBytes);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-publish-'));
  const passlog = path.join(tmp, 'x264');
  const video = ['-map', '0:v:0', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p',
    '-b:v', `${kbps}k`, '-maxrate', `${VIDEO_CEILING_KBPS}k`, '-bufsize', `${VIDEO_CEILING_KBPS * 2}k`,
    '-g', String(fps * 2), '-keyint_min', String(fps), '-sc_threshold', '0', '-passlogfile', passlog];
  try {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, ...video, '-pass', '1', '-an', '-sn', '-dn', '-f', 'mp4', '/dev/null']);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, ...video, '-pass', '2',
      '-map', '0:a:0', '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ar', '48000', '-ac', '2',
      '-sn', '-dn', '-map_metadata', '-1', '-movflags', '+faststart', out]);
  } finally {
    await fs.rm(tmp, {recursive: true, force: true});
  }
  return {file: out, video_kbps: kbps, duration_s: duration};
}

// Top-level MP4 boxes in order; faststart means moov comes before mdat.
export async function topBoxes(file) {
  const fh = await fs.open(file, 'r');
  const boxes = [];
  try {
    const size = (await fh.stat()).size;
    let pos = 0;
    const head = Buffer.alloc(16);
    while (pos + 8 <= size && boxes.length < 64) {
      await fh.read(head, 0, 16, pos);
      let len = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) len = size - pos;
      if (len < 8) break;
      boxes.push(type);
      pos += len;
    }
  } finally {
    await fh.close();
  }
  return boxes;
}

// Every property the profile promises, checked on the produced file.
export async function verifyPublish(file, {sourceDuration, maxBytes = MAX_BYTES} = {}) {
  const errors = [];
  const {size} = await fs.stat(file);
  const info = probe(file);
  const v = info.streams.filter(s => s.codec_type === 'video');
  const a = info.streams.filter(s => s.codec_type === 'audio');
  const other = info.streams.filter(s => !['video', 'audio'].includes(s.codec_type));
  if (size > maxBytes) errors.push(`file is ${size} bytes > ${maxBytes}`);
  if (v.length !== 1 || v[0].codec_name !== 'h264' || v[0].profile !== 'High' || Number(v[0].level) > 41 || v[0].pix_fmt !== 'yuv420p') {
    errors.push(`video must be one H.264 High ≤4.1 yuv420p stream (got ${v.map(s => `${s.codec_name} ${s.profile} L${s.level} ${s.pix_fmt}`).join(', ') || 'none'})`);
  }
  if (a.length !== 1 || a[0].codec_name !== 'aac' || Number(a[0].sample_rate) !== 48000) errors.push(`audio must be one AAC 48 kHz stream (got ${a.map(s => `${s.codec_name} ${s.sample_rate}`).join(', ') || 'none'})`);
  if (other.length) errors.push(`extra tracks: ${other.map(s => s.codec_type + ':' + s.codec_name).join(', ')} (no soft subtitles or data tracks)`);
  const boxes = await topBoxes(file);
  if (!(boxes.indexOf('moov') !== -1 && boxes.indexOf('moov') < boxes.indexOf('mdat'))) errors.push(`moov is not before mdat (${boxes.join(',')}); not faststart`);
  const duration = Number(info.format.duration);
  if (sourceDuration && Math.abs(duration - sourceDuration) > 0.15) errors.push(`duration ${duration}s differs from source ${sourceDuration}s`);
  let decode = '';
  try {
    decode = execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  } catch (e) {
    decode = String(e.stderr || e.message);
  }
  if (decode.trim()) errors.push(`full decode reported errors: ${decode.trim().split('\n').slice(0, 3).join(' | ')}`);
  return {
    ok: errors.length === 0, errors, bytes: size, duration_s: duration, boxes: boxes.slice(0, 4),
    video: v[0] && {codec: v[0].codec_name, profile: v[0].profile, level: v[0].level, pix_fmt: v[0].pix_fmt, size: `${v[0].width}x${v[0].height}`, bit_rate: Number(v[0].bit_rate)},
    audio: a[0] && {codec: a[0].codec_name, sample_rate: Number(a[0].sample_rate), channels: a[0].channels},
  };
}
