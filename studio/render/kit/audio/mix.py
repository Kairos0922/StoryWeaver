#!/usr/bin/env python3
"""Mix one episode's audio from a plan written by build_episode.mjs.

    python3 studio/render/kit/audio/mix.py --plan plan.json --out mix_raw.wav

Everything except the voice is synthesised here from fixed seeds, so the BGM and SFX are
self-made and identical on every run. The plan carries:
  duration, lines [{start, end, file|null}], sfx [{t, sfx, dur?, gain?}],
  bgm {bpm, progression, sections [{t, style, level}], duck}
Writes 48 kHz stereo float WAV (not loudness-normalised; build_episode.mjs runs ffmpeg loudnorm)
and prints JSON stats. Requires numpy and ffmpeg on PATH.
"""
import argparse
import json
import struct
import subprocess
import sys

import numpy as np

SR = 48000
CHORDS = {
    'C': [48, 52, 55], 'Am': [45, 48, 52], 'F': [41, 45, 48], 'G': [43, 47, 50],
    'Dm': [50, 53, 57], 'Em': [52, 55, 59], 'E': [52, 56, 59],
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(sec):
    return np.arange(int(sec * SR)) / SR


class Bus:
    def __init__(self, seconds):
        self.n = int(np.ceil(seconds * SR)) + SR
        self.buf = np.zeros((self.n, 2), dtype=np.float64)

    def add(self, t0, mono, gain=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= self.n or not len(mono):
            return
        if i < 0:
            mono = mono[-i:]
            i = 0
        seg = mono[: self.n - i] * gain
        left = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        right = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        self.buf[i:i + len(seg), 0] += seg * left
        self.buf[i:i + len(seg), 1] += seg * right


def noise(rng, n):
    return rng.standard_normal(n)


def lowpass(x, k):
    if k <= 1:
        return x
    c = np.cumsum(np.concatenate([np.zeros(k), x]))
    return (c[k:] - c[:-k]) / k


# ---------- instruments ----------

def kick(rng):
    t = tvec(0.42)
    f = 46 + 80 * np.exp(-t / 0.035)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
    y[: int(0.004 * SR)] += noise(rng, int(0.004 * SR)) * 0.3
    return y


def clap(rng):
    t = tvec(0.25)
    n = np.diff(noise(rng, len(t) + 1)) * 0.5
    y = n * (np.exp(-t / 0.05) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) / 0.04) * (t > 0.012))
    return y + 0.25 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.04)


def hat(rng, open_=False):
    t = tvec(0.2 if open_ else 0.06)
    n = np.diff(np.diff(noise(rng, len(t) + 2)))
    return n * np.exp(-t / (0.06 if open_ else 0.014)) * 0.35


def bass(m, dur):
    t = tvec(dur + 0.08)
    ph = 2 * np.pi * hz(m) * t
    tri = (2 / np.pi) * np.arcsin(np.sin(ph))
    env = np.minimum(t / 0.006, 1) * np.exp(-t / 0.38) * (t < dur + 0.05)
    return (0.8 * tri + 0.5 * np.sin(ph)) * env


def mallet(m, ring=0.3):
    t = tvec(ring * 3.2)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 4.0 * f * t) * np.exp(-t / 0.035)
    y += 0.12 * np.sin(2 * np.pi * 9.8 * f * t) * np.exp(-t / 0.012)
    return y * np.minimum(t / 0.002, 1) * np.exp(-t / ring)


def pad(chord, dur):
    t = tvec(dur)
    y = np.zeros_like(t)
    for m in chord:
        for det in (-0.12, 0.12):
            f = hz(m + 12) * 2 ** (det / 12)
            y += 2 * ((f * t) % 1.0) - 1
    y = lowpass(y, 36)
    env = np.minimum(t / 0.35, 1) * np.minimum((dur - t) / 0.3, 1)
    return y * np.clip(env, 0, 1) / 6


def wood(rng, hi=True):
    t = tvec(0.08)
    f = 1650 if hi else 1150
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018) + noise(rng, len(t)) * 0.05 * np.exp(-t / 0.004)


# ---------- SFX ----------

