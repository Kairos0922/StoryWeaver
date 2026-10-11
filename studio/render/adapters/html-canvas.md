# Browser pipeline

StoryWeaver has one renderer. Playwright seeks to time `t`, captures the frame, and ffmpeg encodes the sequence. A shot may stack layers. Every frame then runs the same WebGL post pass.

| Layer | What it draws |
|---|---|
| `canvas2d` | The shared kit in `studio/render/kit/canvas/kit.js` |
| `svg` | Static SVG. `{{t}}` is replaced with the frame time |
| `dom` | HTML inside an SVG `foreignObject`. Markup is a function of `t` |
| `kinetic` | React/DOM stage. GSAP `seek(t)`, Lucide, optional Lottie `goToAndStop`. Snapshotted, then the post pass |
| `three` | A Three.js object list, only when the shot asks. Rotation is `spin * t` |

If a shot has no `stack`, it is one `canvas2d` layer.

## Post presets

`studio/render/browser/presets.json` holds `neutral`, `explainer`, and `night`. A scene sets `post_preset`. The default is `explainer` (a light grade, a little bloom, fine grain, a soft vignette).

## Rules

- `seek(t)` is the only clock. The same `t` draws the same pixels.
- GSAP timelines are created with `paused: true`. The frame calls `timeline.seek(t)` or `totalProgress`. The GSAP ticker is removed and slept. See `studio/render/browser/dom/README.md`.
- Grain is a hash of the preset seed, the pixel, and the frame index.
- No `requestAnimationFrame`, no `Date.now`, no `Math.random`, no CSS animation, no timer.
- Remotion, Motion, and Rive are inspirations, not dependencies.
- Fonts are files. A missing glyph fails the job.
- Draft and release frames are identical. The mode is in `render_report.json` and draft files end in `_draft`. There is no in-frame AI label; the platform AI-generated-content declaration is ticked at upload.
- Shot thumbnails and a contact sheet are written before the full encode.

```bash
node studio/cli.mjs doctor --episode <episode-dir> --require-render
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs render <episode-dir> --mode release --cut full
```

`--cut` is `preview` (no voice), `hook` (first lines), or `full`. A release is always a full cut, and it needs `qc/release.json` signed by a person after the draft has been seen.

There is no second renderer in this tree.
