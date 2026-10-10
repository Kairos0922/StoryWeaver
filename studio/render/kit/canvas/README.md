# Canvas kit

One frame function produces stills, contact sheets, and the cut. Scenes write parameters; drawing lives in `kit.js`.

| File | Role |
|---|---|
| `kit.js` | Components: rooms, queues, silhouettes, characters (from the series rig), kinetic numbers, stamps, cards, bars, HUD, transitions |
| `timeline.js` | Line cues → seconds; keyframes; camera; beat-clock check; which shot at time `t` |
| `runtime.mjs` | Playwright Chromium, subset fonts, temporary page |
| `render_stills.mjs` | `<ep>/render/stills.json` → `<ep>/stills/*.png` |
| `build_episode.mjs` | `<ep>/render/scenes.json` + `lines.json` + WAV → timeline, cover, sheet, mix, mp4 |
| `../audio/audio_probe.py` | Decode WAV; duration, level, mouth envelope |
| `../audio/mix.py` | Level voices, synthesize BGM/SFX, duck |
| `../fonts/subset_fonts.py` | Subset fonts to the episode’s characters; missing glyphs fail |

```bash
node studio/render/kit/canvas/render_stills.mjs <episode-dir> [shot-id]
node studio/render/kit/canvas/build_episode.mjs <episode-dir> --mode preview|hook|full \
  [--rate 4.0] [--workers N] [--audio-dir DIR] [--out DIR] [--no-video] [--frames t1,t2] [--crf 18]
```

Needs Node 24, Playwright Chromium (or `CHROME`), Python 3 + numpy + fontTools, ffmpeg, and the fonts the episode uses. No network. No model. No TTS.

## Where time comes from

- `preview`: estimate from the language rate (default 4.0 Chinese characters/s or the `--rate` you pass). Watermarked. Not a deliverable.
- `hook`: first `hook_lines` WAVs (default 3). Needs the hook-sample checkpoint open.
- `full`: every WAV. Needs the render checkpoint open, which means human names on the checklist.

Line start = previous end + `pause_after_s` + `holds[previous]`. Scenes, keys, SFX, and BGM are line cues. Change a WAV and the picture moves with it.

## Characters

Draw only from the series rig (`<series>/ip/sprites/rig.json`). Expression ids are frozen in that rig. `gesture` is a kit arm pose. Do not draw a second cast inside one episode.

## Do not

- Check a full HTML page into an episode folder. The page is generated in a temp directory.
- Treat a contact sheet as a signed human check.
- Download music or SFX.