def sfx_wave(name, rng, dur=None):
    if name == 'whoosh':
        d = dur or 0.42
        t = tvec(d)
        n = noise(rng, len(t))
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
        lo = lowpass(n, 18)
        hi = n - lowpass(n, 4)
        return (lo * 0.9 + hi * 0.25 * (t / d)) * env * 1.1
    if name == 'thump':
        t = tvec(0.5)
        f = 38 + 120 * np.exp(-t / 0.03)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
        y += lowpass(noise(rng, len(t)), 6) * np.exp(-t / 0.03) * 0.5
        return y * 1.2
    if name == 'stamp':
        t = tvec(0.45)
        y = np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.1)
        y += lowpass(noise(rng, len(t)), 3) * np.exp(-t / 0.05) * 0.9
        y += np.sign(np.sin(2 * np.pi * 820 * t)) * np.exp(-t / 0.012) * 0.25
        return y
    if name == 'pop':
        t = tvec(0.12)
        f = 520 + 900 * (t / 0.12)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) * 0.8
    if name == 'snap':
        t = tvec(0.09)
        n = np.diff(noise(rng, len(t) + 1))
        return n * np.exp(-t / 0.008) * 0.9 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.01) * 0.3
    if name == 'click':
        t = tvec(0.05)
        return np.sin(2 * np.pi * 1300 * t) * np.exp(-t / 0.006) + np.diff(noise(rng, len(t) + 1)) * np.exp(-t / 0.002) * 0.3
    if name == 'tick':
        t = tvec(0.04)
        return np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.006) * 0.7
    if name == 'ding':
        t = tvec(1.2)
        f = 1046.5
        y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / d) for a, k, d in ((1, 1, 0.6), (0.5, 2.76, 0.25), (0.25, 5.4, 0.1)))
        return y * 0.5
    if name == 'zip':
        d = dur or 0.5
        t = tvec(d)
        f = 180 + 1400 * (t / d) ** 1.6
        saw = 2 * ((np.cumsum(f) / SR) % 1.0) - 1
        return lowpass(saw, 6) * (0.6 + 0.4 * np.sin(2 * np.pi * 34 * t)) * np.sin(np.pi * t / d) * 0.45
    if name == 'count':
        d = dur or 0.8
        out = np.zeros(int((d + 0.1) * SR))
        k, tt = 0, 0.0
        while tt < d:
            w = sfx_wave('tick', rng) * (0.6 + 0.4 * k / 20)
            i = int(tt * SR)
            out[i:i + len(w)] += w[: len(out) - i]
            k += 1
            tt += max(0.035, 0.09 * (1 - tt / d) ** 1.5)
        return out
    if name == 'alarm':
        t = tvec(0.75)
        f = np.where((t * 8).astype(int) % 2 == 0, 1320, 1580)
        return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.18 * (np.sin(np.pi * t / 0.75) > 0.05)
    if name == 'buzz':
        t = tvec(0.35)
        return np.sign(np.sin(2 * np.pi * 110 * t)) * np.exp(-t / 0.2) * 0.25
    if name == 'step':
        t = tvec(0.08)
        return lowpass(noise(rng, len(t)), 10) * np.exp(-t / 0.02) * 0.5
    raise SystemExit(f'unknown sfx "{name}"')


SFX_GAIN = {'whoosh': 0.32, 'thump': 0.55, 'stamp': 0.5, 'pop': 0.28, 'snap': 0.4, 'click': 0.3, 'tick': 0.25,
            'ding': 0.3, 'zip': 0.35, 'count': 0.3, 'alarm': 0.3, 'buzz': 0.35, 'step': 0.3}


# ---------- BGM ----------

STYLES = {
    'full': dict(kick=True, clap=True, hat=1.0, bass=True, mallet=1.0, pad=1.0, wood=False),
    'light': dict(kick=False, clap=False, hat=0.6, bass=True, mallet=0.9, pad=0.6, wood=False),
    'tick': dict(kick=False, clap=False, hat=0.0, bass=True, mallet=0.6, pad=0.4, wood=True),
    'pulse': dict(kick=True, clap=False, hat=0.7, bass=True, mallet=0.5, pad=0.5, wood=True),
    'drop': None,
}

ARP = [0, 1, 2, 3, 2, 1, 2, 3]


def section_at(sections, t):
    cur = sections[0]
    for s in sections:
        if s['t'] <= t + 1e-9:
            cur = s
    return cur


def render_bgm(plan, seconds):
    cfg = plan['bgm']
    rng = np.random.default_rng(20261010)
    bpm = cfg.get('bpm', 96)
    beat = 60.0 / bpm
    step = beat / 2
    bar = beat * 4
    prog = cfg.get('progression', ['C', 'Am', 'F', 'G'])
    sections = sorted(cfg.get('sections') or [{'t': 0, 'style': 'full', 'level': 1}], key=lambda s: s['t'])
    bus = Bus(seconds)
    k_kick, k_clap = kick(rng), clap(rng)
    n_steps = int(np.ceil(seconds / step))
    for i in range(n_steps):
        t0 = i * step
        sec = section_at(sections, t0)
        st = STYLES.get(sec.get('style', 'full'))
        if st is None:
            continue
        lvl = sec.get('level', 1.0)
        b = i // 8
        pos = i % 8
        chord = CHORDS[prog[b % len(prog)]]
        swing = 0.018 if pos % 2 else 0.0
        if st['kick'] and pos in (0, 4, 5 if b % 2 else 9):
            bus.add(t0, k_kick, 0.55 * lvl)
        if st['clap'] and pos in (2, 6):
            bus.add(t0, k_clap, 0.22 * lvl, pan=0.1)
        if st['hat']:
            bus.add(t0 + swing, hat(rng, open_=(pos == 7 and b % 2 == 1)), 0.22 * st['hat'] * lvl, pan=0.35)
        if st['bass'] and pos in (0, 3, 4):
            bus.add(t0, bass(chord[0] - 12, step * (1.6 if pos != 3 else 0.9)), 0.30 * lvl)
        if st['mallet']:
            tones = chord + [chord[0] + 12]
            m = tones[ARP[pos]] + 12
            bus.add(t0 + swing, mallet(m, 0.26), 0.12 * st['mallet'] * lvl, pan=(-0.35 if pos % 2 else 0.35))
        if st['wood'] and pos % 2 == 0:
            bus.add(t0, wood(rng, hi=(pos % 4 == 0)), 0.10 * lvl, pan=-0.2)
        if st['pad'] and pos == 0:
            bus.add(t0, pad(chord, bar), 0.32 * st['pad'] * lvl)
    end = cfg.get('end_t')
    if end is not None:
        for m in CHORDS['C'] + [60]:
            bus.add(end, mallet(m + 12, 0.9), 0.12)
        bus.add(end, bass(36, 1.2), 0.3)
    return bus.buf[: int(seconds * SR)]


