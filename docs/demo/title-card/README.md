# Title card

A 10 second kinetic-type shot on the shared browser pipeline. It is a tool fixture. It is not a series, it has no brief, and it has no voice.

The picture is DOM and SVG: GSAP timelines stay paused and take `seek(t)` / `totalProgress` from the pipeline, Lucide draws four icons, one Lottie stroke seeks with `goToAndStop`, and the existing WebGL post pass grades the snapshot. Three.js is not loaded.

```bash
node studio/cli.mjs doctor --episode docs/demo/title-card --require-render
node studio/cli.mjs render docs/demo/title-card --mode draft --cut preview --review-only
```

Sheets land in `docs/demo/title-card/out/draft/preview/` (`thumbs/`, `contact_sheet.png`, `cover.png`, `render_report.json`). Drop `--review-only` for a silent draft mp4. Draft frames are labeled `Not human-reviewed`.

A release render is refused. This directory must not grow a `brief.md`, `lines.json`, or `script.md`.
