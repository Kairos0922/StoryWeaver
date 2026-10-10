#!/usr/bin/env python3
"""Measure per-line voice WAVs for the audio-driven timeline.

    python3 studio/render/kit/audio/audio_probe.py --fps 30 line_01.wav line_02.wav ...

Prints JSON: for each file its decoded duration, sample rate, peak / RMS level, leading and
trailing silence, and a 0..1 loudness envelope at `fps` that drives lip flap. Files are decoded
with ffmpeg, so any format ffmpeg reads is accepted. Requires numpy and ffmpeg on PATH.
"""
import argparse
import json
import subprocess
import sys

import numpy as np

SR = 48000


def decode(path):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def source_info(path):
    cmd = ['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
           'stream=sample_rate,channels,codec_name:format=duration', '-of', 'json', path]
    info = json.loads(subprocess.run(cmd, capture_output=True, check=True, text=True).stdout)
    st = (info.get('streams') or [{}])[0]
    return {'codec': st.get('codec_name'), 'sample_rate': int(st.get('sample_rate', 0)),
            'channels': int(st.get('channels', 0)), 'container_duration': float(info['format']['duration'])}


def db(x):
    return float(20 * np.log10(max(x, 1e-9)))


def probe(path, fps):
    x = decode(path)
    if not len(x):
        raise SystemExit(f'{path}: no audio samples')
    hop = SR // fps
    n = int(np.ceil(len(x) / hop))
    pad = np.zeros(n * hop, dtype=np.float32)
    pad[:len(x)] = x
    frames = pad.reshape(n, hop)
    rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    rms_db = 20 * np.log10(rms)
    gate = -45.0
    voiced = np.where(rms_db > gate)[0]
    lead = float(voiced[0] / fps) if len(voiced) else 0.0
    trail = float((n - 1 - voiced[-1]) / fps) if len(voiced) else 0.0
    ref = np.percentile(rms[voiced], 95) if len(voiced) else 1.0
    env = np.clip(rms / max(ref, 1e-6), 0, 1.2)
    env = np.where(rms_db > gate, env, 0)
    env = np.convolve(env, np.array([0.25, 0.5, 0.25]), mode='same')
    env = np.clip(env, 0, 1) ** 0.8
    return dict(source_info(path), file=path, duration=len(x) / SR, peak_dbfs=round(db(np.max(np.abs(x))), 2),
                rms_dbfs=round(db(float(np.sqrt(np.mean(x ** 2)))), 2), lead_silence_s=round(lead, 3),
                trail_silence_s=round(trail, 3), env=[round(float(v), 3) for v in env])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('files', nargs='+')
    args = ap.parse_args()
    out = [probe(f, args.fps) for f in args.files]
    json.dump({'fps': args.fps, 'files': out}, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