# ---------- voice ----------

def decode(path):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def voiced_rms(x):
    hop = SR // 100
    n = len(x) // hop
    if n == 0:
        return float(np.sqrt(np.mean(x ** 2) + 1e-12))
    fr = x[: n * hop].reshape(n, hop)
    r = np.sqrt(np.mean(fr ** 2, axis=1) + 1e-12)
    v = r[20 * np.log10(r) > -45]
    return float(np.sqrt(np.mean(v ** 2))) if len(v) else float(np.max(r))


def smooth_gate(active, rate, attack, release):
    out = np.zeros_like(active)
    a = np.exp(-1.0 / (attack * rate))
    r = np.exp(-1.0 / (release * rate))
    y = 0.0
    for i, v in enumerate(active):
        c = a if v > y else r
        y = c * y + (1 - c) * v
        out[i] = y
    return out


def write_wav_f32(path, data):
    data = np.asarray(data, dtype=np.float32)
    ch = data.shape[1]
    payload = data.tobytes()
    header = b'RIFF' + struct.pack('<I', 36 + len(payload)) + b'WAVE'
    header += b'fmt ' + struct.pack('<IHHIIHH', 16, 3, ch, SR, SR * ch * 4, ch * 4, 32)
    header += b'data' + struct.pack('<I', len(payload))
    with open(path, 'wb') as f:
        f.write(header + payload)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    plan = json.load(open(args.plan, encoding='utf8'))
    seconds = float(plan['duration'])
    n = int(seconds * SR)
    rng = np.random.default_rng(7)

    voice = np.zeros(n)
    target = 10 ** (-19 / 20)
    placed = []
    for line in plan['lines']:
        if not line.get('file'):
            continue
        x = decode(line['file'])
        g = target / max(voiced_rms(x), 1e-6)
        g = min(g, 0.95 / max(np.max(np.abs(x)), 1e-6))
        i = int(round(line['start'] * SR))
        seg = x[: max(0, n - i)] * g
        voice[i:i + len(seg)] += seg
        placed.append({'id': line['id'], 'gain_db': round(20 * np.log10(g), 2)})

    rate = 100
    ctl_t = np.arange(int(seconds * rate) + 1) / rate
    active = np.zeros_like(ctl_t)
    if placed:
        hop = SR // rate
        m = len(voice) // hop
        r = np.sqrt(np.mean(voice[: m * hop].reshape(m, hop) ** 2, axis=1) + 1e-12)
        active[:m] = (20 * np.log10(r) > -40).astype(float)
    else:
        for line in plan['lines']:
            active[(ctl_t >= line['start']) & (ctl_t < line['end'])] = 1.0
    duck = float(plan['bgm'].get('duck', 0.17))
    gate = smooth_gate(active, rate, 0.06, 0.35)
    gain = 1 - (1 - duck) * gate
    bgm_gain = np.interp(np.arange(n) / SR, ctl_t, gain)

    bgm = render_bgm(plan, seconds)
    fade_in = np.minimum(np.arange(n) / (0.3 * SR), 1)
    fade_out = np.clip((seconds - np.arange(n) / SR) / 1.2, 0, 1)
    bgm *= (bgm_gain * fade_in * fade_out * float(plan['bgm'].get('level', 0.5)))[:, None]

    fx = Bus(seconds)
    for e in plan.get('sfx', []):
        w = sfx_wave(e['sfx'], rng, e.get('dur'))
        fx.add(e['t'], w, SFX_GAIN[e['sfx']] * float(e.get('gain', 1.0)) * float(plan.get('sfx_level', 1.0)), pan=float(e.get('pan', 0)))
    sfx = fx.buf[:n]

    mix = bgm + sfx + voice[:, None]
    peak = float(np.max(np.abs(mix)))
    if peak > 0.98:
        mix *= 0.98 / peak
    write_wav_f32(args.out, mix)
    stats = {
        'out': args.out, 'seconds': seconds, 'sample_rate': SR, 'voice_lines': len(placed), 'voice_gain': placed,
        'duck': duck, 'sfx_events': len(plan.get('sfx', [])), 'peak_dbfs_before_norm': round(20 * np.log10(max(peak, 1e-9)), 2),
        'bgm': {'bpm': plan['bgm'].get('bpm', 96), 'progression': plan['bgm'].get('progression'), 'sections': plan['bgm'].get('sections')},
    }
    json.dump(stats, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
