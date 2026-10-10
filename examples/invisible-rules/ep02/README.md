# invisible-rules / ep02 · One long line, or three short ones?

Worked example. Kairos approved the original Chinese creative brief on 2026-10-10 (hook H1, landscape only). `brief.md` is an English translation of that plan, plus a viewer-intuition table filled from the later retrospective. Spoken lines stay in Chinese.

| File | What it is |
|---|---|
| `fact_card.md` | A sources, B sim numbers with quantity types, C do-not-say |
| `brief.md` | Approved creative brief. Editing the body expires the hash |
| `script.md` / `lines.json` | Voice-over / per-line sheet: speaker, voice, emotion, pause, WAV name |
| `sim/queue_sim.py` → `sim/results.json` | 3 cashiers, one line vs pick-shortest, 20 seeds |
| `render/stills.json` → `stills/*.png` | Four review stills from the series rig |
| `render/scenes.json` | Full timeline: 10 scenes on line cues |
| `preview/` | Silent-preview cover and contact sheet (estimated timing) |
| `audio/line_XX.wav` | Voice, synthesized outside git |
| `out/<mode>/` | Render output, not in git |
| `qc/checklist.json` | Human items. Render needs signed `ear_hook`, `first_watch`, `stills_four`, `beat_clock`, `no_idle` |

## One-time setup (ordinary Linux)

```bash
npm install
npx playwright install chromium        # or CHROME=/path/to/chrome
pip install numpy fonttools
sudo apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
```

Fonts come from `fc-match "Noto Sans CJK SC"`. Missing fonts fail; there is no silent fallback. Override with `SW_FONT_400` … `SW_FONT_900`.

## 1. Preview (no voice)

```bash
node studio/render/kit/canvas/build_episode.mjs examples/invisible-rules/ep02 --mode preview
```

Estimates duration from character rate (`--rate`, default 4.2 in older runs; prefer 4.0). Watermarked. Not a deliverable. `--no-video` writes cover, contact sheet, and timeline only.

## 2. Voice

Synthesize 22 WAVs from `lines.json` into `examples/invisible-rules/ep02/audio/line_01.wav` … `line_22.wav`. Any sample rate. Pauses come from `pause_after_s`; do not leave long silence in the WAV.

Use a machine that holds keys. See `.env.example`. Cloud agents without keys stop here.

## 3. Hook sample (first 3 lines)

```bash
node studio/render/kit/canvas/build_episode.mjs examples/invisible-rules/ep02 --mode hook
```

Writes `out/hook/…mp4`. A person listens, then signs `ear_hook` and `first_watch`.

## 4. Human checks before the full cut

Look at `stills/*.png`, `out/hook/`, and the preview contact sheet. Sign `stills_four`, `beat_clock`, `no_idle`. Then:

```bash
node studio/cli.mjs checkpoint examples/invisible-rules/ep02 render
```

## 5. Full cut

```bash
node studio/render/kit/canvas/build_episode.mjs examples/invisible-rules/ep02 --mode full
```

Exit 3 = missing human items. Exit 4 = missing WAV. Exit 5 = beat-clock fail (>5s with no new picture).

BGM and SFX are synthesized by `studio/render/kit/audio/mix.py` (96 BPM, C–Am–F–G). No external audio assets.

## Editing the picture

Edit `render/scenes.json` only. Times are line cues: `L05`, `L05.end`, `L05@0.5`, `L05.end+0.3`, or seconds from the scene start. Rehearse with `--mode preview --no-video`.
