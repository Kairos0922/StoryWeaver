# Browser pipeline

StoryWeaver has one renderer. Playwright seeks to time `t`, captures the frame, and ffmpeg encodes the sequence. A shot may stack layers. Every frame then runs the same WebGL post pass.

| Layer | What it draws |
|---|---|
| `canvas2d` | The shared kit in `studio/render/kit/canvas/kit.js` |
| `svg` | Static SVG. `{{t}}` is replaced with the frame time |
| `dom` | HTML inside an SVG `foreignObject` |
| `three` | A Three.js object list. Rotation is `spin * t` |

If a shot has no `stack`, it is one `canvas2d` layer. That is how the Invisible Rules episodes are written.

## Post presets

`studio/render/browser/presets.json` holds `neutral`, `explainer`, and `night`. A scene sets `post_preset`. The default is `explainer` (a light grade, a little bloom, fine grain, a soft vignette).

## Rules

- `seek(t)` is the only clock. The same `t` draws the same pixels.
- Grain is a hash of the preset seed, the pixel, and the frame index.
- No `requestAnimationFrame`, no `Date.now`, no `Math.random`, no CSS animation, no timer.
- Fonts are files. A missing glyph fails the job.
- Draft frames carry the corner label `Not human-reviewed`. Release frames do not.
- Shot thumbnails and a contact sheet are written before the full encode.

```bash
node studio/cli.mjs doctor --episode <episode-dir> --require-render
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs render <episode-dir> --mode release --cut full
```

`--cut` is `preview` (no voice), `hook` (first lines), or `full`. A release is always a full cut, and it needs `qc/release.json` signed by a person after the draft has been seen.

There is no second renderer in this tree.
