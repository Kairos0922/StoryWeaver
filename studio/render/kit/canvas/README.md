# Canvas kit

One frame function produces stills, contact sheets, and the cut. Scenes write parameters; drawing lives in `kit.js`. Kinetic type on the DOM stage uses `studio/render/browser/dom/` (GSAP seek, not a second renderer).

| File | Role |
|---|---|
| `kit.js` | Components: rooms, queues, silhouettes, characters (from the series rig), kinetic numbers, stamps, cards, bars, HUD, transitions |
| `timeline.js` | Line cues → seconds; keyframes; camera; beat-clock check; which shot at time `t` |
| `runtime.mjs` | Playwright Chromium, subset fonts, temporary page, WebGL-capable launch |
| `render_stills.mjs` | `<ep>/render/stills.json` → `<ep>/stills/*.png`, through the same post pass |
| `build_episode.mjs` | Called by `studio/render/browser/pipeline.mjs` |
| `../audio/audio_probe.py` | Decode WAV; duration, level, mouth envelope |
| `../audio/mix.py` | Level voices, synthesize BGM/SFX, duck |
| `../fonts/subset_fonts.py` | Subset fonts to the episode’s characters as WOFF2 (pyftsubset); missing glyphs fail |
| `../fonts/glyphs.py` | Missing-glyph check for any face, no subsetting (doctor + quality) |
| `../fonts/library.mjs` | Optional external font library picked per episode in the brief (see `../fonts/README.md`) |

```bash
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs render <episode-dir> --mode draft --cut hook
node studio/cli.mjs render <episode-dir> --mode release --cut full
```

The lower-level entry is `studio/render/kit/canvas/build_episode.mjs`. Prefer the `render` command so doctor, review mode, and the done marker run.

Needs Node 24, Playwright Chromium (or `CHROME`), Python 3 + numpy + fontTools + brotli, ffmpeg, and the fonts the episode uses. No network. No model. No TTS.

## Where time comes from

- `preview`: estimate from the language rate. Draft only (`_draft` file). Not a deliverable.
- `hook`: first `hook_lines` WAVs (default 3). Needs the hook-sample checkpoint open.
- `full`: every WAV, and a duration prediction that fits the brief. Draft does not need the release sign-off. Release does.

Line start = previous end + `pause_after_s` + `holds[previous]`. Scenes, keys, SFX, and BGM are line cues. Change a WAV and the picture moves with it. Output is `out/<draft|release>/<cut>/`, including `thumbs/` and `contact_sheet.png` before the mp4.

## Characters

Draw only from the series rig (`<series>/ip/sprites/rig.json`). Expression ids are frozen in that rig. `gesture` is a kit arm pose. Do not draw a second cast inside one episode.

## Do not

- Check a full HTML page into an episode folder. The page is generated in a temp directory.
- Treat a contact sheet as a signed human check.
- Download music or SFX.
